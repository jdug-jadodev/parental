import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { setTimeout as esperar } from 'node:timers/promises';
import WebSocket from 'ws';
import { crearServidorLocal } from '../../dist/src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../../dist/src/infrastructure/config/servidor.config.js';
import { CodecProtocolo } from '../../dist/src/infrastructure/adapter/protocol/codec-protocolo.js';
import { bytesFirma } from '../../dist/src/infrastructure/adapter/protocol/crypto-protocol.js';

assert.equal(typeof global.gc, 'function', 'Ejecutar con node --expose-gc tras pnpm run build');
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
    const [bytes] = await once(socket, 'message');
    const reto = codec.leerFrame(bytes);
    assert.equal(reto.kind, 'CHALLENGE');
    const rol = indice % 2 === 0 ? 'PARENT' : 'CHILD';
    const payload = codec.codificarPayload({ v: 1, kind: 'AUTH_PROOF', pairId: pareja, role: rol, connectionId: reto.connectionId, nonce: reto.nonce });
    const firma = sign('sha256', bytesFirma('AUTH', payload), { key: (rol === 'PARENT' ? padre : hijo).privateKey, dsaEncoding: 'der' });
    const recibido = once(socket, 'message');
    socket.send(codec.codificarFrame({ v: 1, kind: 'SIGNED', purpose: 'AUTH', payloadB64: payload.toString('base64url'), sigB64: firma.toString('base64url') }), { binary: false });
    assert.equal(codec.leerFrame((await recibido)[0]).kind, 'AUTH_OK');
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
  for (let lote = 0; lote < 6; lote++) {
    await esperar(5100);
    for (let i = 0; i < 10; i++) await ciclo(i);
    const memoria = await muestra();
    muestras.push({ heapUsed: memoria.heapUsed, external: memoria.external, rss: memoria.rss });
  }
  const final = muestras.at(-1);
  const crecimiento = final.heapUsed - base.heapUsed;
  assert.ok(crecimiento < 8 * 1024 * 1024, 'Crecimiento de heap superior al margen local de 8 MiB');
  assert.ok(final.external - base.external < 4 * 1024 * 1024, 'Crecimiento externo superior a 4 MiB');
  console.log(JSON.stringify({ ciclos: 70, lotesMedidos: 6, conexionesAlFinalDeCadaLote: 0, base: { heapUsed: base.heapUsed, external: base.external, rss: base.rss }, muestras, crecimientoHeapBytes: crecimiento }));
  console.log('Prueba local acotada; no demuestra ausencia de fugas a largo plazo ni capacidad pública.');
} finally {
  const cerrado = once(servidor, 'close');
  cerrarServidorHttp(servidor);
  await cerrado;
}
