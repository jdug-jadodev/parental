import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { PruebaAutenticacionCp2, RolCp2 } from '../src/application/dtos/autenticacion-cp2.dto.js';
import { CodecAutenticacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-autenticacion.js';
import { bytesFirmaAuthCp2, CriptografiaAutenticacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-autenticacion.js';
import { bytesFirmaPairCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-vinculacion.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';
import { bytesFirma } from '../src/infrastructure/adapter/protocol/crypto-protocol.js';
import { CodecProtocolo } from '../src/infrastructure/adapter/protocol/codec-protocolo.js';

const codec = new CodecAutenticacionCp2(readFileSync(new URL('../contrato-cp2/autenticacion.schema.json', import.meta.url)));
const crypto = new CriptografiaAutenticacionCp2(codec);
const claves = { PARENT: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }),
  CHILD: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }) };
const uuid = '11111111-1111-4111-8111-111111111111';
const nonce = Buffer.alloc(32, 9).toString('base64url');
const bytes = (valor: unknown): Buffer => Buffer.from(canonico(valor));
const publica = (rol: RolCp2): string => claves[rol].publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
const prueba = (role: RolCp2): PruebaAutenticacionCp2 => ({ v: 2, kind: 'AUTH_PROOF', protocol: 'cp.v2', role,
  pairId: uuid, connectionId: uuid, nonce });
function firmado(role: RolCp2, payload = bytes(prueba(role)), dominio = bytesFirmaAuthCp2(payload)): Buffer {
  return bytes({ kind: 'SIGNED', payloadB64: payload.toString('base64url'), purpose: 'AUTH', v: 2,
    sigB64: sign('sha256', dominio, { key: claves[role].privateKey, dsaEncoding: 'der' }).toString('base64url') });
}

test('CP/2 AUTH: ambos roles firman y conservan bytes originales', () => {
  for (const role of ['PARENT', 'CHILD'] as const) {
    const frame = firmado(role);
    const verificado = crypto.verificarPrueba(frame, publica(role), role);
    assert.equal(verificado.mensaje.role, role);
    assert.deepEqual(verificado.bytesPayload(), codec.codificarPrueba(prueba(role)));
    assert.deepEqual(verificado.bytesFrame(), frame);
  }
});

test('CP/2 AUTH: CHALLENGE, AUTH_OK y latidos tienen campos cerrados', () => {
  const reto = { v: 2, kind: 'CHALLENGE', connectionId: uuid, nonce, timeoutSec: 10 } as const;
  const aceptada = { v: 2, kind: 'AUTH_OK', protocol: 'cp.v2', connectionId: uuid } as const;
  for (const frame of [reto, aceptada, { v: 2, kind: 'PING', nonce } as const, { v: 2, kind: 'PONG', nonce } as const]) {
    assert.deepEqual(codec.codificarFrame(frame), bytes(frame));
  }
  for (const cambio of [{ timeoutSec: 9 }, { timeoutSec: 11 }, { v: 1 }, { nonce: nonce + '=' }, { extra: true }]) {
    assert.throws(() => codec.leerFrame(bytes({ ...reto, ...cambio })));
  }
  assert.throws(() => codec.leerFrame(bytes({ ...aceptada, protocol: 'cp.v1' })));
  assert.throws(() => codec.leerFrame(bytes({ ...aceptada, nonce })));
});

test('CP/2 AUTH: clave, rol, versión y propósito no se eligen desde el emisor', () => {
  assert.throws(() => crypto.verificarPrueba(firmado('PARENT'), publica('CHILD'), 'PARENT'));
  assert.throws(() => crypto.verificarPrueba(firmado('PARENT'), publica('PARENT'), 'CHILD'));
  const payload = bytes(prueba('PARENT'));
  for (const dominio of [bytesFirma('AUTH', payload), bytesFirmaPairCp2(payload)]) {
    assert.throws(() => crypto.verificarPrueba(firmado('PARENT', payload, dominio), publica('PARENT'), 'PARENT'));
  }
  const frame = JSON.parse(firmado('PARENT').toString()) as Record<string, unknown>;
  for (const cambio of [{ v: 1 }, { purpose: 'MESSAGE' }, { purpose: 'PAIR' }, { publicKey: publica('PARENT') }]) {
    assert.throws(() => codec.leerFrame(bytes({ ...frame, ...cambio })));
  }
});

test('CP/2 AUTH: pruebas sin firma, otro perfil y campos faltantes no autentican', () => {
  assert.throws(() => codec.leerFrame(bytes(prueba('PARENT'))));
  assert.throws(() => crypto.verificarPrueba(bytes({ v: 2, kind: 'PING', nonce }), publica('PARENT'), 'PARENT'));
  for (const clave of Object.keys(prueba('PARENT'))) {
    const parcial: Record<string, unknown> = { ...prueba('PARENT') }; delete parcial[clave];
    assert.throws(() => codec.leerPruebaSinVerificar(bytes(parcial)));
  }
  for (const cambio of [{ role: 'OTRO' }, { protocol: 'cp.v1' }, { pairId: 'sin-pareja' },
    { nonce: nonce.slice(0, -1) + 'l' }, { algorithm: 'otro' }]) {
    assert.throws(() => codec.leerPruebaSinVerificar(bytes({ ...prueba('PARENT'), ...cambio })));
  }
});

test('CP/2 AUTH: sintaxis canónica, profundidad y límites antes de criptografía', () => {
  const payload = bytes(prueba('PARENT')).toString();
  for (const texto of [payload + '\n', JSON.stringify(prueba('PARENT')), payload.replace('"v":2', '"v":2,"v":2'),
    payload.replace('"v":2', '"v":2.0')]) {
    assert.throws(() => codec.leerPruebaSinVerificar(Buffer.from(texto)));
  }
  assert.throws(() => codec.leerFrame(Buffer.from([0xc0, 0x80])));
  assert.throws(() => codec.leerFrame(Buffer.from('['.repeat(7) + '0' + ']'.repeat(7))), /Profundidad/);
  assert.throws(() => codec.leerFrame(Buffer.alloc(16385)), /Tamaño/);
  assert.throws(() => codec.leerPruebaSinVerificar(Buffer.alloc(8193)), /Tamaño/);
  assert.throws(() => crypto.verificarPrueba(firmado('PARENT', Buffer.from(JSON.stringify(prueba('PARENT')))), publica('PARENT'), 'PARENT'));
});

test('CP/2 AUTH: modificar payload o firma y usar JOSE se rechaza', () => {
  const frame = JSON.parse(firmado('PARENT').toString()) as Record<string, unknown>;
  frame.payloadB64 = bytes({ ...prueba('PARENT'), nonce: Buffer.alloc(32, 1).toString('base64url') }).toString('base64url');
  assert.throws(() => crypto.verificarPrueba(bytes(frame), publica('PARENT'), 'PARENT'), /Firma/);
  frame.sigB64 = Buffer.alloc(64, 1).toString('base64url');
  assert.throws(() => codec.leerFrame(bytes(frame)), /DER/);
});

test('CP/2 AUTH: resultado aislado y firma no demuestra consumo del reto', () => {
  const frame = firmado('CHILD');
  const copia = Buffer.from(frame);
  const documento = crypto.verificarPrueba(frame, publica('CHILD'), 'CHILD');
  frame.fill(0); documento.bytesPayload().fill(0); documento.bytesFrame().fill(0);
  assert.deepEqual(documento.bytesFrame(), copia);
  assert.ok(Object.isFrozen(documento.mensaje));
  assert.deepEqual(crypto.verificarPrueba(copia, publica('CHILD'), 'CHILD').bytesPayload(), bytes(prueba('CHILD')));
});

test('CP/2 AUTH: codec CP/1 congelado rechaza transporte v2', () => {
  const antiguo = new CodecProtocolo(readFileSync(new URL('../compartido/protocolo.schema.json', import.meta.url)));
  assert.throws(() => antiguo.leerFrame(firmado('PARENT')));
  assert.throws(() => antiguo.leerFrame(bytes({ v: 2, kind: 'CHALLENGE', connectionId: uuid, nonce, timeoutSec: 10 })));
});
