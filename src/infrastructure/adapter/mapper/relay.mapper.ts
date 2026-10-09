import type { RolAutenticado } from '../../../domain/entities/conexion-autenticada.js';
import type { CodigoRelay } from '../../../domain/entities/fallo-relay.js';
import { FrameAutenticacionEntity } from '../entities/frame-autenticacion.entity.js';
import { MensajeRelay } from '../../../domain/entities/mensaje-relay.js';
import type { MensajeVerificadoEntity } from '../entities/mensaje-verificado.entity.js';

export class RelayMapper {
  static mensaje(payload: MensajeVerificadoEntity, frame: Uint8Array): MensajeRelay {
    return new MensajeRelay(payload.kind, payload.pairId, payload.sender, null,
      payload.commandId, frame);
  }
  static latido(nonce: string, frame: Uint8Array): MensajeRelay {
    return new MensajeRelay('PING', null, null, nonce, null, frame);
  }
  static pong(nonce: string): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(JSON.stringify({ v: 1, kind: 'PONG', nonce }));
  }
  static ausente(commandId: string | null): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(JSON.stringify({ v: 1, kind: 'PEER_UNAVAILABLE', reason: 'PEER_OFFLINE', refCommandId: commandId }));
  }
  static presencia(rol: RolAutenticado, online: boolean): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(JSON.stringify({ v: 1, kind: 'PEER_STATUS', peerRole: rol, online }));
  }
  static error(code: CodigoRelay): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(JSON.stringify({ v: 1, kind: 'ERROR', code }));
  }
}
