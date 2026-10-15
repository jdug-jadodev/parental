import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { CodecVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-vinculacion.js';
import { CriptografiaVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-vinculacion.js';
import { CodecAutenticacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-autenticacion.js';
import { CriptografiaAutenticacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-autenticacion.js';
import { verificarVectorCp2 } from './soporte/verificar-vector-cp2.js';

const esquema = readFileSync(new URL('../contrato-cp2/vinculacion.schema.json', import.meta.url));
const codecPair = new CodecVinculacionCp2(esquema);
const cryptoPair = new CriptografiaVinculacionCp2(codecPair);
const cryptoAuth = new CriptografiaAutenticacionCp2(new CodecAutenticacionCp2(
  readFileSync(new URL('../contrato-cp2/autenticacion.schema.json', import.meta.url))));
const script = fileURLToPath(new URL('../scripts/generar-vectores-cp2.mjs', import.meta.url));
function generar(): Record<string, string> {
  const resultado = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 15000 });
  assert.equal(resultado.error, undefined); assert.equal(resultado.status, 0); assert.equal(resultado.stderr, '');
  assert.doesNotMatch(resultado.stdout, /PRIVATE KEY|privateKey|privateSigning|masterCode|recoveryCode|-----BEGIN/);
  return JSON.parse(resultado.stdout) as Record<string, string>;
}

test('CP2-I01: generador público efímero verifica oferta, PAIR y AUTH de ambos roles en Node', () => {
  const vector = generar();
  assert.equal(vector.fixture, 'CP2_PUBLICO_EFIMERO_SIN_AUTORIDAD');
  assert.deepEqual(verificarVectorCp2(vector), { oferta: true, pair: true, firmasAuth: 2 });
  const oferta = codecPair.leerOferta(Buffer.from(vector.childOfferUtf8!));
  const aceptacion = cryptoPair.verificarAceptacion(Buffer.from(vector.pairFrameUtf8!), vector.parentPublicKeyB64!);
  assert.equal(aceptacion.payloadSha256B64, vector.pairPayloadSha256B64);
  assert.equal(aceptacion.mensaje.enrollNonce, oferta.enrollNonce);
  assert.equal(aceptacion.mensaje.enrollId, oferta.enrollId);
  assert.equal(aceptacion.mensaje.childPublicKeyB64, oferta.childPublicKeyB64);
  for (const rol of ['PARENT', 'CHILD'] as const) {
    const frame = vector[rol === 'PARENT' ? 'authParentFrameUtf8' : 'authChildFrameUtf8']!;
    const publica = vector[rol === 'PARENT' ? 'parentPublicKeyB64' : 'childPublicKeyB64']!;
    assert.equal(cryptoAuth.verificarPrueba(Buffer.from(frame), publica, rol).mensaje.pairId, aceptacion.mensaje.pairId);
  }
});

test('CP2-I01: PAIR_ACCEPT tiene diez campos normativos, no once', () => {
  const json = JSON.parse(esquema.toString()) as { $defs: { aceptacion: { required: string[]; properties: Record<string, unknown> } } };
  const nombres = ['v', 'kind', 'protocol', 'pairId', 'enrollId', 'enrollNonce', 'parentPublicKeyB64',
    'childPublicKeyB64', 'relayOrigin', 'recoveryHashes'].sort();
  assert.equal(nombres.length, 10);
  assert.deepEqual([...json.$defs.aceptacion.required].sort(), nombres);
  assert.deepEqual(Object.keys(json.$defs.aceptacion.properties).sort(), nombres);
  const vector = generar();
  const mensaje = cryptoPair.verificarAceptacion(Buffer.from(vector.pairFrameUtf8!), vector.parentPublicKeyB64!).mensaje;
  assert.deepEqual(Object.keys(mensaje).sort(), nombres);
});

test('CP2-I01: cada generación cambia claves y no permite autoridad cruzada', () => {
  const uno = generar(); const dos = generar();
  assert.notEqual(uno.parentPublicKeyB64, dos.parentPublicKeyB64);
  assert.notEqual(uno.childPublicKeyB64, dos.childPublicKeyB64);
  assert.notEqual(uno.childOfferUtf8, dos.childOfferUtf8);
  assert.throws(() => cryptoPair.verificarAceptacion(Buffer.from(uno.pairFrameUtf8!), dos.parentPublicKeyB64!));
  assert.throws(() => cryptoAuth.verificarPrueba(Buffer.from(uno.authParentFrameUtf8!), uno.childPublicKeyB64!, 'PARENT'));
  const { authParentFrameUtf8, authChildFrameUtf8, ...soloPair } = uno;
  assert.deepEqual(verificarVectorCp2(soloPair), { oferta: true, pair: true, firmasAuth: 0 });
  assert.throws(() => verificarVectorCp2({ ...soloPair, privateKey: 'no-permitida' }));
  assert.throws(() => verificarVectorCp2({ ...soloPair, authParentFrameUtf8 }));
  assert.throws(() => verificarVectorCp2({ ...dos, childOfferUtf8: uno.childOfferUtf8 }));
});
