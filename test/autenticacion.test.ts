import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AutenticarConexion } from '../src/application/usecase/autenticar-conexion.usecase.js';
import { Configuracion } from '../src/domain/entities/configuracion.js';
import { IntentoAutenticacion } from '../src/domain/entities/intento-autenticacion.js';
import { PruebaAutenticacion } from '../src/domain/entities/prueba-autenticacion.js';
import { FalloAutenticacion, type CodigoAutenticacion } from '../src/domain/entities/fallo-autenticacion.js';
import { RetoAutenticacion } from '../src/domain/entities/reto-autenticacion.js';
import { RetosAutenticacionAdapter } from '../src/infrastructure/adapter/retos-autenticacion.adapter.js';
import { VerificacionAutenticacionAdapter } from '../src/infrastructure/adapter/verificacion-autenticacion.adapter.js';
import { EntropiaAdapter } from '../src/infrastructure/adapter/entropia.adapter.js';
import { AutenticacionMapper } from '../src/infrastructure/adapter/mapper/autenticacion.mapper.js';
import { CodecProtocolo } from '../src/infrastructure/adapter/protocol/codec-protocolo.js';
import { bytesFirma } from '../src/infrastructure/adapter/protocol/crypto-protocol.js';
import type { Rol, SobreFirmado, PruebaAutenticacion as PruebaDto } from '../src/application/dtos/protocolo.dto.js';

const codec = new CodecProtocolo(readFileSync(new URL('../compartido/protocolo.schema.json', import.meta.url)));
const fixture = JSON.parse(readFileSync(new URL('../pruebas/vectores_crypto.json', import.meta.url), 'utf8')) as {
  publicKeys: Record<Rol, string>;
  vectors: { payload: PruebaDto; envelope: SobreFirmado }[];
};
const pareja = fixture.vectors[0]!.payload.pairId;
const config = new Configuracion(10000, 'https://relay.example.com', pareja, fixture.publicKeys.PARENT, fixture.publicKeys.CHILD, 'test', 'error');
const rechaza = (accion: () => unknown, codigo: CodigoAutenticacion): void => {
  assert.throws(accion, (error: unknown) => error instanceof FalloAutenticacion && error.codigo === codigo);
};
function preparar(indice = 0) {
  const vector = fixture.vectors[indice]!;
  let ahora = 100;
  const retos = new RetosAutenticacionAdapter();
  const caso = new AutenticarConexion(pareja, retos, { ahora: () => ahora }, {
    identificador: () => vector.payload.connectionId, nonce: () => vector.payload.nonce,
  }, new VerificacionAutenticacionAdapter(codec, config));
  return { caso, retos, vector, avanzar: (valor: number) => { ahora = valor; } };
}

test('R-AUTH-01: ambos roles de fixtures autentican y consumen su reto una sola vez', () => {
  for (const indice of [0, 1]) {
    const { caso, retos, vector } = preparar(indice);
    const reto = caso.abrir();
    assert.equal(reto.timeoutSec, 10);
    assert.equal(reto.venceEn, 10100);
    const intento = new IntentoAutenticacion(reto.connectionId, codec.codificarFrame(vector.envelope));
    const resultado = caso.autenticar(intento);
    assert.equal(resultado.rol, vector.payload.role);
    assert.equal(resultado.pareja, pareja);
    assert.ok(Object.isFrozen(resultado));
    assert.equal(retos.consumir(reto.connectionId), undefined);
    rechaza(() => caso.autenticar(intento), 'STALE_NONCE');
    assert.equal(codec.leerFrame(Buffer.from(AutenticacionMapper.reto(reto).texto)).kind, 'CHALLENGE');
    assert.equal(codec.leerFrame(Buffer.from(AutenticacionMapper.aceptacion(resultado).texto)).kind, 'AUTH_OK');
  }
});

test('R-AUTH-02: prueba de un socket no autentica otro socket', () => {
  const { caso, retos, vector } = preparar();
  caso.abrir();
  const otroId = '00000000-0000-4000-8000-000000000099';
  retos.guardar(new RetoAutenticacion(otroId, vector.payload.nonce, 100));
  rechaza(() => caso.autenticar(new IntentoAutenticacion(otroId, codec.codificarFrame(vector.envelope))), 'STALE_NONCE');
  assert.equal(retos.consumir(otroId), undefined);
  assert.ok(retos.consumir(vector.payload.connectionId));
});

test('R-AUTH-03: caduca exactamente a diez segundos y no verifica firmas vencidas', () => {
  const { caso, retos, vector, avanzar } = preparar();
  caso.abrir();
  avanzar(10100);
  rechaza(() => caso.autenticar(new IntentoAutenticacion(vector.payload.connectionId, new Uint8Array())), 'STALE_NONCE');
  assert.equal(retos.consumir(vector.payload.connectionId), undefined);
});

test('R-AUTH-03: una verificación que cruza el plazo tampoco autentica', () => {
  let ahora = 0;
  const prueba = fixture.vectors[0]!.payload;
  const caso = new AutenticarConexion(pareja, new RetosAutenticacionAdapter(), { ahora: () => ahora }, {
    identificador: () => prueba.connectionId, nonce: () => prueba.nonce,
  }, { verificar: () => {
    ahora = 10000;
    return new PruebaAutenticacion(prueba.connectionId, prueba.nonce, pareja, 'PARENT');
  } });
  caso.abrir();
  rechaza(() => caso.autenticar(new IntentoAutenticacion(prueba.connectionId, new Uint8Array())), 'STALE_NONCE');
});

test('R-AUTH: cancelar desconexión invalida el reto y libera capacidad', () => {
  const { caso, vector } = preparar();
  const reto = caso.abrir();
  caso.cancelar(reto.connectionId);
  caso.cancelar(reto.connectionId);
  rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, codec.codificarFrame(vector.envelope))), 'STALE_NONCE');
  assert.ok(caso.abrir());
});

test('R-AUTH: el almacén limita a 16 retos y no sobrescribe una conexión existente', () => {
  const retos = new RetosAutenticacionAdapter();
  for (let indice = 0; indice < 16; indice++) assert.equal(retos.guardar(new RetoAutenticacion(String(indice), 'nonce-de-doble', 0)), true);
  assert.equal(retos.guardar(new RetoAutenticacion('extra', 'nonce-de-doble', 0)), false);
  retos.consumir('0');
  assert.equal(retos.guardar(new RetoAutenticacion('1', 'otro-nonce', 0)), false);
  assert.equal(retos.guardar(new RetoAutenticacion('extra', 'nonce-de-doble', 0)), true);
  assert.equal(retos.consumir('1')?.nonce, 'nonce-de-doble');
});

test('R-AUTH: fallo de firma consume el reto antes de cualquier segundo intento', () => {
  const { caso, retos, vector } = preparar();
  const reto = caso.abrir();
  const bytes = Buffer.from(codec.bytesPayload(vector.envelope));
  bytes[0] = 0;
  const falso = { ...vector.envelope, payloadB64: bytes.toString('base64url') };
  rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, codec.codificarFrame(falso))), 'BAD_SIGNATURE');
  assert.equal(retos.consumir(reto.connectionId), undefined);
  rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, codec.codificarFrame(vector.envelope))), 'STALE_NONCE');
});

test('R-AUTH: nonce y pareja incorrectos rechazan pruebas con firma válida', () => {
  const vector = fixture.vectors[0]!;
  for (const [par, nonce, codigo] of [[pareja, 'otro-nonce', 'STALE_NONCE'], ['otra-pareja', vector.payload.nonce, 'WRONG_PAIR']] as const) {
    const caso = new AutenticarConexion(par, new RetosAutenticacionAdapter(), { ahora: () => 0 }, {
      identificador: () => vector.payload.connectionId, nonce: () => nonce,
    }, new VerificacionAutenticacionAdapter(codec, config));
    caso.abrir();
    rechaza(() => caso.autenticar(new IntentoAutenticacion(vector.payload.connectionId, codec.codificarFrame(vector.envelope))), codigo);
  }
});

test('R-AUTH: no admite claves propuestas ni propósito de aplicación antes de AUTH', () => {
  const verificacion = new VerificacionAutenticacionAdapter(codec, config);
  const vector = fixture.vectors[0]!;
  rechaza(() => verificacion.verificar(Buffer.from(JSON.stringify({ ...vector.envelope, publicKeyB64: fixture.publicKeys.PARENT }))), 'BAD_SCHEMA');
  rechaza(() => verificacion.verificar(codec.codificarFrame(fixture.vectors[2]!.envelope)), 'BAD_SCHEMA');
});

test('R-AUTH: una clave válida no puede reclamar el rol contrario', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const propia = publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
  const configuracion = new Configuracion(10000, 'https://relay.example.com', pareja, propia, fixture.publicKeys.CHILD, 'test', 'error');
  const payload = codec.codificarPayload({ ...fixture.vectors[0]!.payload, role: 'CHILD' });
  const sigB64 = sign('sha256', bytesFirma('AUTH', payload), { key: privateKey, dsaEncoding: 'der' }).toString('base64url');
  const frame = codec.codificarFrame({ v: 1, kind: 'SIGNED', purpose: 'AUTH', payloadB64: payload.toString('base64url'), sigB64 });
  rechaza(() => new VerificacionAutenticacionAdapter(codec, configuracion).verificar(frame), 'WRONG_ROLE');
});

test('R-AUTH: entrada binaria de dominio conserva copias independientes', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const intento = new IntentoAutenticacion('id-de-doble', bytes);
  bytes.fill(0);
  intento.bytes().fill(0);
  assert.deepEqual(intento.bytes(), new Uint8Array([1, 2, 3]));
});

test('R-AUTH: generador produce UUID v4 y nonce de 32 bytes distintos', () => {
  const entropia = new EntropiaAdapter();
  assert.match(entropia.identificador(), /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  const primero = entropia.nonce();
  assert.equal(Buffer.from(primero, 'base64url').length, 32);
  assert.equal(Buffer.from(primero, 'base64url').toString('base64url'), primero);
  assert.notEqual(primero, entropia.nonce());
});
