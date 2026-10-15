import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AutenticarConexion } from '../src/application/usecase/autenticar-conexion.usecase.js';
import { Configuracion } from '../src/domain/entities/configuracion.js';
import { FalloAutenticacion, type CodigoAutenticacion } from '../src/domain/entities/fallo-autenticacion.js';
import { IntentoAutenticacion } from '../src/domain/entities/intento-autenticacion.js';
import type { RetoAutenticacion } from '../src/domain/entities/reto-autenticacion.js';
import type { RolCp2 } from '../src/application/dtos/autenticacion-cp2.dto.js';
import { RetosAutenticacionAdapter } from '../src/infrastructure/adapter/retos-autenticacion.adapter.js';
import { VerificacionAutenticacionCp2Adapter } from '../src/infrastructure/adapter/verificacion-autenticacion-cp2.adapter.js';
import { AutenticacionCp2Mapper } from '../src/infrastructure/adapter/mapper/autenticacion-cp2.mapper.js';
import { CodecAutenticacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-autenticacion.js';
import { bytesFirmaAuthCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-autenticacion.js';
import { bytesFirma } from '../src/infrastructure/adapter/protocol/crypto-protocol.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';

const codec = new CodecAutenticacionCp2(readFileSync(new URL('../contrato-cp2/autenticacion.schema.json', import.meta.url)));
const claves = { PARENT: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }),
  CHILD: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }) };
const publica = (rol: RolCp2): string => claves[rol].publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
const pareja = randomUUID();
const config = new Configuracion(10000, 'https://relay.example', pareja, publica('PARENT'), publica('CHILD'), 'test', 'error');
const verificacion = new VerificacionAutenticacionCp2Adapter(codec, config);
const bytes = (valor: unknown): Buffer => Buffer.from(canonico(valor));
const rechaza = (accion: () => unknown, codigo: CodigoAutenticacion): void => {
  assert.throws(accion, (error: unknown) => error instanceof FalloAutenticacion && error.codigo === codigo);
};
function firmado(reto: RetoAutenticacion, rol: RolCp2 = 'PARENT', cambios: Record<string, unknown> = {}, v1 = false): Buffer {
  const payload = bytes({ v: 2, kind: 'AUTH_PROOF', protocol: 'cp.v2', pairId: pareja,
    role: rol, connectionId: reto.connectionId, nonce: reto.nonce, ...cambios });
  return bytes({ v: 2, kind: 'SIGNED', purpose: 'AUTH', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', v1 ? bytesFirma('AUTH', payload) : bytesFirmaAuthCp2(payload),
      { key: claves[rol].privateKey, dsaEncoding: 'der' }).toString('base64url') });
}
function preparar(maximo = 16, demora = 0) {
  let ahora = 100;
  let verificaciones = 0;
  const retos = new RetosAutenticacionAdapter(maximo);
  const caso = new AutenticarConexion(pareja, retos, { ahora: () => ahora }, {
    identificador: () => randomUUID(), nonce: () => randomBytes(32).toString('base64url'),
  }, { verificar: (frame) => {
    verificaciones++;
    const resultado = verificacion.verificar(frame);
    ahora += demora;
    return resultado;
  } });
  return { caso, avanzar: (valor: number) => { ahora = valor; }, verificaciones: () => verificaciones };
}

test('CP2-A02: firmas reales de ambos roles autentican una vez y producen frames v2', () => {
  for (const rol of ['PARENT', 'CHILD'] as const) {
    const { caso } = preparar();
    const reto = caso.abrir();
    const desafio = codec.leerFrame(Buffer.from(AutenticacionCp2Mapper.reto(reto).texto));
    assert.equal(desafio.kind, 'CHALLENGE');
    const intento = new IntentoAutenticacion(reto.connectionId, firmado(reto, rol));
    const conexion = caso.autenticar(intento);
    assert.equal(conexion.rol, rol);
    assert.equal(conexion.pareja, pareja);
    const aceptacion = codec.leerFrame(Buffer.from(AutenticacionCp2Mapper.aceptacion(conexion).texto));
    assert.equal(aceptacion.kind, 'AUTH_OK');
    assert.equal('protocol' in aceptacion && aceptacion.protocol, 'cp.v2');
    rechaza(() => caso.autenticar(intento), 'STALE_NONCE');
  }
});

test('CP2-A02: identidad de conexión procede del llamador, no del frame firmado', () => {
  const { caso } = preparar();
  const primero = caso.abrir();
  const segundo = caso.abrir();
  rechaza(() => caso.autenticar(new IntentoAutenticacion(segundo.connectionId, firmado(primero))), 'STALE_NONCE');
  rechaza(() => caso.autenticar(new IntentoAutenticacion(segundo.connectionId, firmado(segundo))), 'STALE_NONCE');
  assert.equal(caso.autenticar(new IntentoAutenticacion(primero.connectionId, firmado(primero))).connectionId, primero.connectionId);
});

test('CP2-A02: límite exacto de diez segundos antes y después de verificar firma', () => {
  for (const instante of [10099, 10100, 10101]) {
    const { caso, avanzar, verificaciones } = preparar();
    const reto = caso.abrir();
    avanzar(instante);
    const accion = () => caso.autenticar(new IntentoAutenticacion(reto.connectionId, firmado(reto)));
    if (instante < 10100) assert.ok(accion());
    else { rechaza(accion, 'STALE_NONCE'); assert.equal(verificaciones(), 0); }
  }
  const { caso } = preparar(16, 10000);
  const reto = caso.abrir();
  rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, firmado(reto))), 'STALE_NONCE');
});

test('CP2-A02: fallo de firma o sintaxis consume el reto, sin segundo intento', () => {
  for (const malformado of [false, true]) {
    const { caso } = preparar();
    const reto = caso.abrir();
    const frame = malformado ? Buffer.from('{}') : firmado(reto, 'PARENT', {}, true);
    rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, frame)), malformado ? 'BAD_SCHEMA' : 'BAD_SIGNATURE');
    rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, firmado(reto))), 'STALE_NONCE');
  }
});

test('CP2-A02: nonce y pareja erróneos con firma válida no autentican', () => {
  for (const [cambios, codigo] of [
    [{ nonce: randomBytes(32).toString('base64url') }, 'STALE_NONCE'],
    [{ pairId: randomUUID() }, 'WRONG_PAIR'],
  ] as const) {
    const { caso } = preparar();
    const reto = caso.abrir();
    rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, firmado(reto, 'PARENT', cambios))), codigo);
    rechaza(() => caso.autenticar(new IntentoAutenticacion(reto.connectionId, firmado(reto))), 'STALE_NONCE');
  }
});

test('CP2-A02: configuración pública fija impide suplantar rol o proponer claves', () => {
  const { caso } = preparar();
  const reto = caso.abrir();
  rechaza(() => verificacion.verificar(firmado(reto, 'PARENT', { role: 'CHILD' })), 'WRONG_ROLE');
  const frame = JSON.parse(firmado(reto).toString()) as Record<string, unknown>;
  rechaza(() => verificacion.verificar(bytes({ ...frame, publicKeyB64: publica('PARENT') })), 'BAD_SCHEMA');
  const otra = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const payload = Buffer.from(frame.payloadB64 as string, 'base64url');
  frame.sigB64 = sign('sha256', bytesFirmaAuthCp2(payload), { key: otra.privateKey, dsaEncoding: 'der' }).toString('base64url');
  rechaza(() => verificacion.verificar(bytes(frame)), 'BAD_SIGNATURE');
});

test('CP2-A02: desconexión cancela, libera capacidad y rechaza prueba de conexión anterior', () => {
  const { caso } = preparar(1);
  const viejo = caso.abrir();
  rechaza(() => caso.abrir(), 'RATE_LIMITED');
  caso.cancelar(viejo.connectionId);
  caso.cancelar(viejo.connectionId);
  const nuevo = caso.abrir();
  rechaza(() => caso.autenticar(new IntentoAutenticacion(viejo.connectionId, firmado(viejo))), 'STALE_NONCE');
  assert.ok(caso.autenticar(new IntentoAutenticacion(nuevo.connectionId, firmado(nuevo))));
});

test('CP2-A02: instancias de retos separadas no comparten autoridad', () => {
  const anterior = preparar();
  const siguiente = preparar();
  const reto = anterior.caso.abrir();
  rechaza(() => siguiente.caso.autenticar(new IntentoAutenticacion(reto.connectionId, firmado(reto))), 'STALE_NONCE');
  assert.ok(anterior.caso.autenticar(new IntentoAutenticacion(reto.connectionId, firmado(reto))));
});
