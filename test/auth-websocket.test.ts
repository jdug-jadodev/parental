import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import WebSocket from 'ws';
import { ClienteAuth, entornoAuth, firmarAuth, iniciarAuth, codecAuth } from './soporte/cliente-auth.js';

function rechazoHttp(url: string, protocolo: string | null = 'cp.v1', origin?: string): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const socket = new WebSocket(url, protocolo ?? undefined, origin === undefined ? {} : { origin });
    const limite = setTimeout(() => { socket.terminate(); rechazar(new Error('Timeout de rechazo HTTP')); }, 3000);
    socket.on('error', () => {});
    socket.once('unexpected-response', (_solicitud, respuesta) => {
      clearTimeout(limite);
      respuesta.resume();
      socket.terminate();
      resolver(respuesta.statusCode ?? 0);
    });
    socket.once('open', () => { clearTimeout(limite); socket.terminate(); rechazar(new Error('Se aceptó un upgrade prohibido')); });
  });
}

test('R-AUTH-01: padre e hijo autentican localmente sin compresión ni servicio operativo', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const retos: string[] = [];
  for (const rol of ['PARENT', 'CHILD'] as const) {
    const cliente = await ClienteAuth.conectar(servicio.url);
    const reto = await cliente.reto();
    assert.equal(cliente.socket.protocol, 'cp.v1');
    assert.equal(cliente.socket.extensions, '');
    assert.equal(Buffer.from(reto.nonce, 'base64url').length, 32);
    assert.equal(reto.timeoutSec, 10);
    retos.push(reto.nonce);
    cliente.enviar(firmarAuth(reto, pareja, rol, claves[rol].privateKey));
    assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'AUTH_OK', connectionId: reto.connectionId });
  }
  assert.notEqual(retos[0], retos[1]);
  const health = await fetch(servicio.url.replace('ws:', 'http:').replace('/ws', '/healthz'));
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { ok: false, protocol: 1 });
});

test('R-AUTH-02: copiar prueba de una conexión no autentica otra', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const original = await ClienteAuth.conectar(servicio.url);
  const otro = await ClienteAuth.conectar(servicio.url);
  const reto = await original.reto();
  await otro.reto();
  const prueba = firmarAuth(reto, pareja, 'PARENT', claves.PARENT.privateKey);
  otro.enviar(prueba);
  assert.deepEqual(await otro.recibir(), { v: 1, kind: 'ERROR', code: 'STALE_NONCE' });
  assert.equal(await otro.cerrado, 1008);
  original.enviar(prueba);
  assert.equal((await original.recibir()).kind, 'AUTH_OK');
});

test('R-AUTH: impostores, rol, nonce y pareja inválidos cierran sin expulsar al padre auténtico', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const padre = await ClienteAuth.conectar(servicio.url);
  padre.enviar(firmarAuth(await padre.reto(), pareja, 'PARENT', claves.PARENT.privateKey));
  await padre.recibir();
  const impostor = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  for (const [privada, cambios, codigo] of [
    [impostor.privateKey, {}, 'BAD_SIGNATURE'],
    [claves.PARENT.privateKey, { role: 'CHILD' as const }, 'WRONG_ROLE'],
    [claves.PARENT.privateKey, { pairId: randomUUID() }, 'WRONG_PAIR'],
    [claves.PARENT.privateKey, { nonce: Buffer.alloc(32, 7).toString('base64url') }, 'STALE_NONCE'],
  ] as const) {
    const cliente = await ClienteAuth.conectar(servicio.url);
    cliente.enviar(firmarAuth(await cliente.reto(), pareja, 'PARENT', privada, cambios));
    assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'ERROR', code: codigo });
    assert.equal(await cliente.cerrado, 1008);
    assert.equal(padre.socket.readyState, WebSocket.OPEN);
  }
});

test('R-AUTH: solo una conexión autenticada sustituye al mismo rol', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const antiguo = await ClienteAuth.conectar(servicio.url);
  antiguo.enviar(firmarAuth(await antiguo.reto(), pareja, 'PARENT', claves.PARENT.privateKey));
  await antiguo.recibir();
  const nuevo = await ClienteAuth.conectar(servicio.url);
  const reto = await nuevo.reto();
  assert.equal(antiguo.socket.readyState, WebSocket.OPEN);
  nuevo.enviar(firmarAuth(reto, pareja, 'PARENT', claves.PARENT.privateKey));
  assert.equal((await nuevo.recibir()).kind, 'AUTH_OK');
  assert.equal(await antiguo.cerrado, 1008);
  assert.equal(nuevo.socket.readyState, WebSocket.OPEN);
  const tercero = await ClienteAuth.conectar(servicio.url);
  tercero.enviar(firmarAuth(await tercero.reto(), pareja, 'PARENT', claves.PARENT.privateKey));
  assert.equal((await tercero.recibir()).kind, 'AUTH_OK');
  assert.equal(await nuevo.cerrado, 1008);
});

test('R-LIMIT: configuración válida no admite Origin, query, ruta o subprotocolo incorrecto', async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  assert.equal(await rechazoHttp(servicio.url, 'cp.v1', 'https://example.com'), 400);
  assert.equal(await rechazoHttp(`${servicio.url}?token=prohibido`), 400);
  assert.equal(await rechazoHttp(servicio.url.replace('/ws', '/otra')), 400);
  assert.equal(await rechazoHttp(servicio.url, 'otro'), 400);
  assert.equal(await rechazoHttp(servicio.url, null), 400);
});

test('R-LIMIT: máximo 16 retos pendientes; desconectar libera un lugar', async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const clientes: ClienteAuth[] = [];
  for (let indice = 0; indice < 16; indice++) {
    const cliente = await ClienteAuth.conectar(servicio.url);
    await cliente.reto();
    clientes.push(cliente);
  }
  assert.equal(await rechazoHttp(servicio.url), 429);
  clientes[0]!.socket.close();
  await clientes[0]!.cerrado;
  const siguiente = await ClienteAuth.conectar(servicio.url);
  assert.equal((await siguiente.reto()).kind, 'CHALLENGE');
});

test('R-AUTH: repetir AUTH o enviar AUTH_OK del cliente se rechaza', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  for (const repetir of [true, false]) {
    const cliente = await ClienteAuth.conectar(servicio.url);
    const prueba = firmarAuth(await cliente.reto(), pareja, 'PARENT', claves.PARENT.privateKey);
    cliente.enviar(prueba);
    await cliente.recibir();
    cliente.enviar(repetir ? prueba : codecAuth.codificarFrame({ v: 1, kind: 'AUTH_OK', connectionId: randomUUID() }));
    assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'ERROR', code: 'BAD_SCHEMA' });
    assert.equal(await cliente.cerrado, 1008);
  }
});

test('R-LIMIT-01: rechaza binarios, aplicación pre-AUTH, JSON ambiguo y frames grandes', async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  for (const [bytes, binario, codigo] of [
    [Buffer.from('{}'), true, 1003],
    [codecAuth.codificarFrame({ v: 1, kind: 'PING', nonce: Buffer.alloc(32).toString('base64url') }), false, 1008],
    [Buffer.from('{"v":1,"v":1}'), false, 1008],
    [Buffer.alloc(16385, 32), false, 1009],
  ] as const) {
    const cliente = await ClienteAuth.conectar(servicio.url);
    await cliente.reto();
    cliente.enviar(bytes, binario);
    assert.equal(await cliente.cerrado, codigo);
  }
});

test('R-AUTH-03: cierre real de socket sin autenticar a los diez segundos', { timeout: 14000 }, async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const inicio = performance.now();
  const cliente = await ClienteAuth.conectar(servicio.url);
  await cliente.reto();
  assert.deepEqual(await cliente.recibir(12000), { v: 1, kind: 'ERROR', code: 'STALE_NONCE' });
  assert.equal(await cliente.cerrado, 1008);
  const transcurrido = performance.now() - inicio;
  assert.ok(transcurrido >= 9900 && transcurrido < 13000, `Caducidad observada: ${transcurrido} ms`);
});

test('R-AUTH: cierre controlado incluye conexiones pendientes y autenticadas con 1012', async () => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  try {
    const pendiente = await ClienteAuth.conectar(servicio.url);
    await pendiente.reto();
    const autenticado = await ClienteAuth.conectar(servicio.url);
    autenticado.enviar(firmarAuth(await autenticado.reto(), pareja, 'CHILD', claves.CHILD.privateKey));
    await autenticado.recibir();
    await servicio.detener();
    assert.equal(await pendiente.cerrado, 1012);
    assert.equal(await autenticado.cerrado, 1012);
  } finally { if (servicio.servidor.listening) await servicio.detener(); }
});
