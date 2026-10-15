import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import WebSocket from 'ws';
import { crearServidorInicialCerrado } from '../src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../src/infrastructure/config/servidor.config.js';
import { VARIABLES_PUBLICAS } from '../src/infrastructure/config/configuracion-servidor.js';

const valores = { RELAY_MODE: 'bootstrap', NODE_ENV: 'production', LOG_LEVEL: 'error' };
const ruta = fileURLToPath(new URL('../src/main.ts', import.meta.url));
function entornoLimpio(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...valores };
  for (const nombre of VARIABLES_PUBLICAS) delete env[nombre];
  return env;
}
async function iniciar() {
  const servidor = crearServidorInicialCerrado(valores);
  servidor.listen(0, '127.0.0.1'); await once(servidor, 'listening');
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  return { url, detener: async (): Promise<void> => {
    const cierre = once(servidor, 'close'); cerrarServidorHttp(servidor); await cierre;
  } };
}
function rechazarUpgrade(url: string, protocolo?: string): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const socket = new WebSocket(url.replace('http:', 'ws:'), protocolo);
    const limite = setTimeout(() => { socket.terminate(); rechazar(new Error('Timeout de rechazo')); }, 3000);
    socket.on('error', () => {});
    socket.once('unexpected-response', (_solicitud, respuesta) => {
      clearTimeout(limite); respuesta.resume(); socket.terminate(); resolver(respuesta.statusCode ?? 0);
    });
    socket.once('open', () => { clearTimeout(limite); socket.terminate(); rechazar(new Error('Se aceptó un WebSocket en bootstrap')); });
  });
}

test('Inicial cerrado: keepalive200 no se confunde con relay health503', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  const vivo = await fetch(s.url + '/keepalive');
  assert.equal(vivo.status, 200); assert.deepEqual(await vivo.json(), { alive: true });
  const salud = await fetch(s.url + '/healthz');
  assert.equal(salud.status, 503); assert.deepEqual(await salud.json(), { ok: false, protocol: 1 });
  assert.equal(salud.headers.get('cache-control'), 'no-store');
});

test('Inicial cerrado: rechaza upgrades CP1, CP2 y sin perfil, nunca emite CHALLENGE', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  assert.equal(await rechazarUpgrade(s.url + '/ws', 'cp.v1'), 503);
  for (const perfil of ['cp.v2', undefined]) assert.notEqual(await rechazarUpgrade(s.url + '/ws', perfil), 101);
  assert.notEqual(await rechazarUpgrade(s.url + '/ws?token=no', 'cp.v2'), 101);
});

test('Inicial cerrado: no incorpora otras rutas, métodos ni query strings', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  for (const ruta of ['/', '/ws', '/keepalive?x=1', '/healthz?x=1']) {
    const respuesta = await fetch(s.url + ruta); assert.equal(respuesta.status, 404); await respuesta.arrayBuffer();
  }
  const respuesta = await fetch(s.url + '/keepalive', { method: 'POST' });
  assert.equal(respuesta.status, 404); await respuesta.arrayBuffer();
});

test('Inicial cerrado: modo explícito y ausencia de configuración operativa son obligatorios', () => {
  assert.throws(() => crearServidorInicialCerrado({}), /bootstrap/);
  assert.throws(() => crearServidorInicialCerrado({ ...valores, RELAY_MODE: 'public' }), /bootstrap/);
  for (const clave of VARIABLES_PUBLICAS) for (const valor of ['', 'configuración presente']) {
    assert.throws(() => crearServidorInicialCerrado({ ...valores, [clave]: valor }), /no admite/);
  }
  assert.throws(() => crearServidorInicialCerrado({ ...valores, NODE_ENV: 'otro' }), /NODE_ENV/);
  assert.throws(() => crearServidorInicialCerrado({ ...valores, LOG_LEVEL: 'info' }), /LOG_LEVEL/);
});

test('Inicial cerrado: CLI falla con modo desconocido, puerto inválido o claves presentes', () => {
  for (const cambio of [{ RELAY_MODE: 'public' }, { RELAY_MODE: '' }, { PORT: '0' }, { PUBLIC_ORIGIN: '' }]) {
    const resultado = spawnSync(process.execPath, ['--import', 'tsx', ruta], {
      env: { ...entornoLimpio(), ...cambio }, encoding: 'utf8', timeout: 15000,
    });
    assert.equal(resultado.error, undefined); assert.equal(resultado.status, 1); assert.equal(resultado.stdout, '');
  }
  const env = entornoLimpio(); delete env.RELAY_MODE;
  const resultado = spawnSync(process.execPath, ['--import', 'tsx', ruta], { env, encoding: 'utf8', timeout: 15000 });
  assert.equal(resultado.status, 1); assert.match(resultado.stderr, /solo permite ejecución local/);
});

test('Inicial cerrado: proceso real arranca en producción sólo como HTTP cerrado', async (t) => {
  const reserva = createServer(); reserva.listen(0, '127.0.0.1'); await once(reserva, 'listening');
  const puerto = (reserva.address() as AddressInfo).port;
  await new Promise<void>((resolver, rechazar) => reserva.close((error) => error ? rechazar(error) : resolver()));
  const hijo = spawn(process.execPath, ['--import', 'tsx', ruta], {
    env: { ...entornoLimpio(), PORT: String(puerto) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errores = ''; hijo.stderr.on('data', (bytes: Buffer) => { errores += bytes.toString(); });
  t.after(async () => {
    if (hijo.exitCode !== null || hijo.signalCode !== null) return;
    const salida = once(hijo, 'exit'); hijo.kill(); await salida;
  });
  await new Promise<void>((resolver, rechazar) => {
    const limite = setTimeout(() => rechazar(new Error('Timeout de inicio: ' + errores)), 15000);
    hijo.once('error', (error) => { clearTimeout(limite); rechazar(error); });
    hijo.once('exit', () => { clearTimeout(limite); rechazar(new Error('Proceso terminó: ' + errores)); });
    hijo.stdout.once('data', (bytes: Buffer) => {
      clearTimeout(limite); assert.match(bytes.toString(), /HTTP disponible, relay deshabilitado/); resolver();
    });
  });
  const url = `http://127.0.0.1:${puerto}`;
  const vivo = await fetch(url + '/keepalive'); assert.equal(vivo.status, 200); await vivo.arrayBuffer();
  assert.equal(await rechazarUpgrade(url + '/ws', 'cp.v1'), 503);
  assert.notEqual(await rechazarUpgrade(url + '/ws', 'cp.v2'), 101);
  assert.equal(errores, '');
});
