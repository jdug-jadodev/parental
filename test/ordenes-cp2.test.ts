import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { OrdenCp2, SolicitudSyncCp2 } from '../src/application/dtos/ordenes-cp2.dto.js';
import { CodecOrdenesCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-ordenes.js';
import { CriptografiaOrdenesCp2, bytesFirmaMessageCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-ordenes.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';
import { bytesFirma } from '../src/infrastructure/adapter/protocol/crypto-protocol.js';

const codec = new CodecOrdenesCp2(readFileSync(new URL('../contrato-cp2/ordenes.schema.json', import.meta.url)));
const crypto = new CriptografiaOrdenesCp2(codec);
const padre = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const hijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = padre.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
const sync: SolicitudSyncCp2 = { v: 2, kind: 'SYNC_REQUEST', pairId: randomUUID(), sender: 'PARENT',
  syncNonce: randomBytes(32).toString('base64url'), requestedAction: null };
const orden: OrdenCp2 = { v: 2, kind: 'SET_POLICY', sender: 'PARENT', pairId: sync.pairId,
  bootId: randomUUID(), childSessionId: randomUUID(), commandId: randomUUID(), seq: '1',
  expectedRevision: '0', commandNonce: randomBytes(32).toString('base64url'), action: 'LOCK', durationSec: null };
const bytes = (valor: unknown): Buffer => Buffer.from(canonico(valor));
function firmado(payload: Buffer, dominio = bytesFirmaMessageCp2(payload)): Buffer {
  return codec.codificarSobre({ v: 2, kind: 'SIGNED', purpose: 'MESSAGE', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', dominio, { key: padre.privateKey, dsaEncoding: 'der' }).toString('base64url') });
}

test('CP2-O01: consulta nula o acción explícita y tres órdenes cerradas verifican firma real', () => {
  assert.equal(Object.keys(sync).length, 6); assert.equal(Object.keys(orden).length, 12);
  for (const requestedAction of [null, 'LOCK', 'ALLOW', 'ALLOW_FOR'] as const) {
    const mensaje = { ...sync, requestedAction };
    assert.deepEqual({ ...crypto.verificar(firmado(codec.codificarMensaje(mensaje)), publica).mensaje }, mensaje);
  }
  for (const action of ['LOCK', 'ALLOW', 'ALLOW_FOR'] as const) {
    const mensaje = { ...orden, action, durationSec: action === 'ALLOW_FOR' ? 60 : null };
    assert.deepEqual({ ...crypto.verificar(firmado(codec.codificarMensaje(mensaje)), publica).mensaje }, mensaje);
  }
});

test('CP2-O01: duración sólo ALLOW_FOR, minutos enteros1..1440 sin valor implícito', () => {
  for (const durationSec of [60, 120, 86400]) assert.ok(codec.leerMensajeSinVerificar(bytes({ ...orden, action: 'ALLOW_FOR', durationSec })));
  for (const durationSec of [null, 0, 1, 59, 61, 86460, -60, 60.5, '60']) {
    assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...orden, action: 'ALLOW_FOR', durationSec })));
  }
  for (const action of ['LOCK', 'ALLOW']) assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...orden, action, durationSec: 60 })));
  assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...orden, action: 'LOCK_FOR' })));
});

test('CP2-O01: secuencia y revisión decimal64 sin pérdida, ceros iniciales u overflow', () => {
  assert.ok(codec.leerMensajeSinVerificar(bytes({ ...orden, seq: '9223372036854775807', expectedRevision: '9223372036854775807' })));
  for (const seq of ['0', '-1', '01', '1.0', '1e0', '9223372036854775808', '99999999999999999999', 1]) {
    assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...orden, seq })));
  }
  for (const expectedRevision of ['-1', '00', '9223372036854775808', 0]) {
    assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...orden, expectedRevision })));
  }
});

test('CP2-O01: todos los campos obligatorios, sin extensiones ni sentido CHILD', () => {
  for (const mensaje of [sync, orden]) {
    for (const clave of Object.keys(mensaje)) {
      const parcial: Record<string, unknown> = { ...mensaje }; delete parcial[clave];
      assert.throws(() => codec.leerMensajeSinVerificar(bytes(parcial)));
    }
    for (const extra of [{ v: 1 }, { sender: 'CHILD' }, { deferredAllowSec: null }, { extra: true }, { pairId: 'no-uuid' }]) {
      assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...mensaje, ...extra })));
    }
  }
  assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...sync, requestedAction: 'LOCK_FOR' })));
  assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...sync, syncNonce: sync.syncNonce + '=' })));
  assert.throws(() => codec.leerMensajeSinVerificar(bytes({ ...orden, commandNonce: orden.commandNonce.slice(0, -1) + 'B' })));
});

test('CP2-O01: bytes originales canónicos, límites y profundidad antes de parse', () => {
  for (const texto of [JSON.stringify(orden), canonico(orden) + '\n', canonico(orden).replace('"v":2', '"v":2,"v":2'),
    canonico(orden).replace('"v":2', '"v":2e0')]) {
    assert.throws(() => codec.leerMensajeSinVerificar(Buffer.from(texto)));
  }
  assert.throws(() => codec.leerMensajeSinVerificar(Buffer.from([0xc0, 0x80])));
  assert.throws(() => codec.leerMensajeSinVerificar(Buffer.alloc(8193)), /Tamaño/);
  assert.throws(() => codec.leerSobre(Buffer.alloc(16385)), /Tamaño/);
  assert.throws(() => codec.leerSobre(Buffer.from('['.repeat(7) + '0' + ']'.repeat(7))), /Profundidad/);
  assert.throws(() => codec.leerSobre(bytes(orden)));
  assert.throws(() => crypto.verificar(firmado(Buffer.from(JSON.stringify(orden))), publica));
});

test('CP2-O01: MESSAGE exige clave padre esperada y dominio propio, no v1/AUTH/PAIR', () => {
  const payload = codec.codificarMensaje(orden);
  for (const dominio of [bytesFirma('MESSAGE', payload), Buffer.concat([Buffer.from('CPv2/AUTH\n'), payload]),
    Buffer.concat([Buffer.from('CPv2/PAIR\n'), payload])]) assert.throws(() => crypto.verificar(firmado(payload, dominio), publica));
  assert.throws(() => crypto.verificar(firmado(payload), hijo.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')));
  const sobre = JSON.parse(firmado(payload).toString()) as Record<string, unknown>;
  for (const extra of [{ purpose: 'AUTH' }, { purpose: 'PAIR' }, { v: 1 }, { publicKeyB64: publica }, { sigB64: Buffer.alloc(64, 1).toString('base64url') }]) {
    assert.throws(() => codec.leerSobre(bytes({ ...sobre, ...extra })));
  }
});

test('CP2-O01: copia defensiva y firma no acreditan reto vivo, revisión o aplicación', () => {
  const frame = firmado(codec.codificarMensaje(orden)); const original = Buffer.from(frame);
  const mensaje = crypto.verificar(frame, publica);
  frame.fill(0); mensaje.bytesPayload().fill(0); mensaje.bytesFrame().fill(0);
  assert.deepEqual(mensaje.bytesFrame(), original);
  assert.ok(Object.isFrozen(mensaje.mensaje));
  assert.deepEqual(crypto.verificar(original, publica).bytesPayload(), codec.codificarMensaje(orden));
});
