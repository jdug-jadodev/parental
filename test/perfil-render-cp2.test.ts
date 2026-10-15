import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import WebSocket from 'ws';
import { crearServidorRelayCp2Render, crearServidorRelayCp2Local } from '../src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../src/infrastructure/config/servidor.config.js';
import { EstadoRelayCp2Adapter } from '../src/infrastructure/adapter/estado-relay-cp2.adapter.js';
import { entornoAuth } from './soporte/cliente-auth.js';
import { ClienteAuthCp2, codecAuthCp2, firmarAuthCp2 } from './soporte/cliente-auth-cp2.js';

function entornoPublico() {
  const lab = entornoAuth();
  return { ...lab, env: { ...lab.env, NODE_ENV: 'production', LOG_LEVEL: 'error', RELAY_MODE: 'cp2',
    RENDER: 'true', RENDER_EXTERNAL_URL: lab.env.PUBLIC_ORIGIN } };
}
async function iniciar(host = '127.0.0.1') {
  const lab = entornoPublico(); const servidor = crearServidorRelayCp2Render(lab.env);
  servidor.listen(0, host); await once(servidor, 'listening');
  return { ...lab, servidor, url: `ws://${host.includes(':') ? `[${host}]` : host}:${(servidor.address() as AddressInfo).port}/ws`,
    detener: async (): Promise<void> => {
      const cierre = once(servidor, 'close'); cerrarServidorHttp(servidor); await cierre;
    } };
}
function rechazo(url: string, perfil: string | string[], origin?: string): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const socket = new WebSocket(url, perfil, origin === undefined ? {} : { origin });
    const limite = setTimeout(() => { socket.terminate(); rechazar(new Error('Timeout upgrade público simulado')); }, 3000);
    socket.on('error', () => {});
    socket.once('unexpected-response', (_solicitud, respuesta) => {
      clearTimeout(limite); respuesta.resume(); socket.terminate(); resolver(respuesta.statusCode ?? 0);
    });
    socket.once('open', () => { clearTimeout(limite); socket.terminate(); rechazar(new Error('Perfil prohibido aceptado')); });
  });
}

test('CP2-P01: público exige modo/producción/Render/origen coincidente y pareja completa válida', () => {
  const { env } = entornoPublico();
  for (const cambio of [{ RELAY_MODE: undefined }, { RELAY_MODE: 'bootstrap' }, { NODE_ENV: 'test' }, { RENDER: undefined },
    { RENDER_EXTERNAL_URL: undefined }, { RENDER_EXTERNAL_URL: 'https://otro.example.com' }, { PUBLIC_ORIGIN: '' },
    { SELF_URL: 'https://otro.example.com' }, { ACTIVE_PAIR_ID: '' }, { ACTIVE_PAIR_ID: '12345678-ABCD-4ABC-8ABC-123456789ABC' }, { PARENT_PUBLIC_KEY_B64: '' },
    { CHILD_PUBLIC_KEY_B64: '' }, { CHILD_PUBLIC_KEY_B64: env.PARENT_PUBLIC_KEY_B64 }, { LOG_LEVEL: 'info' }]) {
    assert.throws(() => crearServidorRelayCp2Render({ ...env, ...cambio }));
  }
  assert.throws(() => crearServidorRelayCp2Local(env), /local/);
});

test('CP2-P01: sin autenticación no hay órdenes, rol declarado no sustituye clave fijada', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  const sinAuth = await ClienteAuthCp2.conectar(s.url); await sinAuth.reto();
  sinAuth.socket.send('{"kind":"SET_POLICY","v":2}'); assert.equal(await sinAuth.cerrado, 1008);
  const atacante = await ClienteAuthCp2.conectar(s.url);
  atacante.socket.send(firmarAuthCp2(await atacante.reto(), s.pareja, 'PARENT', s.claves.CHILD.privateKey), { binary: false });
  assert.equal(await atacante.cerrado, 1008);
  const padre = await ClienteAuthCp2.conectar(s.url);
  padre.socket.send(firmarAuthCp2(await padre.reto(), s.pareja, 'PARENT', s.claves.PARENT.privateKey), { binary: false });
  assert.equal((await padre.recibir()).kind, 'AUTH_OK');
  padre.socket.send(codecAuthCp2.codificarFrame({ v: 2, kind: 'PING', nonce: 'A'.repeat(43) }), { binary: false });
  assert.equal((await padre.recibir()).kind, 'PONG');
});

test('CP2-P01: IPv6 sólo disponible en alcance Render; local conserva barrera127.0.0.1', async (t) => {
  const s = await iniciar('::1'); t.after(s.detener);
  const cliente = await ClienteAuthCp2.conectar(s.url);
  cliente.socket.send(firmarAuthCp2(await cliente.reto(), s.pareja, 'CHILD', s.claves.CHILD.privateKey), { binary: false });
  assert.equal((await cliente.recibir()).kind, 'AUTH_OK');
  const local = crearServidorRelayCp2Local(entornoAuth().env);
  local.listen(0, '::1'); await once(local, 'listening');
  t.after(async () => { const cierre = once(local, 'close'); cerrarServidorHttp(local); await cierre; });
  assert.equal(await rechazo(`ws://[::1]:${(local.address() as AddressInfo).port}/ws`, 'cp.v2'), 403);
});

test('CP2-P01: rechaza CP1, mezcla, Origin, query y ruta; health no filtra contexto', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  assert.equal(await rechazo(s.url, 'cp.v1'), 400);
  assert.equal(await rechazo(s.url, ['cp.v1', 'cp.v2']), 400);
  assert.equal(await rechazo(s.url, 'cp.v2', s.env.PUBLIC_ORIGIN), 400);
  assert.equal(await rechazo(s.url + '?auth=no', 'cp.v2'), 400);
  assert.equal(await rechazo(s.url.replace('/ws', '/otra'), 'cp.v2'), 400);
  const salud = await fetch(s.url.replace('ws:', 'http:').replace('/ws', '/healthz'));
  assert.equal(salud.status, 200); assert.deepEqual(await salud.json(), { ok: true, protocol: 2 });
});

test('CP2-P01: estado CP2 refleja cierre sin alterar defaultCP1', () => {
  let listo = true; const estado = new EstadoRelayCp2Adapter(() => listo);
  assert.equal(estado.obtener().protocolo, 2); assert.equal(estado.obtener().operativo, true);
  listo = false; assert.equal(estado.obtener().operativo, false);
});

test('CP2-P01: CLI con cp2 y configuración parcial falla antes de escuchar', () => {
  const env: NodeJS.ProcessEnv = { ...process.env, ...entornoPublico().env };
  delete env.CHILD_PUBLIC_KEY_B64; delete env.SELF_URL; delete env.KEEP_ALIVE_INTERVAL_MS;
  const resultado = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../src/main.ts', import.meta.url))],
    { env, encoding: 'utf8', timeout: 15000 });
  assert.equal(resultado.error, undefined); assert.equal(resultado.status, 1);
  assert.equal(resultado.stdout, ''); assert.match(resultado.stderr, /Falta CHILD_PUBLIC_KEY_B64/);
});
