import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { generateKeyPairSync, sign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import WebSocket, { WebSocketServer } from 'ws';
import { WebSocketEncuentroC8Adapter } from '../src/infrastructure/adapter/websocket-encuentro-c8.adapter.js';
import { CoordinarEncuentroC8 } from '../src/application/usecase/coordinar-encuentro-c8.usecase.js';
import { EntropiaEncuentroAdapter } from '../src/infrastructure/adapter/entropia-encuentro.adapter.js';
import { CodecEncuentroC8 } from '../src/infrastructure/adapter/protocol/c8/codec-encuentro.js';
import { LimiteUpgradesAdapter } from '../src/infrastructure/adapter/limite-upgrades.js';
import { crearServidorEncuentroC8Render, crearServidorEncuentroC8Local } from '../src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../src/infrastructure/config/servidor.config.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';

const env = { RELAY_MODE: 'c8', NODE_ENV: 'production', RENDER: 'true', LOG_LEVEL: 'error',
  PUBLIC_ORIGIN: 'https://relay.example', RENDER_EXTERNAL_URL: 'https://relay.example/',
  C8_ENROLLMENT_ENABLED: 'true', C8_ENROLLMENT_WINDOW_MS: '600000' };

async function iniciar(host = '127.0.0.1') {
  const servidor = crearServidorEncuentroC8Render(env);
  servidor.listen(0, host); await once(servidor, 'listening');
  return { servidor, url: `ws://${host.includes(':') ? `[${host}]` : host}:${(servidor.address() as AddressInfo).port}/pair`,
    detener: async () => { const cerrado = once(servidor, 'close'); cerrarServidorHttp(servidor); await cerrado; } };
}
function rechazo(url: string, protocolo = 'c8.v1', origin?: string): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const socket = new WebSocket(url, protocolo, origin === undefined ? {} : { origin });
    const limite = setTimeout(() => { socket.terminate(); rechazar(new Error('Timeout upgrade C8')); }, 3000);
    socket.on('error', () => {});
    socket.once('unexpected-response', (_req, respuesta) => {
      clearTimeout(limite); respuesta.resume(); socket.terminate(); resolver(respuesta.statusCode ?? 0);
    });
    socket.once('open', () => { clearTimeout(limite); socket.terminate(); rechazar(new Error('Upgrade inesperado')); });
  });
}

test('C8 público: requiere modo, opt-in, ventana, entorno y origen coincidente sin configuración familiar', () => {
  for (const cambio of [{ RELAY_MODE: undefined }, { RELAY_MODE: 'cp2' }, { C8_ENROLLMENT_ENABLED: undefined },
    { C8_ENROLLMENT_ENABLED: 'false' }, { C8_ENROLLMENT_WINDOW_MS: undefined }, { C8_ENROLLMENT_WINDOW_MS: '060000' },
    { C8_ENROLLMENT_WINDOW_MS: '59999' }, { C8_ENROLLMENT_WINDOW_MS: '600001' }, { NODE_ENV: 'test' },
    { RENDER: undefined }, { PUBLIC_ORIGIN: undefined }, { PUBLIC_ORIGIN: 'https://otro.example' },
    { RENDER_EXTERNAL_URL: 'https://relay.example/path' }, { ACTIVE_PAIR_ID: '' }, { PARENT_PUBLIC_KEY_B64: '' },
    { CHILD_PUBLIC_KEY_B64: '' }, { LOG_LEVEL: 'info' }, { SELF_URL: 'https://otro.example' }]) {
    assert.throws(() => crearServidorEncuentroC8Render({ ...env, ...cambio }));
  }
  assert.throws(() => crearServidorEncuentroC8Local({ ...env, RELAY_MODE: 'c8-local' }));
});

test('C8 público simulado: IPv6 permite sólo prueba provisional, no órdenes ni AUTH familiar', async (t) => {
  const s = await iniciar('::1'); t.after(s.detener);
  const socket = new WebSocket(s.url, 'c8.v1', { perMessageDeflate: true });
  t.after(() => socket.terminate());
  const frames: Record<string, unknown>[] = [];
  let resolver: ((m: Record<string, unknown>) => void) | undefined;
  socket.on('error', () => {});
  socket.on('message', (data) => {
    const m = JSON.parse(data.toString()) as Record<string, unknown>;
    if (resolver) { const actual = resolver; resolver = undefined; actual(m); } else frames.push(m);
  });
  const recibir = () => frames.length ? Promise.resolve(frames.shift()!) : new Promise<Record<string, unknown>>((r) => { resolver = r; });
  await once(socket, 'open');
  const reto = await recibir();
  assert.equal(reto.kind, 'CHALLENGE'); assert.equal(socket.extensions, '');
  const claves = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const payload = Buffer.from(canonico({ v: 1, kind: 'PROOF', connectionId: reto.connectionId, nonceB64: reto.nonceB64,
    relayOrigin: env.PUBLIC_ORIGIN, role: 'PARENT', publicKeyB64: claves.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url') }));
  socket.send(canonico({ v: 1, kind: 'AUTH', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', Buffer.concat([Buffer.from('C8v1/PROOF\n'), payload]), claves.privateKey).toString('base64url') }));
  assert.equal((await recibir()).kind, 'READY');
  const cierre = once(socket, 'close');
  socket.send('{"kind":"SET_POLICY","v":2}');
  assert.equal((await cierre)[0], 1008);
  const local = crearServidorEncuentroC8Local({ RELAY_MODE: 'c8-local', NODE_ENV: 'test', PUBLIC_ORIGIN: env.PUBLIC_ORIGIN });
  local.listen(0, '::1'); await once(local, 'listening');
  t.after(async () => { const fin = once(local, 'close'); cerrarServidorHttp(local); await fin; });
  assert.equal(await rechazo(`ws://[::1]:${(local.address() as AddressInfo).port}/pair`), 403);
});

test('C8 público simulado: sin prueba no consulta códigos y cp.v2/Origin/query no hacen upgrade', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  for (const protocolo of ['cp.v1', 'cp.v2']) assert.equal(await rechazo(s.url, protocolo), 400);
  assert.equal(await rechazo(s.url + '?code=ABCDEFGH'), 400);
  assert.equal(await rechazo(s.url.replace('/pair', '/ws')), 400);
  assert.equal(await rechazo(s.url, 'c8.v1', env.PUBLIC_ORIGIN), 400);
  const socket = new WebSocket(s.url, 'c8.v1'); socket.on('error', () => {});
  await once(socket, 'message');
  const cierre = once(socket, 'close');
  socket.send('{"code":"ABCDEFGH","kind":"CLAIM","v":1}');
  assert.equal((await cierre)[0], 1008);
});

test('C8 público: keepalive no cambia health503 ni publica claves o presencia', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  const base = s.url.replace('ws:', 'http:').replace('/pair', '');
  const health = await fetch(base + '/healthz');
  assert.equal(health.status, 503); assert.deepEqual(await health.json(), { ok: false, protocol: 1 });
  const keepalive = await fetch(base + '/keepalive');
  assert.equal(keepalive.status, 200); assert.deepEqual(await keepalive.json(), { alive: true });
  assert.equal((await fetch(base + '/pair')).status, 404);
});

test('C8 CLI: configuración incompleta o variables C8 fuera de perfil fallan antes de escuchar', () => {
  const base: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ['ACTIVE_PAIR_ID', 'PARENT_PUBLIC_KEY_B64', 'CHILD_PUBLIC_KEY_B64', 'SELF_URL', 'KEEP_ALIVE_INTERVAL_MS']) delete base[k];
  for (const cambio of [{ C8_ENROLLMENT_ENABLED: undefined }, { RELAY_MODE: 'bootstrap', PUBLIC_ORIGIN: undefined }]) {
    const resultado = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../src/main.ts', import.meta.url))],
      { env: { ...base, ...env, ...cambio }, encoding: 'utf8', timeout: 5000 });
    assert.equal(resultado.status, 1); assert.equal(resultado.stdout, ''); assert.equal(resultado.error, undefined);
  }
});

test('Arnés C8: init inválido o EOF falla sin imprimir cuerpos ni privadas', () => {
  for (const input of ['', '{"role":"OTRO"}\n']) {
    const resultado = spawnSync(process.execPath, [fileURLToPath(new URL('./soporte/interop-c8.mjs', import.meta.url))],
      { input, encoding: 'utf8', timeout: 5000 });
    assert.equal(resultado.status, 1); assert.equal(resultado.stdout, ''); assert.equal(resultado.stderr, 'INTEROP_FAILED\n');
  }
});

test('C8 adaptador: ventana no renovable cierra1012 y rechaza upgrades posteriores503', async (t) => {
  const ahora = performance.now();
  const limite = ahora + 700;
  const coordinar = new CoordinarEncuentroC8({ ahora: () => performance.now() }, new EntropiaEncuentroAdapter(), {
    prueba: () => { throw new Error('No usada'); }, oferta: () => { throw new Error('No usada'); },
    aceptacion: () => { throw new Error('No usada'); },
  }, env.PUBLIC_ORIGIN, limite);
  const transporte = new WebSocketServer({ noServer: true, perMessageDeflate: false });
  const adapter = new WebSocketEncuentroC8Adapter(coordinar, new CodecEncuentroC8(), transporte,
    new LimiteUpgradesAdapter(ahora), 'RENDER', limite);
  const servidor = createServer();
  servidor.on('upgrade', (req, socket, head) => adapter.upgrade(req, socket, head));
  servidor.listen(0, '::1'); await once(servidor, 'listening');
  t.after(async () => { adapter.detener(); const fin = once(servidor, 'close'); servidor.close(); await fin; });
  const url = `ws://[::1]:${(servidor.address() as AddressInfo).port}/pair`;
  const socket = new WebSocket(url, 'c8.v1'); socket.on('error', () => {});
  const cierre = once(socket, 'close');
  await once(socket, 'message');
  assert.equal((await cierre)[0], 1012);
  assert.equal(await rechazo(url), 503);
  assert.throws(() => coordinar.abrir());
});
