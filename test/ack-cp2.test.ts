import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { AckCp2 } from '../src/application/dtos/ack-cp2.dto.js';
import { CodecAckCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-ack.js';
import { CriptografiaAckCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-ack.js';
import { bytesFirmaMessageCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-ordenes.js';
import { bytesFirma } from '../src/infrastructure/adapter/protocol/crypto-protocol.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';

const codec = new CodecAckCp2(readFileSync(new URL('../contrato-cp2/ack.schema.json', import.meta.url)));
const crypto = new CriptografiaAckCp2(codec);
const hijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const padre = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = hijo.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
const base: AckCp2 = { v: 2, kind: 'ACK', sender: 'CHILD', pairId: randomUUID(), bootId: randomUUID(),
  childSessionId: randomUUID(), commandId: randomUUID(), seq: '1', commandPayloadSha256B64: randomBytes(32).toString('base64url'),
  acceptedRevision: '1', evaluatedRevision: '1', result: 'APPLIED', reason: 'OK', resultElapsedMs: '0' };
const bytes = (valor: unknown): Buffer => Buffer.from(canonico(valor));
function firmado(payload: Buffer, dominio = bytesFirmaMessageCp2(payload)): Buffer {
  return bytes({ v: 2, kind: 'SIGNED', purpose: 'MESSAGE', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', dominio, { key: hijo.privateKey, dsaEncoding: 'der' }).toString('base64url') });
}

test('CP2-K01: cinco resultados válidos con catorce campos y firma CHILD real', () => {
  assert.equal(Object.keys(base).length, 14);
  const casos: AckCp2[] = [base,
    { ...base, result: 'ACCEPTED_PENDING_ENFORCEMENT', resultElapsedMs: null },
    { ...base, result: 'ENFORCEMENT_FAILED', reason: 'ENFORCEMENT_ERROR' },
    { ...base, result: 'REJECTED', reason: 'STALE_REVISION', acceptedRevision: null, resultElapsedMs: null },
    { ...base, result: 'UNKNOWN_COMMAND', reason: 'UNKNOWN_COMMAND', acceptedRevision: null, resultElapsedMs: null }];
  for (const ack of casos) {
    const payload = codec.codificarAck(ack);
    const documento = crypto.verificar(firmado(payload), publica);
    assert.deepEqual({ ...documento.mensaje }, ack);
    assert.equal(documento.payloadSha256B64, createHash('sha256').update(payload).digest('base64url'));
  }
});

test('CP2-K01: resultado/reason/nulos no se intercambian para aparentar aplicación', () => {
  for (const cambio of [{ acceptedRevision: null }, { resultElapsedMs: null }, { reason: 'ENFORCEMENT_ERROR' },
    { result: 'ACCEPTED_PENDING_ENFORCEMENT' }, { result: 'ENFORCEMENT_FAILED' },
    { result: 'REJECTED', reason: 'OK', acceptedRevision: null, resultElapsedMs: null },
    { result: 'REJECTED', reason: 'UNKNOWN_COMMAND', acceptedRevision: null, resultElapsedMs: null },
    { result: 'UNKNOWN_COMMAND', reason: 'STALE_REVISION', acceptedRevision: null, resultElapsedMs: null }]) {
    assert.throws(() => codec.leerAckSinVerificar(bytes({ ...base, ...cambio })));
  }
});

test('CP2-K01: contadores64 exactos, revisión aceptada no posterior a evaluación', () => {
  assert.ok(codec.leerAckSinVerificar(bytes({ ...base, seq: '9223372036854775807', acceptedRevision: '9223372036854775807',
    evaluatedRevision: '9223372036854775807', resultElapsedMs: '9223372036854775807' })));
  for (const cambio of [{ seq: '0' }, { seq: 1 }, { acceptedRevision: '0' }, { acceptedRevision: '2' },
    { evaluatedRevision: '00' }, { evaluatedRevision: '9223372036854775808' }, { resultElapsedMs: '-1' },
    { resultElapsedMs: '9223372036854775808' }, { resultElapsedMs: 0 }]) {
    assert.throws(() => codec.leerAckSinVerificar(bytes({ ...base, ...cambio })));
  }
});

test('CP2-K01: ACK cerrado sin campos STATE, públicos arbitrarios ni sentido PARENT', () => {
  for (const clave of Object.keys(base)) {
    const parcial: Record<string, unknown> = { ...base }; delete parcial[clave];
    assert.throws(() => codec.leerAckSinVerificar(bytes(parcial)));
  }
  for (const cambio of [{ v: 1 }, { sender: 'PARENT' }, { mode: 'LOCKED' }, { remainingSec: 0 }, { source: 'REMOTE' },
    { reason: 'texto libre' }, { commandPayloadSha256B64: base.commandPayloadSha256B64 + '=' },
    { commandPayloadSha256B64: base.commandPayloadSha256B64.slice(0, -1) + 'B' }]) {
    assert.throws(() => codec.leerAckSinVerificar(bytes({ ...base, ...cambio })));
  }
});

test('CP2-K01: canonicalidad/UTF8/profundidad/límites y sobre obligatorio', () => {
  for (const texto of [JSON.stringify(base), canonico(base) + '\n', canonico(base).replace('"v":2', '"v":2,"v":2')]) {
    assert.throws(() => codec.leerAckSinVerificar(Buffer.from(texto)));
  }
  assert.throws(() => codec.leerAckSinVerificar(Buffer.from([0xc0, 0x80])));
  assert.throws(() => codec.leerAckSinVerificar(Buffer.alloc(8193)), /Tamaño/);
  assert.throws(() => codec.leerSobre(Buffer.alloc(16385)), /Tamaño/);
  assert.throws(() => codec.leerSobre(Buffer.from('['.repeat(7) + '0' + ']'.repeat(7))), /Profundidad/);
  assert.throws(() => codec.leerSobre(bytes(base)));
  assert.throws(() => crypto.verificar(firmado(Buffer.from(JSON.stringify(base))), publica));
});

test('CP2-K01: clave externa y MESSAGE separan rol/dominio, mutation y JOSE rechazados', () => {
  const payload = codec.codificarAck(base);
  assert.throws(() => crypto.verificar(firmado(payload), padre.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')));
  for (const dominio of [bytesFirma('MESSAGE', payload), Buffer.concat([Buffer.from('CPv2/AUTH\n'), payload])]) {
    assert.throws(() => crypto.verificar(firmado(payload, dominio), publica));
  }
  const sobre = JSON.parse(firmado(payload).toString()) as Record<string, unknown>;
  for (const cambio of [{ purpose: 'AUTH' }, { v: 1 }, { publicKeyB64: publica }, { sigB64: Buffer.alloc(64, 1).toString('base64url') }]) {
    assert.throws(() => codec.leerSobre(bytes({ ...sobre, ...cambio })));
  }
  sobre.payloadB64 = bytes({ ...base, seq: '2' }).toString('base64url');
  assert.throws(() => crypto.verificar(bytes(sobre), publica));
});

test('CP2-K01: resultado firmado conserva bytes, no correlaciona intención ni modo actual', () => {
  const frame = firmado(codec.codificarAck(base)); const original = Buffer.from(frame);
  const documento = crypto.verificar(frame, publica);
  frame.fill(0); documento.bytesFrame().fill(0); documento.bytesPayload().fill(0);
  assert.deepEqual(documento.bytesFrame(), original); assert.ok(Object.isFrozen(documento.mensaje));
  assert.deepEqual(crypto.verificar(original, publica).bytesPayload(), codec.codificarAck(base));
});
