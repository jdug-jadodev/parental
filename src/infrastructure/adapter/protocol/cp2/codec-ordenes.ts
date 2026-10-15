import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import type { MensajePadreCp2, SobreOrdenCp2 } from '../../../../application/dtos/ordenes-cp2.dto.js';
import { base64, secuencia } from '../formatos.js';
import { canonico, exigir, utf8Estricto } from '../json-estricto.js';
import { documentoCp2 } from './documento-cp2.js';
import { firmaDerCp2, MAX_FRAME_CP2, MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';

export class CodecOrdenesCp2 {
  private readonly validar: ValidateFunction;

  constructor(esquema: Uint8Array) {
    this.validar = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, removeAdditional: false })
      .compile(JSON.parse(utf8Estricto(esquema)) as object);
  }

  leerSobre(bytes: Uint8Array): SobreOrdenCp2 {
    const objeto = documentoCp2(bytes, MAX_FRAME_CP2, this.validar);
    exigir(objeto.kind === 'SIGNED', 'Se esperaba sobre MESSAGE CP/2');
    base64(objeto.payloadB64 as string, MAX_PAYLOAD_CP2);
    firmaDerCp2(base64(objeto.sigB64 as string, 72));
    return Object.freeze(objeto) as unknown as SobreOrdenCp2;
  }

  leerMensajeSinVerificar(bytes: Uint8Array): MensajePadreCp2 {
    const objeto = documentoCp2(bytes, MAX_PAYLOAD_CP2, this.validar);
    exigir(objeto.kind === 'SET_POLICY' || objeto.kind === 'SYNC_REQUEST', 'Se esperaba mensaje PARENT CP/2');
    if (objeto.kind === 'SET_POLICY') {
      secuencia(objeto.seq as string);
      secuencia(objeto.expectedRevision as string, true);
      base64(objeto.commandNonce as string, 32, 32);
    } else base64(objeto.syncNonce as string, 32, 32);
    return Object.freeze(objeto) as unknown as MensajePadreCp2;
  }

  codificarMensaje(mensaje: MensajePadreCp2): Buffer {
    const bytes = Buffer.from(canonico(mensaje));
    this.leerMensajeSinVerificar(bytes);
    return bytes;
  }

  codificarSobre(sobre: SobreOrdenCp2): Buffer {
    const bytes = Buffer.from(canonico(sobre));
    this.leerSobre(bytes);
    return bytes;
  }
}
