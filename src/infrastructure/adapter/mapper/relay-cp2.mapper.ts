import { FrameAutenticacionEntity } from '../entities/frame-autenticacion.entity.js';
import { canonico } from '../protocol/json-estricto.js';

export class RelayCp2Mapper {
  static ausente(commandId: string | null): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(canonico({ v: 2, kind: 'PEER_UNAVAILABLE', reason: 'PEER_OFFLINE', refCommandId: commandId }));
  }
}
