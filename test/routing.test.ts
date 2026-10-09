import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID, sign, type KeyObject } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Payload, Rol } from '../src/application/dtos/protocolo.dto.js';
import { bytesFirma } from '../src/infrastructure/adapter/protocol/crypto-protocol.js';
import { ClienteAuth, codecAuth, entornoAuth, firmarAuth, iniciarAuth } from './soporte/cliente-auth.js';

const fixture = JSON.parse(readFileSync(new URL('../pruebas/vectores_crypto.json', import.meta.url), 'utf8')) as { vectors: { payload: Payload }[] };
function payload(tipo: Payload['kind'], pareja: string): Payload {
  const modelo = fixture.vectors.find((vector) => vector.payload.kind === tipo)!.payload;
  return { ...modelo, pairId: pareja };
}
function firmar(mensaje: Payload, privada: KeyObject, espacios = false): Buffer {
  const bytes = codecAuth.codificarPayload(mensaje);
  const sobre = { v: 1 as const, kind: 'SIGNED' as const, purpose: 'MESSAGE' as const,
    payloadB64: bytes.toString('base64url'), sigB64: sign('sha256', bytesFirma('MESSAGE', bytes), { key: privada, dsaEncoding: 'der' }).toString('base64url') };
  return espacios ? Buffer.from(` \n${JSON.stringify(sobre, null, 2)}\n`) : codecAuth.codificarFrame(sobre);
}
async function autenticar(url: string, pareja: string, rol: Rol, privada: KeyObject): Promise<ClienteAuth> {
  const cliente = await ClienteAuth.conectar(url);
  cliente.enviar(firmarAuth(await cliente.reto(), pareja, rol, privada));
  assert.equal((await cliente.recibir()).kind, 'AUTH_OK');
  return cliente;
}

test('R-ROUTE-01: cuatro tipos autorizados se reenvían textuales con bytes intactos', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const padre = await autenticar(servicio.url, pareja, 'PARENT', claves.PARENT.privateKey);
  const hijo = await autenticar(servicio.url, pareja, 'CHILD', claves.CHILD.privateKey);
  for (const tipo of ['SYNC_REQUEST', 'SET_POLICY', 'STATE', 'ACK'] as const) {
    const esPadre = tipo === 'SYNC_REQUEST' || tipo === 'SET_POLICY';
    const emisor = esPadre ? padre : hijo;
    const receptor = esPadre ? hijo : padre;
    const frame = firmar(payload(tipo, pareja), claves[esPadre ? 'PARENT' : 'CHILD'].privateKey, true);
    const recibido = once(receptor.socket, 'message');
    emisor.enviar(frame);
    const [bytes, binario] = await recibido;
    assert.equal(binario, false);
    assert.deepEqual(bytes, frame);
    assert.equal((await receptor.recibir()).kind, 'SIGNED');
  }
  assert.ok(padre.presencias.some((frame) => frame.kind === 'PEER_STATUS' && frame.peerRole === 'CHILD' && frame.online));
  assert.ok(hijo.presencias.some((frame) => frame.kind === 'PEER_STATUS' && frame.peerRole === 'PARENT' && frame.online));
});

test('R-ROUTE-02: receptor ausente descarta la orden y no la entrega tras reconectar', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const padre = await autenticar(servicio.url, pareja, 'PARENT', claves.PARENT.privateKey);
  const orden = payload('SET_POLICY', pareja);
  padre.enviar(firmar(orden, claves.PARENT.privateKey));
  assert.deepEqual(await padre.recibir(), { v: 1, kind: 'PEER_UNAVAILABLE', reason: 'PEER_OFFLINE', refCommandId: 'commandId' in orden ? orden.commandId : null });
  const hijo = await autenticar(servicio.url, pareja, 'CHILD', claves.CHILD.privateKey);
  await assert.rejects(hijo.recibir(100), /Timeout/);
  padre.enviar(firmar(orden, claves.PARENT.privateKey));
  assert.equal((await hijo.recibir()).kind, 'SIGNED');
  hijo.socket.close();
  await hijo.cerrado;
  padre.enviar(firmar(payload('SYNC_REQUEST', pareja), claves.PARENT.privateKey));
  assert.deepEqual(await padre.recibir(), { v: 1, kind: 'PEER_UNAVAILABLE', reason: 'PEER_OFFLINE', refCommandId: null });
  assert.ok(padre.presencias.some((frame) => frame.kind === 'PEER_STATUS' && frame.peerRole === 'CHILD' && !frame.online));
});

test('R-FAIL-01: tras restart se exige otro reto y no reaparece ninguna orden', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const primero = await iniciarAuth(env);
  const padre = await autenticar(primero.url, pareja, 'PARENT', claves.PARENT.privateKey);
  padre.enviar(firmar(payload('SET_POLICY', pareja), claves.PARENT.privateKey));
  await padre.recibir();
  await primero.detener();
  assert.equal(await padre.cerrado, 1012);
  const segundo = await iniciarAuth(env);
  contexto.after(segundo.detener);
  const hijo = await autenticar(segundo.url, pareja, 'CHILD', claves.CHILD.privateKey);
  await assert.rejects(hijo.recibir(100), /Timeout/);
  const nuevo = await autenticar(segundo.url, pareja, 'PARENT', claves.PARENT.privateKey);
  nuevo.enviar(firmar(payload('SYNC_REQUEST', pareja), claves.PARENT.privateKey));
  assert.equal((await hijo.recibir()).kind, 'SIGNED');
});

test('R-ROUTE: el cierre antiguo no borra al nuevo y una firma falsa no lo expulsa', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const padre = await autenticar(servicio.url, pareja, 'PARENT', claves.PARENT.privateKey);
  const antiguo = await autenticar(servicio.url, pareja, 'CHILD', claves.CHILD.privateKey);
  const nuevo = await autenticar(servicio.url, pareja, 'CHILD', claves.CHILD.privateKey);
  assert.equal(await antiguo.cerrado, 1008);
  const falso = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const impostor = await ClienteAuth.conectar(servicio.url);
  impostor.enviar(firmarAuth(await impostor.reto(), pareja, 'CHILD', falso.privateKey));
  assert.deepEqual(await impostor.recibir(), { v: 1, kind: 'ERROR', code: 'BAD_SIGNATURE' });
  await impostor.cerrado;
  padre.enviar(firmar(payload('SYNC_REQUEST', pareja), claves.PARENT.privateKey));
  assert.equal((await nuevo.recibir()).kind, 'SIGNED');
});

test('R-ROUTE: rechaza firma, pareja, rol, propósito, versión y campos añadidos', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const casos = [
    { rol: 'PARENT' as const, tipo: 'SYNC_REQUEST' as const, privada: claves.CHILD.privateKey, par: pareja, codigo: 'BAD_SIGNATURE' },
    { rol: 'PARENT' as const, tipo: 'SET_POLICY' as const, privada: claves.PARENT.privateKey, par: randomUUID(), codigo: 'WRONG_PAIR' },
    { rol: 'CHILD' as const, tipo: 'SET_POLICY' as const, privada: claves.CHILD.privateKey, par: pareja, codigo: 'WRONG_ROLE' },
    { rol: 'PARENT' as const, tipo: 'STATE' as const, privada: claves.PARENT.privateKey, par: pareja, codigo: 'WRONG_ROLE' },
  ];
  for (const caso of casos) {
    const cliente = await autenticar(servicio.url, pareja, caso.rol, claves[caso.rol].privateKey);
    cliente.enviar(firmar(payload(caso.tipo, caso.par), caso.privada));
    assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'ERROR', code: caso.codigo });
    assert.equal(await cliente.cerrado, 1008);
  }
  const base = JSON.parse(firmar(payload('SYNC_REQUEST', pareja), claves.PARENT.privateKey).toString());
  for (const alteracion of [{ purpose: 'AUTH' }, { purpose: 'PAIR' }, { purpose: 'OFFLINE' }, { v: 2 }, { publicKeyB64: env.PARENT_PUBLIC_KEY_B64 }]) {
    const cliente = await autenticar(servicio.url, pareja, 'PARENT', claves.PARENT.privateKey);
    cliente.enviar(Buffer.from(JSON.stringify({ ...base, ...alteracion })));
    assert.deepEqual(await cliente.recibir(), { v: 1, kind: 'ERROR', code: 'BAD_SCHEMA' });
    assert.equal(await cliente.cerrado, 1008);
  }
});

test('R-LATIDO: PONG coincide con nonce, duplicado se ignora y no se reenvía al hijo', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const padre = await autenticar(servicio.url, pareja, 'PARENT', claves.PARENT.privateKey);
  const hijo = await autenticar(servicio.url, pareja, 'CHILD', claves.CHILD.privateKey);
  const nonce = randomBytes(32).toString('base64url');
  const ping = codecAuth.codificarFrame({ v: 1, kind: 'PING', nonce });
  padre.enviar(ping);
  assert.deepEqual(await padre.recibir(), { v: 1, kind: 'PONG', nonce });
  padre.enviar(ping);
  await assert.rejects(padre.recibir(100), /Timeout/);
  await assert.rejects(hijo.recibir(100), /Timeout/);
  const otro = randomBytes(32).toString('base64url');
  padre.enviar(codecAuth.codificarFrame({ v: 1, kind: 'PING', nonce: otro }));
  assert.deepEqual(await padre.recibir(), { v: 1, kind: 'PONG', nonce: otro });
});

test('R-LIMIT-02: exceso de mensajes cierra al emisor sin encolar', async (contexto) => {
  const { env, claves, pareja } = entornoAuth();
  const servicio = await iniciarAuth(env);
  contexto.after(servicio.detener);
  const padre = await autenticar(servicio.url, pareja, 'PARENT', claves.PARENT.privateKey);
  const frame = firmar(payload('SYNC_REQUEST', pareja), claves.PARENT.privateKey);
  for (let i = 0; i < 80; i++) padre.enviar(frame);
  const respuestas = [];
  while (true) {
    const respuesta = await padre.recibir();
    respuestas.push(respuesta);
    if (respuesta.kind === 'ERROR') { assert.equal(respuesta.code, 'RATE_LIMITED'); break; }
  }
  assert.ok(respuestas.length <= 25);
  assert.equal(await padre.cerrado, 1008);
});
