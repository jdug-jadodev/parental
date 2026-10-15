import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import WebSocket from 'ws';
import { crearServidorAutenticacionCp2Local } from '../src/infrastructure/config/dependencias.js';
import { entornoAuth } from './soporte/cliente-auth.js';
import { ClienteAuthCp2, codecAuthCp2, firmarAuthCp2, iniciarAuthCp2 } from './soporte/cliente-auth-cp2.js';

function rechazoHttp(url: string, protocolos?: string | string[], origin?: string): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const socket = new WebSocket(url, protocolos, origin === undefined ? {} : { origin });
    const limite = setTimeout(() => { socket.terminate(); rechazar(new Error('Timeout upgrade CP2')); }, 3000);
    socket.on('error', () => {});
    socket.once('unexpected-response', (_solicitud, respuesta) => {
      clearTimeout(limite); respuesta.resume(); socket.terminate(); resolver(respuesta.statusCode ?? 0);
    });
    socket.once('open', () => { clearTimeout(limite); socket.terminate(); rechazar(new Error('Upgrade prohibido aceptado')); });
  });
}

test('CP2-T01: ambos roles autentican en sockets reales locales, sin compresión ni salud pública', async (t) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuthCp2(env); t.after(servicio.detener);
  const nonces = new Set<string>();
  for (const rol of ['PARENT', 'CHILD'] as const) {
    const cliente = await ClienteAuthCp2.conectar(servicio.url);
    const reto = await cliente.reto(); nonces.add(reto.nonce);
    assert.equal(cliente.socket.protocol, 'cp.v2'); assert.equal(cliente.socket.extensions, '');
    cliente.socket.send(firmarAuthCp2(reto, pareja, rol, claves[rol].privateKey), { binary: false });
    assert.deepEqual(await cliente.recibir(), { connectionId: reto.connectionId, kind: 'AUTH_OK', protocol: 'cp.v2', v: 2 });
    const nonce = randomBytes(32).toString('base64url');
    cliente.socket.send(codecAuthCp2.codificarFrame({ v: 2, kind: 'PING', nonce }), { binary: false });
    assert.deepEqual(await cliente.recibir(), { kind: 'PONG', nonce, v: 2 });
  }
  assert.equal(nonces.size, 2);
  const health = await fetch(servicio.url.replace('ws:', 'http:').replace('/ws', '/healthz'));
  assert.equal(health.status, 503);
  const keepalive = await fetch(servicio.url.replace('ws:', 'http:').replace('/ws', '/keepalive'));
  assert.deepEqual(await keepalive.json(), { alive: true });
});

test('CP2-T01: rechaza v1, mixto, sin perfil, Origin, ruta y query antes de upgrade', async (t) => {
  const servicio = await iniciarAuthCp2(entornoAuth().env); t.after(servicio.detener);
  for (const protocolo of ['cp.v1', ['cp.v2', 'cp.v1'], undefined]) assert.equal(await rechazoHttp(servicio.url, protocolo), 400);
  assert.equal(await rechazoHttp(servicio.url, 'cp.v2', 'https://example.com'), 400);
  assert.equal(await rechazoHttp(servicio.url + '?token=no', 'cp.v2'), 400);
  assert.equal(await rechazoHttp(servicio.url.replace('/ws', '/otra'), 'cp.v2'), 400);
});

test('CP2-T01: prueba copiada no autentica otro socket y no consume reto original', async (t) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuthCp2(env); t.after(servicio.detener);
  const uno = await ClienteAuthCp2.conectar(servicio.url); const reto = await uno.reto();
  const dos = await ClienteAuthCp2.conectar(servicio.url); await dos.reto();
  const prueba = firmarAuthCp2(reto, pareja, 'PARENT', claves.PARENT.privateKey);
  dos.socket.send(prueba, { binary: false }); assert.equal(await dos.cerrado, 1008);
  uno.socket.send(prueba, { binary: false }); assert.equal((await uno.recibir()).kind, 'AUTH_OK');
  uno.socket.send(prueba, { binary: false }); assert.equal(await uno.cerrado, 1008);
});

test('CP2-T01: firma ajena, rol, nonce y pareja erróneos no expulsan cliente auténtico', async (t) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuthCp2(env); t.after(servicio.detener);
  const padre = await ClienteAuthCp2.conectar(servicio.url);
  padre.socket.send(firmarAuthCp2(await padre.reto(), pareja, 'PARENT', claves.PARENT.privateKey), { binary: false });
  await padre.recibir();
  const otra = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  for (const [privada, cambio] of [[otra.privateKey, {}], [claves.PARENT.privateKey, { role: 'CHILD' }],
    [claves.PARENT.privateKey, { pairId: randomUUID() }], [claves.PARENT.privateKey, { nonce: randomBytes(32).toString('base64url') }]] as const) {
    const cliente = await ClienteAuthCp2.conectar(servicio.url);
    cliente.socket.send(firmarAuthCp2(await cliente.reto(), pareja, 'PARENT', privada, cambio), { binary: false });
    assert.equal(await cliente.cerrado, 1008); assert.equal(padre.socket.readyState, WebSocket.OPEN);
  }
});

test('CP2-T01: sólo nuevo cliente autenticado sustituye al mismo rol', async (t) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuthCp2(env); t.after(servicio.detener);
  const viejo = await ClienteAuthCp2.conectar(servicio.url);
  viejo.socket.send(firmarAuthCp2(await viejo.reto(), pareja, 'PARENT', claves.PARENT.privateKey), { binary: false });
  await viejo.recibir();
  const nuevo = await ClienteAuthCp2.conectar(servicio.url); const reto = await nuevo.reto();
  assert.equal(viejo.socket.readyState, WebSocket.OPEN);
  nuevo.socket.send(firmarAuthCp2(reto, pareja, 'PARENT', claves.PARENT.privateKey), { binary: false });
  assert.equal((await nuevo.recibir()).kind, 'AUTH_OK'); assert.equal(await viejo.cerrado, 1008);
});

test('CP2-T01: binarios y frames mayores de16KiB se cierran antes de autenticar', async (t) => {
  const servicio = await iniciarAuthCp2(entornoAuth().env); t.after(servicio.detener);
  const binario = await ClienteAuthCp2.conectar(servicio.url); await binario.reto();
  binario.socket.send(Buffer.from('{}')); assert.equal(await binario.cerrado, 1003);
  const grande = await ClienteAuthCp2.conectar(servicio.url); await grande.reto();
  grande.socket.send('x'.repeat(16385)); assert.equal(await grande.cerrado, 1009);
});

test('CP2-T01: sin AUTH no admite PING y tras AUTH no admite órdenes ni eco', async (t) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuthCp2(env); t.after(servicio.detener);
  const cliente = await ClienteAuthCp2.conectar(servicio.url); await cliente.reto();
  cliente.socket.send(codecAuthCp2.codificarFrame({ v: 2, kind: 'PING', nonce: randomBytes(32).toString('base64url') }), { binary: false });
  assert.equal(await cliente.cerrado, 1008);
  const autenticado = await ClienteAuthCp2.conectar(servicio.url);
  autenticado.socket.send(firmarAuthCp2(await autenticado.reto(), pareja, 'CHILD', claves.CHILD.privateKey), { binary: false });
  await autenticado.recibir();
  autenticado.socket.send('{"kind":"SET_POLICY","v":2}'); assert.equal(await autenticado.cerrado, 1008);
});

test('CP2-T01: cupo16retos, desconexión libera lugar y cierre servidor usa1012', async (t) => {
  const servicio = await iniciarAuthCp2(entornoAuth().env); t.after(servicio.detener);
  const clientes: ClienteAuthCp2[] = [];
  for (let i = 0; i < 16; i++) { const cliente = await ClienteAuthCp2.conectar(servicio.url); await cliente.reto(); clientes.push(cliente); }
  assert.equal(await rechazoHttp(servicio.url, 'cp.v2'), 429);
  clientes[0]!.socket.close(); await clientes[0]!.cerrado;
  const nuevo = await ClienteAuthCp2.conectar(servicio.url); await nuevo.reto();
  await servicio.detener(); assert.equal(await nuevo.cerrado, 1012);
});

test('CP2-T01: sin configuración pública válida o en producción no se crea servidor', () => {
  assert.throws(() => crearServidorAutenticacionCp2Local({}));
  assert.throws(() => crearServidorAutenticacionCp2Local({ ...entornoAuth().env, NODE_ENV: 'production' }), /local/);
});

test('CP2-T01: socket sin prueba caduca y tráfico autenticado respeta cupo', async (t) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuthCp2(env); t.after(servicio.detener);
  const vencido = await ClienteAuthCp2.conectar(servicio.url); await vencido.reto();
  assert.equal(await vencido.cerrado, 1008);
  const cliente = await ClienteAuthCp2.conectar(servicio.url);
  cliente.socket.send(firmarAuthCp2(await cliente.reto(), pareja, 'PARENT', claves.PARENT.privateKey), { binary: false });
  await cliente.recibir();
  for (let i = 0; i < 25; i++) cliente.socket.send(codecAuthCp2.codificarFrame({ v: 2, kind: 'PING',
    nonce: randomBytes(32).toString('base64url') }), { binary: false });
  assert.equal(await cliente.cerrado, 1008);
});
