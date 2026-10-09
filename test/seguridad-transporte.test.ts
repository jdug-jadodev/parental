import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { connect } from 'node:net';
import { test } from 'node:test';
import { ClienteAuth, codecAuth, entornoAuth, firmarAuth, iniciarAuth } from './soporte/cliente-auth.js';

async function handshake(url: string, adicionales: string[]): Promise<number> {
  const destino = new URL(url);
  const socket = connect(Number(destino.port), '127.0.0.1');
  return new Promise((resolver, rechazar) => {
    let respuesta = '';
    const limite = setTimeout(() => { socket.destroy(); rechazar(new Error('Timeout de handshake de prueba')); }, 3000);
    socket.on('error', (error) => { clearTimeout(limite); rechazar(error); });
    socket.on('data', (bytes) => {
      respuesta += bytes.toString('latin1');
      if (!respuesta.includes('\r\n')) return;
      clearTimeout(limite);
      socket.destroy();
      resolver(Number(/^HTTP\/1\.1 (\d{3})/.exec(respuesta)?.[1]));
    });
    socket.once('connect', () => socket.write([
      'GET /ws HTTP/1.1', `Host: ${destino.host}`, 'Upgrade: websocket', 'Connection: Upgrade',
      `Sec-WebSocket-Key: ${randomBytes(16).toString('base64')}`, 'Sec-WebSocket-Version: 13', 'Sec-WebSocket-Protocol: cp.v1',
      ...adicionales, '', '',
    ].join('\r\n')));
  });
}

test('seguridad: exceso de cabeceras no oculta Origin al truncar las normalizadas', async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const relleno = Array.from({ length: 32 }, (_, indice) => `X-Prueba-${indice}: a`);
  assert.equal(await handshake(servicio.url, [...relleno, 'Origin: https://example.com']), 431);
  assert.equal(await handshake(servicio.url, relleno), 431);
  assert.equal(await handshake(servicio.url, ['Origin: https://example.com']), 400);
});

test('seguridad: X-Forwarded-For diferente no elude el cupo de la IP del socket', async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  let limitados = 0;
  for (let indice = 0; indice < 30; indice++) {
    const estado = await handshake(servicio.url, [`X-Forwarded-For: 192.0.2.${indice + 1}`, 'Origin: https://example.com']);
    assert.ok(estado === 400 || estado === 429);
    if (estado === 429) limitados++;
  }
  assert.ok(limitados > 0);
});

test('seguridad: ping de control conserva bytes pero no acredita autenticación', async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const cliente = await ClienteAuth.conectar(servicio.url);
  await cliente.reto();
  const bytes = randomBytes(16);
  const pong = once(cliente.socket, 'pong');
  cliente.socket.ping(bytes);
  assert.deepEqual((await pong)[0], bytes);
  cliente.enviar(codecAuth.codificarFrame({ v: 1, kind: 'PING', nonce: randomBytes(32).toString('base64url') }));
  assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'ERROR', code: 'BAD_SCHEMA' });
  assert.equal(await cliente.cerrado, 1008);
});

test('seguridad: flood de ping/pong de control queda limitado antes de AUTH', async (contexto) => {
  const { env } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  for (const tipo of ['ping', 'pong'] as const) {
    const cliente = await ClienteAuth.conectar(servicio.url);
    await cliente.reto();
    for (let indice = 0; indice < 80; indice++) cliente.socket[tipo](Buffer.from('prueba'));
    assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'ERROR', code: 'RATE_LIMITED' });
    assert.equal(await cliente.cerrado, 1008);
  }
});

test('seguridad: 64 fragmentos admitidos, 65 fragmentos vacíos rechazados', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const cliente = await ClienteAuth.conectar(servicio.url);
  cliente.enviar(firmarAuth(await cliente.reto(), pareja, 'PARENT', claves.PARENT.privateKey));
  await cliente.recibir();
  const nonce = randomBytes(32).toString('base64url');
  const frame = codecAuth.codificarFrame({ v: 1, kind: 'PING', nonce });
  for (let indice = 0; indice < 64; indice++) {
    cliente.socket.send(frame.subarray(Math.floor(indice * frame.length / 64), Math.floor((indice + 1) * frame.length / 64)), { binary: false, fin: indice === 63 });
  }
  assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'PONG', nonce });
  for (let indice = 0; indice < 65; indice++) cliente.socket.send('', { binary: false, fin: indice === 64 });
  assert.equal(await cliente.cerrado, 1008);
});

test('seguridad: socket autenticado sin pong correcto termina en la segunda revisión real', { timeout: 70000 }, async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const muerto = await ClienteAuth.conectar(servicio.url, false);
  muerto.enviar(firmarAuth(await muerto.reto(), pareja, 'PARENT', claves.PARENT.privateKey));
  await muerto.recibir();
  const vivo = await ClienteAuth.conectar(servicio.url);
  vivo.enviar(firmarAuth(await vivo.reto(), pareja, 'CHILD', claves.CHILD.privateKey));
  await vivo.recibir();
  const [nonce] = await once(muerto.socket, 'ping');
  assert.equal(nonce.length, 16);
  muerto.socket.pong(Buffer.alloc(16));
  assert.equal(await muerto.cerrado, 1006);
  assert.equal(vivo.socket.readyState, 1);
});
