import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import type { FrameAutenticacionCp2, PruebaAutenticacionCp2 } from '../../../../application/dtos/autenticacion-cp2.dto.js';
import { base64 } from '../formatos.js';
import { canonico, exigir, utf8Estricto } from '../json-estricto.js';
import { firmaDerCp2, MAX_FRAME_CP2, MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';
import { documentoCp2 } from './documento-cp2.js';

export class CodecAutenticacionCp2 {
  private readonly validar: ValidateFunction;

  constructor(esquema: Uint8Array) {
    const ajv = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, removeAdditional: false });
    this.validar = ajv.compile(JSON.parse(utf8Estricto(esquema)) as object);
  }

  leerFrame(bytes: Uint8Array): FrameAutenticacionCp2 {
    const objeto = documentoCp2(bytes, MAX_FRAME_CP2, this.validar);
    exigir(objeto.kind !== 'AUTH_PROOF', 'Prueba AUTH suelta no es frame CP/2');
    if (objeto.kind === 'SIGNED') {
      base64(objeto.payloadB64 as string, MAX_PAYLOAD_CP2);
      firmaDerCp2(base64(objeto.sigB64 as string, 72));
    } else if (typeof objeto.nonce === 'string') base64(objeto.nonce, 32, 32);
    return Object.freeze(objeto) as unknown as FrameAutenticacionCp2;
  }

  leerPruebaSinVerificar(bytes: Uint8Array): PruebaAutenticacionCp2 {
    const objeto = documentoCp2(bytes, MAX_PAYLOAD_CP2, this.validar);
    exigir(objeto.kind === 'AUTH_PROOF', 'Se esperaba payload AUTH_PROOF CP/2');
    base64(objeto.nonce as string, 32, 32);
    return Object.freeze(objeto) as unknown as PruebaAutenticacionCp2;
  }

  codificarFrame(frame: FrameAutenticacionCp2): Buffer {
    const bytes = Buffer.from(canonico(frame));
    this.leerFrame(bytes);
    return bytes;
  }

  codificarPrueba(prueba: PruebaAutenticacionCp2): Buffer {
    const bytes = Buffer.from(canonico(prueba));
    this.leerPruebaSinVerificar(bytes);
    return bytes;
  }
}
