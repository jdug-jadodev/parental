import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign, type KeyObject } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import WebSocket from 'ws';
import { crearServidorRelayCp2Local } from '../src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../src/infrastructure/config/servidor.config.js';
import { CriptografiaStateCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-state.js';
import { CodecStateCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-state.js';
import { bytesFirmaMessageCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-ordenes.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';
import { entornoAuth } from './soporte/cliente-auth.js';
import { codecAuthCp2, firmarAuthCp2 } from './soporte/cliente-auth-cp2.js';

class ClienteRelay {
  private readonly cola: Buffer[] = [];
  private readonly esperas: { aceptar: (bytes: Buffer) => void; fallar: (error: Error) => void }[] = [];
  readonly cerrado: Promise<number>;
  constructor(readonly socket: WebSocket) {
    this.cerrado = new Promise((resolver) => socket.once('close', (codigo) => {
      resolver(codigo);
      for (const espera of this.esperas.splice(0)) espera.fallar(new Error('Socket cerrado'));
    }));
    socket.on('error', () => socket.terminate());
    socket.on('message', (bytes: Buffer) => {
      const espera = this.esperas.shift();
      if (espera) espera.aceptar(Buffer.from(bytes)); else this.cola.push(Buffer.from(bytes));
    });
  }
  recibir(): Promise<Buffer> {
    const bytes = this.cola.shift(); if (bytes) return Promise.resolve(bytes);
    return new Promise((resolver, rechazar) => {
      const espera = { aceptar: (valor: Buffer): void => { clearTimeout(limite); resolver(valor); },
        fallar: (error: Error): void => { clearTimeout(limite); rechazar(error); } };
      const limite = setTimeout(() => { this.esperas.splice(this.esperas.indexOf(espera), 1); rechazar(new Error('Timeout relay')); }, 3000);
      this.esperas.push(espera);
    });
  }
  enviar(bytes: Buffer): void { this.socket.send(bytes, { binary: false }); }
}

const json = (valor: unknown): Buffer => Buffer.from(canonico(valor));
const firmado = (valor: unknown, privada: KeyObject): Buffer => {
  const payload = json(valor);
  return json({ v: 2, kind: 'SIGNED', purpose: 'MESSAGE', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', bytesFirmaMessageCp2(payload), privada).toString('base64url') });
};
async function iniciar() {
  const { env, claves, pareja } = entornoAuth();
  const servidor = crearServidorRelayCp2Local(env);
  servidor.listen(0, '127.0.0.1'); await once(servidor, 'listening');
  const url = `ws://127.0.0.1:${(servidor.address() as AddressInfo).port}/ws`;
  const autenticar = async (rol: 'PARENT' | 'CHILD'): Promise<ClienteRelay> => {
    const cliente = new ClienteRelay(new WebSocket(url, 'cp.v2'));
    await once(cliente.socket, 'open');
    const reto = codecAuthCp2.leerFrame(await cliente.recibir());
    assert.equal(reto.kind, 'CHALLENGE'); if (reto.kind !== 'CHALLENGE') throw new Error('Sin reto');
    cliente.enviar(firmarAuthCp2(reto, pareja, rol, claves[rol].privateKey));
    assert.equal(codecAuthCp2.leerFrame(await cliente.recibir()).kind, 'AUTH_OK'); return cliente;
  };
  return { env, claves, pareja, servidor, url, autenticar, detener: async (): Promise<void> => {
    const cierre = once(servidor, 'close'); cerrarServidorHttp(servidor); await cierre;
  } };
}

test('CP2-R01: recorrido firmado SYNC→STATE→LOCK→ACK conserva bytes originales', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  const padre = await s.autenticar('PARENT'); const hijo = await s.autenticar('CHILD');
  const nonce = randomBytes(32).toString('base64url'); const reto = randomBytes(32).toString('base64url');
  const boot = randomUUID(); const sesion = randomUUID();
  const sync = firmado({ v: 2, kind: 'SYNC_REQUEST', sender: 'PARENT', pairId: s.pareja, syncNonce: nonce, requestedAction: 'LOCK' }, s.claves.PARENT.privateKey);
  padre.enviar(sync); assert.deepEqual(await hijo.recibir(), sync);
  const state = firmado({ v: 2, kind: 'STATE', sender: 'CHILD', pairId: s.pareja, bootId: boot, childSessionId: sesion,
    syncNonce: nonce, stateSeq: '1', sampledElapsedMs: '1000', controlRevision: '0', lastAcceptedSeq: '0',
    commandChallenge: { nonce: reto, action: 'LOCK', revision: '0', issuedElapsedMs: '1000', expiresElapsedMs: '31000' },
    effective: { mode: 'UNKNOWN', reason: 'CONTROL_UNKNOWN', source: 'NONE', policyRevision: null, action: null, phase: 'NONE',
      acceptedElapsedMs: null, phaseStartedElapsedMs: null, deadlineElapsedMs: null, remainingSec: null, enforcement: 'UNKNOWN' },
    lastRemote: null, permittedTime: null, lastExpiry: null, networkValidated: true, channelHealthy: true, isDeviceOwner: true, lockTaskActive: null }, s.claves.CHILD.privateKey);
  hijo.enviar(state); assert.deepEqual(await padre.recibir(), state);
  const verificador = new CriptografiaStateCp2(new CodecStateCp2(readFileSync(new URL('../contrato-cp2/state-piloto.schema.json', import.meta.url))));
  assert.equal(verificador.verificar(state, s.claves.CHILD.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url')).mensaje.syncNonce, nonce);
  const id = randomUUID();
  const orden = firmado({ v: 2, kind: 'SET_POLICY', sender: 'PARENT', pairId: s.pareja, bootId: boot, childSessionId: sesion,
    commandId: id, seq: '1', expectedRevision: '0', commandNonce: reto, action: 'LOCK', durationSec: null }, s.claves.PARENT.privateKey);
  padre.enviar(orden); assert.deepEqual(await hijo.recibir(), orden);
  const sobre = JSON.parse(orden.toString()) as { payloadB64: string };
  const hash = createHash('sha256').update(Buffer.from(sobre.payloadB64, 'base64url')).digest('base64url');
  for (const [result, elapsed] of [['ACCEPTED_PENDING_ENFORCEMENT', null], ['APPLIED', '1100']] as const) {
    const ack = firmado({ v: 2, kind: 'ACK', sender: 'CHILD', pairId: s.pareja, bootId: boot, childSessionId: sesion,
      commandId: id, seq: '1', commandPayloadSha256B64: hash, acceptedRevision: '1', evaluatedRevision: '1', result, reason: 'OK', resultElapsedMs: elapsed }, s.claves.CHILD.privateKey);
    hijo.enviar(ack); assert.deepEqual(await padre.recibir(), ack);
  }
  padre.enviar(orden); assert.deepEqual(await hijo.recibir(), orden);
  const noncePing = randomBytes(32).toString('base64url');
  padre.enviar(codecAuthCp2.codificarFrame({ v: 2, kind: 'PING', nonce: noncePing }));
  assert.deepEqual({ ...codecAuthCp2.leerFrame(await padre.recibir()) }, { v: 2, kind: 'PONG', nonce: noncePing });
  const health = await fetch(s.url.replace('ws:', 'http:').replace('/ws', '/healthz')); assert.equal(health.status, 503);
});

test('CP2-R01: receptor ausente no conserva ni confirma órdenes', async (t) => {
  const s = await iniciar(); t.after(s.detener); const padre = await s.autenticar('PARENT');
  const sync = firmado({ v: 2, kind: 'SYNC_REQUEST', sender: 'PARENT', pairId: s.pareja,
    syncNonce: randomBytes(32).toString('base64url'), requestedAction: null }, s.claves.PARENT.privateKey);
  padre.enviar(sync);
  assert.deepEqual(JSON.parse((await padre.recibir()).toString()), { v: 2, kind: 'PEER_UNAVAILABLE', reason: 'PEER_OFFLINE', refCommandId: null });
  const hijo = await s.autenticar('CHILD');
  padre.enviar(sync); assert.deepEqual(await hijo.recibir(), sync);
});

test('CP2-R01: rol/pareja/clave/esquema incorrectos cierran sin reenvío', async (t) => {
  const s = await iniciar(); t.after(s.detener);
  const ajena = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const sync = { v: 2, kind: 'SYNC_REQUEST', sender: 'PARENT', pairId: s.pareja,
    syncNonce: randomBytes(32).toString('base64url'), requestedAction: null };
  for (const [rol, payload, privada] of [
    ['CHILD', sync, s.claves.PARENT.privateKey],
    ['PARENT', { ...sync, pairId: randomUUID() }, s.claves.PARENT.privateKey],
    ['PARENT', sync, ajena.privateKey],
    ['PARENT', { ...sync, extra: true }, s.claves.PARENT.privateKey],
  ] as const) {
    const cliente = await s.autenticar(rol); cliente.enviar(firmado(payload, privada)); assert.equal(await cliente.cerrado, 1008);
  }
});

test('CP2-R01: configuración inválida/producción/TLS incompleto siguen bloqueados', () => {
  assert.throws(() => crearServidorRelayCp2Local({}));
  const { env } = entornoAuth();
  assert.throws(() => crearServidorRelayCp2Local({ ...env, NODE_ENV: 'production' }), /local/);
  assert.throws(() => crearServidorRelayCp2Local(env, {}), /TLS/);
});
