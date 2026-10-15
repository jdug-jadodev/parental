import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import type { AceptacionVinculoCp2, OfertaHijoCp2, SobrePairCp2 } from '../../../../application/dtos/vinculacion-cp2.dto.js';
import { base64, firmaDer, origenHttps, publicaP256 } from '../formatos.js';
import { exigir, utf8Estricto, type ValorJson } from '../json-estricto.js';
import { documentoCp2 } from './documento-cp2.js';

export const MAX_FRAME_CP2 = 16384;
export const MAX_PAYLOAD_CP2 = 8192;
const ORDEN_P256 = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;

export function firmaDerCp2(bytes: Buffer): void {
  firmaDer(bytes);
  let posicion = 2;
  for (let indice = 0; indice < 2; indice++) {
    const longitud = bytes[posicion + 1]!;
    posicion += 2;
    const numero = BigInt('0x' + bytes.subarray(posicion, posicion + longitud).toString('hex'));
    exigir(numero > 0n && numero < ORDEN_P256, 'Entero de firma fuera de P-256');
    posicion += longitud;
  }
}

export class CodecVinculacionCp2 {
  private readonly validar: ValidateFunction;

  constructor(esquema: Uint8Array) {
    const ajv = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, removeAdditional: false });
    this.validar = ajv.compile(JSON.parse(utf8Estricto(esquema)) as object);
  }

  leerOferta(bytes: Uint8Array): OfertaHijoCp2 {
    const objeto = this.documento(bytes, MAX_PAYLOAD_CP2);
    exigir(objeto.kind === 'CHILD_OFFER', 'Se esperaba oferta CP/2');
    return Object.freeze(objeto) as unknown as OfertaHijoCp2;
  }

  leerSobrePair(bytes: Uint8Array): SobrePairCp2 {
    const objeto = this.documento(bytes, MAX_FRAME_CP2);
    exigir(objeto.kind === 'SIGNED', 'Se esperaba sobre PAIR CP/2');
    base64(objeto.payloadB64 as string, MAX_PAYLOAD_CP2);
    firmaDerCp2(base64(objeto.sigB64 as string, 72));
    return Object.freeze(objeto) as unknown as SobrePairCp2;
  }

  leerAceptacionSinVerificar(bytes: Uint8Array): AceptacionVinculoCp2 {
    const objeto = this.documento(bytes, MAX_PAYLOAD_CP2);
    exigir(objeto.kind === 'PAIR_ACCEPT', 'Se esperaba aceptación CP/2');
    Object.freeze(objeto.recoveryHashes);
    return Object.freeze(objeto) as unknown as AceptacionVinculoCp2;
  }

  private documento(bytes: Uint8Array, limite: number): Record<string, ValorJson> {
    const valor = documentoCp2(bytes, limite, this.validar);
    for (const nombre of ['childPublicKeyB64', 'parentPublicKeyB64']) {
      if (typeof valor[nombre] === 'string') publicaP256(base64(valor[nombre], 150));
    }
    if (typeof valor.enrollNonce === 'string') base64(valor.enrollNonce, 32, 32);
    if (typeof valor.relayOrigin === 'string') origenHttps(valor.relayOrigin);
    if (valor.recoveryHashes) {
      for (const hash of Object.values(valor.recoveryHashes as Record<string, string>)) base64(hash, 32, 32);
    }
    return valor;
  }
}
