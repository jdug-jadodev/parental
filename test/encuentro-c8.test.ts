import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CoordinarEncuentroC8 } from '../src/application/usecase/coordinar-encuentro-c8.usecase.js';
import type { MensajeClienteC8, SalidaEncuentroC8 } from '../src/application/dtos/encuentro-c8.dto.js';
import { EntropiaEncuentroAdapter } from '../src/infrastructure/adapter/entropia-encuentro.adapter.js';
import { VerificacionEncuentroAdapter } from '../src/infrastructure/adapter/verificacion-encuentro.adapter.js';
import { CodecEncuentroC8 } from '../src/infrastructure/adapter/protocol/c8/codec-encuentro.js';
import { CodecVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-vinculacion.js';
import { CriptografiaVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-vinculacion.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';

const origen = 'https://relay.example';
const codec = new CodecEncuentroC8();
const pairCodec = new CodecVinculacionCp2(readFileSync(new URL('../contrato-cp2/vinculacion.schema.json', import.meta.url)));
const verificacion = new VerificacionEncuentroAdapter(codec, pairCodec, new CriptografiaVinculacionCp2(pairCodec));
const hijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const padre = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = (clave: typeof hijo): string => clave.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
const bytes = (valor: unknown): Buffer => Buffer.from(canonico(valor));
const b64 = (valor: unknown): string => bytes(valor).toString('base64url');
const uuid = '11111111-1111-4111-8111-111111111111';
const nonce = Buffer.alloc(32, 4).toString('base64url');
const oferta = { v: 2, kind: 'CHILD_OFFER', protocol: 'cp.v2', childPublicKeyB64: publica(hijo), enrollId: uuid, enrollNonce: nonce };
function autenticar(reto: SalidaEncuentroC8, rol: 'CHILD' | 'PARENT', clave = rol === 'CHILD' ? hijo : padre,
  dominio = 'C8v1/PROOF\n'): MensajeClienteC8 {
  assert.equal(reto.mensaje.kind, 'CHALLENGE');
  if (reto.mensaje.kind !== 'CHALLENGE') throw new Error('Falta reto');
  const payload = bytes({ v: 1, kind: 'PROOF', connectionId: reto.connectionId, nonceB64: reto.mensaje.nonceB64,
    publicKeyB64: publica(clave), relayOrigin: origen, role: rol });
  return { v: 1, kind: 'AUTH', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', Buffer.concat([Buffer.from(dominio), payload]), clave.privateKey).toString('base64url') };
}
function aceptar(cambios: object = {}, clave = padre): string {
  const payload = bytes({ v: 2, kind: 'PAIR_ACCEPT', protocol: 'cp.v2', pairId: uuid, enrollId: uuid, enrollNonce: nonce,
    childPublicKeyB64: publica(hijo), parentPublicKeyB64: publica(padre), relayOrigin: origen,
    recoveryHashes: { MAINTENANCE: nonce, RECOVER_PARENT: nonce, RETIRE: nonce }, ...cambios });
  return b64({ v: 2, kind: 'SIGNED', purpose: 'PAIR', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', Buffer.concat([Buffer.from('CPv2/PAIR\n'), payload]), clave.privateKey).toString('base64url') });
}
function entorno() {
  let ahora = 1000;
  const caso = new CoordinarEncuentroC8({ ahora: () => ahora }, new EntropiaEncuentroAdapter(), verificacion, origen);
  const abrir = (rol: 'CHILD' | 'PARENT'): string => {
    const reto = caso.abrir();
    assert.equal(caso.ejecutar(reto.connectionId, autenticar(reto, rol))[0]?.mensaje.kind, 'READY');
    return reto.connectionId;
  };
  const publicar = (id: string, ttlMs = 120000): string => {
    const respuesta = caso.ejecutar(id, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs })[0]!.mensaje;
    assert.equal(respuesta.kind, 'CODE');
    if (respuesta.kind !== 'CODE') throw new Error('Sin código');
    return respuesta.code;
  };
  return { caso, abrir, publicar, avanzar: (ms: number) => { ahora += ms; } };
}

test('C8: encuentro real firmado conserva oferta y PAIR originales, no confirma guardado', () => {
  const e = entorno();
  const child = e.abrir('CHILD'), parent = e.abrir('PARENT');
  const code = e.publicar(child);
  const entrega = e.caso.ejecutar(parent, { v: 1, kind: 'CLAIM', code });
  assert.deepEqual(entrega.map((s) => s.mensaje.kind), ['OFFER', 'CLAIMED']);
  assert.deepEqual(entrega[0]!.mensaje, { v: 1, kind: 'OFFER', offerB64: b64(oferta), remainingMs: 120000 });
  const pairB64 = aceptar();
  const resultado = e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64 });
  assert.deepEqual(resultado.map((s) => s.mensaje.kind), ['PAIR', 'SENT']);
  assert.deepEqual(resultado[0], { connectionId: child, mensaje: { v: 1, kind: 'PAIR', pairB64 }, cerrar: false });
  assert.throws(() => e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64 }));
});

test('C8: reto consumido, dominio separado y posesión no reutilizable entre sockets', () => {
  const e = entorno();
  const reto = e.caso.abrir(), otro = e.caso.abrir();
  const auth = autenticar(reto, 'CHILD');
  assert.throws(() => e.caso.ejecutar(otro.connectionId, auth));
  assert.throws(() => e.caso.ejecutar(otro.connectionId, autenticar(otro, 'CHILD')));
  e.caso.ejecutar(reto.connectionId, auth);
  assert.throws(() => e.caso.ejecutar(reto.connectionId, auth));
  const tercero = e.caso.abrir();
  assert.throws(() => e.caso.ejecutar(tercero.connectionId, autenticar(tercero, 'CHILD', hijo, 'CPv2/AUTH\n')));
});
