import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import type { AckCp2 } from '../../../../application/dtos/ack-cp2.dto.js';
import type { SobreOrdenCp2 } from '../../../../application/dtos/ordenes-cp2.dto.js';
import { base64, secuencia } from '../formatos.js';
import { canonico, exigir, utf8Estricto } from '../json-estricto.js';
import { documentoCp2 } from './documento-cp2.js';
import { firmaDerCp2, MAX_FRAME_CP2, MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';

export class CodecAckCp2 {
  private readonly validar: ValidateFunction;
  constructor(esquema: Uint8Array) {
    this.validar = new Ajv2020({ strict: true, allErrors: false, coerceTypes: false, removeAdditional: false })
      .compile(JSON.parse(utf8Estricto(esquema)) as object);
  }

  leerSobre(bytes: Uint8Array): SobreOrdenCp2 {
    const objeto = documentoCp2(bytes, MAX_FRAME_CP2, this.validar);
    exigir(objeto.kind === 'SIGNED', 'Se esperaba sobre MESSAGE de ACK CP/2');
    base64(objeto.payloadB64 as string, MAX_PAYLOAD_CP2);
    firmaDerCp2(base64(objeto.sigB64 as string, 72));
    return Object.freeze(objeto) as unknown as SobreOrdenCp2;
  }

  leerAckSinVerificar(bytes: Uint8Array): AckCp2 {
    const objeto = documentoCp2(bytes, MAX_PAYLOAD_CP2, this.validar);
    exigir(objeto.kind === 'ACK', 'Se esperaba ACK CHILD CP/2');
    secuencia(objeto.seq as string);
    const revision = secuencia(objeto.evaluatedRevision as string, true);
    if (objeto.acceptedRevision !== null) {
      exigir(secuencia(objeto.acceptedRevision as string) <= revision, 'Revisión aceptada posterior a evaluación');
    }
    if (objeto.resultElapsedMs !== null) secuencia(objeto.resultElapsedMs as string, true);
    base64(objeto.commandPayloadSha256B64 as string, 32, 32);
    return Object.freeze(objeto) as unknown as AckCp2;
  }

  codificarAck(ack: AckCp2): Buffer {
    const bytes = Buffer.from(canonico(ack));
    this.leerAckSinVerificar(bytes);
    return bytes;
  }
}
