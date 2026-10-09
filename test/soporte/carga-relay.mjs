import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { setTimeout as esperar } from 'node:timers/promises';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import WebSocket from 'ws';
import { crearServidorLocal } from '../../dist/src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../../dist/src/infrastructure/config/servidor.config.js';
import { CodecProtocolo } from '../../dist/src/infrastructure/adapter/protocol/codec-protocolo.js';
import { bytesFirma } from '../../dist/src/infrastructure/adapter/protocol/crypto-protocol.js';

assert.equal(typeof global.gc, 'function', 'Ejecutar con node --expose-gc tras pnpm run build');
assert.ok(process.argv.slice(2).every((argumento) => argumento === '--prolongada'), 'Solo se admite --prolongada');
const lotes = process.argv.includes('--prolongada') ? 60 : 6;
const inicio = performance.now();
const latencias = [];
const retraso = monitorEventLoopDelay({ resolution: 20 });
retraso.enable();
const codec = new CodecProtocolo(readFileSync(new URL('../../compartido/protocolo.schema.json', import.meta.url)));
const padre = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const hijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pareja = randomUUID();
const servidor = crearServidorLocal({ NODE_ENV: 'test', PUBLIC_ORIGIN: 'https://relay.example.com', ACTIVE_PAIR_ID: pareja,
  PARENT_PUBLIC_KEY_B64: padre.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
  CHILD_PUBLIC_KEY_B64: hijo.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url') });
servidor.listen(0, '127.0.0.1');
await once(servidor, 'listening');
const url = `ws://127.0.0.1:${servidor.address().port}/ws`;
async function ciclo(indice) {
  const socket = new WebSocket(url, 'cp.v1');
  const limite = setTimeout(() => socket.terminate(), 3000);
  socket.on('error', () => {});
  try {
    const [bytes] = await once(socket, 'message', { signal: AbortSignal.timeout(3000) });
    const reto = codec.leerFrame(bytes);
    assert.equal(reto.kind, 'CHALLENGE');
    const rol = indice % 2 === 0 ? 'PARENT' : 'CHILD';
    const payload = codec.codificarPayload({ v: 1, kind: 'AUTH_PROOF', pairId: pareja, role: rol, connectionId: reto.connectionId, nonce: reto.nonce });
    const firma = sign('sha256', bytesFirma('AUTH', payload), { key: (rol === 'PARENT' ? padre : hijo).privateKey, dsaEncoding: 'der' });
    const frames = [];
    const pendientes = [];
    const cerradoError = new Error('Socket de carga cerrado antes de la respuesta');
    socket.on('message', (datos) => {
      const frame = codec.leerFrame(datos);
      if (frame.kind === 'PEER_STATUS') return;
      const pendiente = pendientes.shift();
      if (pendiente) pendiente.resolver(frame); else frames.push(frame);
    });
    socket.on('close', () => { for (const pendiente of pendientes.splice(0)) pendiente.rechazar(cerradoError); });
    const recibir = () => frames.length ? Promise.resolve(frames.shift()) : new Promise((resolver, rechazar) => pendientes.push({ resolver, rechazar }));
    socket.send(codec.codificarFrame({ v: 1, kind: 'SIGNED', purpose: 'AUTH', payloadB64: payload.toString('base64url'), sigB64: firma.toString('base64url') }), { binary: false });
    assert.equal((await recibir()).kind, 'AUTH_OK');
    const nonce = reto.nonce;
    const enviadoEn = performance.now();
    socket.send(codec.codificarFrame({ v: 1, kind: 'PING', nonce }), { binary: false });
    const pong = await recibir();
    assert.equal(pong.kind, 'PONG');
    assert.equal(pong.nonce, nonce);
    latencias.push(performance.now() - enviadoEn);
    if (rol === 'PARENT') {
      const mensaje = codec.codificarPayload({ v: 1, kind: 'SYNC_REQUEST', pairId: pareja, sender: 'PARENT', syncNonce: nonce });
      const sigB64 = sign('sha256', bytesFirma('MESSAGE', mensaje), { key: padre.privateKey, dsaEncoding: 'der' }).toString('base64url');
      socket.send(codec.codificarFrame({ v: 1, kind: 'SIGNED', purpose: 'MESSAGE', payloadB64: mensaje.toString('base64url'), sigB64 }), { binary: false });
      assert.equal((await recibir()).kind, 'PEER_UNAVAILABLE');
    }
    const cerrado = once(socket, 'close');
    socket.close();
    await cerrado;
  } finally { clearTimeout(limite); if (socket.readyState !== WebSocket.CLOSED) socket.terminate(); }
}
async function muestra() {
  await esperar(50);
  const conexiones = await new Promise((resolver, rechazar) => servidor.getConnections((error, cantidad) => error ? rechazar(error) : resolver(cantidad)));
  assert.equal(conexiones, 0, 'No deben quedar conexiones entre lotes');
  global.gc();
  return process.memoryUsage();
}
try {
  for (let i = 0; i < 10; i++) await ciclo(i);
  const base = await muestra();
  const muestras = [];
  for (let lote = 0; lote < lotes; lote++) {
    await esperar(5100);
    for (let i = 0; i < 10; i++) await ciclo(i);
    const memoria = await muestra();
    muestras.push({ heapUsed: memoria.heapUsed, external: memoria.external, rss: memoria.rss });
  }
  const final = muestras.at(-1);
  const crecimiento = final.heapUsed - base.heapUsed;
  assert.ok(crecimiento < 8 * 1024 * 1024, 'Crecimiento de heap superior al margen local de 8 MiB');
  assert.ok(final.external - base.external < 4 * 1024 * 1024, 'Crecimiento externo superior a 4 MiB');
  latencias.sort((a, b) => a - b);
  console.log(JSON.stringify({ perfil: lotes === 60 ? 'prolongada' : 'corta', duracionMs: Math.round(performance.now() - inicio), ciclos: (lotes + 1) * 10, lotesMedidos: lotes, conexionesAlFinalDeCadaLote: 0, base: { heapUsed: base.heapUsed, external: base.external, rss: base.rss }, muestras, crecimientoHeapBytes: crecimiento, pongLocalP95Ms: latencias[Math.ceil(latencias.length * 0.95) - 1], retrasoBucleP99Ms: retraso.percentile(99) / 1e6 }));
  console.log('Prueba local acotada; no demuestra ausencia de fugas a largo plazo ni capacidad pública.');
} finally {
  retraso.disable();
  const cerrado = once(servidor, 'close');
  cerrarServidorHttp(servidor);
  await cerrado;
}
