import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import type { StateCp2 } from '../../../../application/dtos/state-cp2.dto.js';
import type { SobreOrdenCp2 } from '../../../../application/dtos/ordenes-cp2.dto.js';
import { base64 } from '../formatos.js';
import { canonico, exigir, utf8Estricto } from '../json-estricto.js';
import { documentoCp2 } from './documento-cp2.js';
import { firmaDerCp2, MAX_FRAME_CP2, MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';
import { validarCoherenciaState } from './coherencia-state.js';

export class CodecStateCp2 {
  private readonly validar: ValidateFunction;
  constructor(esquema: Uint8Array) {
    this.validar = new Ajv2020({ strict: true, allErrors: false }).compile(JSON.parse(utf8Estricto(esquema)) as object);
  }
  leerSobre(bytes: Uint8Array): SobreOrdenCp2 {
    const objeto = documentoCp2(bytes, MAX_FRAME_CP2, this.validar);
    exigir(objeto.kind === 'SIGNED', 'Se esperaba sobre STATE CP/2');
    base64(objeto.payloadB64 as string, MAX_PAYLOAD_CP2);
    firmaDerCp2(base64(objeto.sigB64 as string, 72));
    return Object.freeze(objeto) as unknown as SobreOrdenCp2;
  }
  leerStateSinVerificar(bytes: Uint8Array): StateCp2 {
    const objeto = documentoCp2(bytes, MAX_PAYLOAD_CP2, this.validar);
    exigir(objeto.kind === 'STATE', 'Se esperaba STATE CHILD CP/2');
    const state = objeto as unknown as StateCp2;
    validarCoherenciaState(state);
    for (const valor of [state.effective, state.lastRemote, state.commandChallenge]) if (valor) Object.freeze(valor);
    return Object.freeze(state);
  }
  codificarState(state: StateCp2): Buffer {
    const bytes = Buffer.from(canonico(state)); this.leerStateSinVerificar(bytes); return bytes;
  }
}
