import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CodecVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-vinculacion.js';
import { bytesFirmaPairCp2, CriptografiaVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-vinculacion.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';
import { CodecProtocolo } from '../src/infrastructure/adapter/protocol/codec-protocolo.js';
import { bytesFirma } from '../src/infrastructure/adapter/protocol/crypto-protocol.js';

const esquema = readFileSync(new URL('../contrato-cp2/vinculacion.schema.json', import.meta.url));
const codec = new CodecVinculacionCp2(esquema);
const crypto = new CriptografiaVinculacionCp2(codec);
const padre = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const hijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = (clave: typeof padre.publicKey): string => clave.export({ format: 'der', type: 'spki' }).toString('base64url');
const padreB64 = publica(padre.publicKey);
const hijoB64 = publica(hijo.publicKey);
const uuid = '11111111-1111-4111-8111-111111111111';
const hash = Buffer.alloc(32, 7).toString('base64url');
const oferta = { v: 2, kind: 'CHILD_OFFER', protocol: 'cp.v2', childPublicKeyB64: hijoB64, enrollId: uuid, enrollNonce: hash };
const aceptacion = { v: 2, kind: 'PAIR_ACCEPT', protocol: 'cp.v2', pairId: uuid, enrollId: uuid,
  enrollNonce: hash, parentPublicKeyB64: padreB64, childPublicKeyB64: hijoB64, relayOrigin: 'https://relay.example:443',
  recoveryHashes: { MAINTENANCE: hash, RECOVER_PARENT: hash, RETIRE: hash } };
const bytes = (objeto: unknown): Buffer => Buffer.from(canonico(objeto));
function sobre(payload = bytes(aceptacion), dominio: Uint8Array = bytesFirmaPairCp2(payload)): Buffer {
  return bytes({ v: 2, kind: 'SIGNED', purpose: 'PAIR', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', dominio, { key: padre.privateKey, dsaEncoding: 'der' }).toString('base64url') });
}

test('CP/2 separado: oferta y aceptación cerradas con públicas P-256 reales', () => {
  assert.deepEqual({ ...codec.leerOferta(bytes(oferta)) }, oferta);
  const documento = crypto.verificarAceptacion(sobre(), padreB64);
  assert.equal(documento.mensaje.kind, 'PAIR_ACCEPT');
  assert.deepEqual(documento.bytesPayload(), bytes(aceptacion));
  assert.equal(documento.payloadSha256B64, createHash('sha256').update(bytes(aceptacion)).digest('base64url'));
});

test('CP/2: parser y verificación no acreditan oferta vigente, ceremonia ni consumo', () => {
  assert.equal(codec.leerAceptacionSinVerificar(bytes(aceptacion)).enrollNonce, hash);
  const frame = sobre();
  assert.deepEqual(crypto.verificarAceptacion(frame, padreB64).bytesFrame(), frame);
  assert.deepEqual(crypto.verificarAceptacion(frame, padreB64).bytesFrame(), frame);
});

test('CP/2: firma v1 o de otro propósito no autoriza PAIR', () => {
  const payload = bytes(aceptacion);
  for (const dominio of [bytesFirma('PAIR', payload), Buffer.concat([Buffer.from('CPv2/MESSAGE\n'), payload])]) {
    assert.throws(() => crypto.verificarAceptacion(sobre(payload, dominio), padreB64));
  }
  assert.throws(() => crypto.verificarAceptacion(sobre(), hijoB64));
});

test('CP/2: no obtiene autoridad de la pública incluida en el payload', () => {
  const payload = bytes({ ...aceptacion, parentPublicKeyB64: hijoB64 });
  assert.throws(() => crypto.verificarAceptacion(sobre(payload), padreB64));
  assert.throws(() => crypto.verificarAceptacion(sobre(payload), hijoB64));
});

test('CP/2: bytes recibidos y devueltos aislados de modificaciones externas', () => {
  const frame = sobre();
  const original = Buffer.from(frame);
  const documento = crypto.verificarAceptacion(frame, padreB64);
  frame.fill(0); documento.bytesFrame().fill(0); documento.bytesPayload().fill(0);
  assert.deepEqual(documento.bytesFrame(), original);
  assert.deepEqual(documento.bytesPayload(), bytes(aceptacion));
  assert.ok(Object.isFrozen(documento.mensaje.recoveryHashes));
});

test('CP/2: esquema no admite v1, otro perfil, claves extra o faltantes', () => {
  for (const cambio of [{ v: 1 }, { protocol: 'cp.v1' }, { pin: 'ficticio' }, { enrollId: 'no-uuid' },
    { enrollNonce: hash + '=' }, { enrollNonce: hash.slice(0, -1) + 'd' }]) {
    assert.throws(() => codec.leerOferta(bytes({ ...oferta, ...cambio })));
  }
  for (const clave of Object.keys(oferta)) {
    const parcial: Record<string, unknown> = { ...oferta }; delete parcial[clave];
    assert.throws(() => codec.leerOferta(bytes(parcial)));
  }
  for (const cambio of [{ recoveryHashes: { ...aceptacion.recoveryHashes, EXTRA: hash } },
    { recoveryHashes: { MAINTENANCE: hash } }, { recoveryHashes: null }]) {
    assert.throws(() => codec.leerAceptacionSinVerificar(bytes({ ...aceptacion, ...cambio })));
  }
});

test('CP/2: JSON canónico estricto en oferta, sobre y payload firmado', () => {
  const original = bytes(oferta).toString();
  for (const texto of [JSON.stringify(oferta), original + '\n', original.replace('"v":2', '"v":2,"v":2'),
    original.replace('"v":2', '"v":2e0'), original.replace('"v":2', '"v":-0'),
    original.replace('CHILD_OFFER', 'CHILD_\\u004fFFER')]) {
    assert.throws(() => codec.leerOferta(Buffer.from(texto)));
  }
  assert.throws(() => codec.leerOferta(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes(oferta)])));
  assert.throws(() => codec.leerOferta(Buffer.from([0xc0, 0x80])));
  assert.throws(() => codec.leerOferta(Buffer.from('['.repeat(7) + '0' + ']'.repeat(7))), /Profundidad/);
  assert.throws(() => crypto.verificarAceptacion(sobre(Buffer.from(JSON.stringify(aceptacion))), padreB64));
  assert.throws(() => codec.leerSobrePair(Buffer.concat([sobre(), Buffer.from('\n')])));
});

test('CP/2: origen HTTPS exacto y curva SPKI, no normalización silenciosa', () => {
  for (const relayOrigin of ['http://relay.example', 'https://relay.example/', 'https://relay.example:0',
    'https://relay.example:65536', 'https://usuario@relay.example', 'https://RELAY.example',
    'https://relay.example?dato=1', 'https://relay.example#fragmento']) {
    assert.throws(() => codec.leerAceptacionSinVerificar(bytes({ ...aceptacion, relayOrigin })));
  }
  const p384 = generateKeyPairSync('ec', { namedCurve: 'secp384r1' });
  assert.throws(() => codec.leerOferta(bytes({ ...oferta, childPublicKeyB64: publica(p384.publicKey) })));
  assert.throws(() => codec.leerOferta(bytes({ ...oferta, childPublicKeyB64: Buffer.alloc(91).toString('base64url') })));
});

test('CP/2: límites antes de crypto y propósitos no disponibles rechazados', () => {
  assert.throws(() => codec.leerOferta(Buffer.alloc(8193, 32)), /Tamaño/);
  assert.throws(() => codec.leerSobrePair(Buffer.alloc(16385, 32)), /Tamaño/);
  const frame = JSON.parse(sobre().toString()) as Record<string, unknown>;
  for (const cambio of [{ purpose: 'MESSAGE' }, { purpose: 'OFFLINE' }, { v: 1 },
    { payloadB64: Buffer.alloc(8193).toString('base64url') }, { sigB64: 'MAcCAQECAQEA' },
    { sigB64: Buffer.from('3026022100ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551020101', 'hex').toString('base64url') }]) {
    assert.throws(() => codec.leerSobrePair(bytes({ ...frame, ...cambio })));
  }
  const suelto = { ...aceptacion, kind: 'OFFLINE_RESPONSE' };
  assert.throws(() => codec.leerAceptacionSinVerificar(bytes(suelto)));
});

test('CP/1 congelado no acepta oferta o sobre CP/2', () => {
  const antiguo = new CodecProtocolo(readFileSync(new URL('../compartido/protocolo.schema.json', import.meta.url)));
  assert.throws(() => antiguo.leerOferta(bytes(oferta)));
  assert.throws(() => antiguo.leerFrame(sobre()));
});

test('CP/2: todos los campos PAIR son obligatorios y no admite secretos adicionales', () => {
  for (const clave of Object.keys(aceptacion)) {
    const parcial: Record<string, unknown> = { ...aceptacion }; delete parcial[clave];
    assert.throws(() => codec.leerAceptacionSinVerificar(bytes(parcial)));
  }
  const frame = JSON.parse(sobre().toString()) as Record<string, unknown>;
  for (const clave of Object.keys(frame)) {
    const parcial = { ...frame }; delete parcial[clave];
    assert.throws(() => codec.leerSobrePair(bytes(parcial)));
  }
  assert.throws(() => codec.leerAceptacionSinVerificar(bytes({ ...aceptacion, masterCode: 'ficticio' })));
  assert.throws(() => codec.leerSobrePair(bytes({ ...frame, protocol: 'cp.v2' })));
});

test('CP/2: modificar bytes firmados no conserva una firma válida', () => {
  const frame = JSON.parse(sobre().toString()) as Record<string, unknown>;
  frame.payloadB64 = bytes({ ...aceptacion, relayOrigin: 'https://otro.example' }).toString('base64url');
  assert.throws(() => crypto.verificarAceptacion(bytes(frame), padreB64), /Firma/);
  frame.sigB64 = Buffer.alloc(64, 1).toString('base64url');
  assert.throws(() => codec.leerSobrePair(bytes(frame)), /DER/);
});

test('CP/2: nonce y hashes de longitud correcta también exigen bits finales canónicos', () => {
  const invalida = { ...oferta, enrollNonce: hash.slice(0, -1) + 'd' };
  assert.throws(() => codec.leerOferta(bytes(invalida)), /canónico/);
  assert.throws(() => codec.leerAceptacionSinVerificar(bytes({ ...aceptacion,
    recoveryHashes: { ...aceptacion.recoveryHashes, RETIRE: hash.slice(0, -1) + 'd' } })), /canónico/);
});
