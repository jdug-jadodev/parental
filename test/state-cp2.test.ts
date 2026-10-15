import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { StateCp2 } from '../src/application/dtos/state-cp2.dto.js';
import { CodecStateCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-state.js';
import { CriptografiaStateCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-state.js';
import { bytesFirmaMessageCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-ordenes.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';

export const codecState = new CodecStateCp2(readFileSync(new URL('../contrato-cp2/state-piloto.schema.json', import.meta.url)));
const crypto = new CriptografiaStateCp2(codecState);
const claves = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = claves.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
const bytes = (valor: unknown): Buffer => Buffer.from(canonico(valor));
const base: StateCp2 = { v: 2, kind: 'STATE', sender: 'CHILD', pairId: randomUUID(), bootId: randomUUID(),
  childSessionId: randomUUID(), syncNonce: randomBytes(32).toString('base64url'), stateSeq: '1', sampledElapsedMs: '1000',
  controlRevision: '0', lastAcceptedSeq: '0', commandChallenge: null,
  effective: { mode: 'UNKNOWN', reason: 'BOOT_AUTH_REQUIRED', source: 'NONE', policyRevision: null, action: null,
    phase: 'NONE', acceptedElapsedMs: null, phaseStartedElapsedMs: null, deadlineElapsedMs: null, remainingSec: null, enforcement: 'UNKNOWN' },
  lastRemote: null, permittedTime: null, lastExpiry: null, networkValidated: null, channelHealthy: null,
  isDeviceOwner: null, lockTaskActive: null };
const reto = { nonce: randomBytes(32).toString('base64url'), action: 'LOCK' as const, revision: '0', issuedElapsedMs: '1000', expiresElapsedMs: '31000' };

test('CP2-S01: STATE piloto cerrado20campos con firma real e historia no disponible', () => {
  assert.equal(Object.keys(base).length, 20);
  const payload = codecState.codificarState(base);
  const frame = bytes({ v: 2, kind: 'SIGNED', purpose: 'MESSAGE', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', bytesFirmaMessageCp2(payload), claves.privateKey).toString('base64url') });
  const verificado = crypto.verificar(frame, publica);
  assert.equal(canonico(verificado.mensaje), canonico(base));
  assert.equal(verificado.mensaje.permittedTime, null);
  assert.ok(Object.isFrozen(verificado.mensaje.effective));
  verificado.bytesFrame().fill(0); assert.deepEqual(verificado.bytesFrame(), frame);
  assert.throws(() => crypto.verificar(frame, generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    .publicKey.export({ type: 'spki', format: 'der' }).toString('base64url')));
  for (const cambio of [{ sender: 'PARENT' }, { v: 1 }, { permittedTime: {} }, { history: [] }, { syncNonce: base.syncNonce + '=' }]) {
    assert.throws(() => codecState.leerStateSinVerificar(bytes({ ...base, ...cambio })));
  }
});

test('CP2-S01: reto30s coherente con revisión y snapshot, overflow no aceptado', () => {
  assert.ok(codecState.codificarState({ ...base, commandChallenge: reto }));
  for (const cambio of [{ revision: '1' }, { expiresElapsedMs: '31001' }, { issuedElapsedMs: '1001' },
    { expiresElapsedMs: '1000' }, { nonce: 'x'.repeat(43) }, { issuedElapsedMs: '9223372036854775808' }]) {
    assert.throws(() => codecState.codificarState({ ...base, commandChallenge: { ...reto, ...cambio } }));
  }
  assert.throws(() => codecState.codificarState({ ...base, sampledElapsedMs: '31000', commandChallenge: reto }));
});

test('CP2-S01: permiso temporal usa elapsed y ceil, caducidad y duración exactas', () => {
  const temporal: StateCp2 = { ...base, sampledElapsedMs: '1001', controlRevision: '1', effective: {
    mode: 'ALLOWED', reason: 'OK', source: 'REMOTE', policyRevision: '1', action: 'ALLOW_FOR', phase: 'PERMITTED',
    acceptedElapsedMs: '1000', phaseStartedElapsedMs: '1000', deadlineElapsedMs: '61000', remainingSec: 60, enforcement: 'VERIFIED' } };
  assert.ok(codecState.codificarState(temporal));
  assert.ok(codecState.codificarState({ ...temporal, sampledElapsedMs: '61000', effective: {
    ...temporal.effective, mode: 'LOCKED', reason: 'TIMER_EXPIRED', phase: 'EXPIRED', remainingSec: 0 } }));
  for (const cambio of [{ remainingSec: 59 }, { deadlineElapsedMs: '60999' }, { policyRevision: '2' },
    { phaseStartedElapsedMs: '999' }, { enforcement: 'PENDING' }, { mode: 'LOCKED' }]) {
    assert.throws(() => codecState.leerStateSinVerificar(bytes({ ...temporal, effective: { ...temporal.effective, ...cambio } })));
  }
});

test('CP2-S01: última remota es histórica, coherencia seq/revisión/resultado sin comparar otro boot', () => {
  const remota = { commandId: randomUUID(), seq: '1', payloadSha256B64: randomBytes(32).toString('base64url'),
    bootId: randomUUID(), childSessionId: randomUUID(), acceptedRevision: '1', result: 'APPLIED' as const,
    resultReason: 'OK' as const, resultElapsedMs: '999999' };
  const estado = { ...base, controlRevision: '1', lastAcceptedSeq: '1', lastRemote: remota };
  assert.ok(codecState.codificarState(estado));
  for (const cambio of [{ seq: '2' }, { acceptedRevision: '2' }, { resultReason: 'ENFORCEMENT_ERROR' },
    { resultElapsedMs: null }, { result: 'ACCEPTED_PENDING_ENFORCEMENT' }]) {
    assert.throws(() => codecState.leerStateSinVerificar(bytes({ ...estado, lastRemote: { ...remota, ...cambio } })));
  }
  assert.ok(codecState.codificarState({ ...estado, lastRemote: null }));
});

test('CP2-S01: sin decisión no permite inventar efecto, números ambiguos o canonicalidad', () => {
  for (const cambio of [{ stateSeq: '0' }, { controlRevision: '9223372036854775808' }, { sampledElapsedMs: 1000 },
    { effective: { ...base.effective, action: 'ALLOW' } }, { effective: { ...base.effective, mode: 'ALLOWED' } },
    { effective: { ...base.effective, mode: 'LOCKED' } }]) {
    assert.throws(() => codecState.leerStateSinVerificar(bytes({ ...base, ...cambio })));
  }
  for (const entrada of [Buffer.from(JSON.stringify(base)), Buffer.from(canonico(base) + '\n'), Buffer.from([0xc0, 0x80]), Buffer.alloc(8193)]) {
    assert.throws(() => codecState.leerStateSinVerificar(entrada));
  }
});
