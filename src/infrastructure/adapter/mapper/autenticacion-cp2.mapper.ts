import type { RetoAutenticacion } from '../../../domain/entities/reto-autenticacion.js';
import type { ConexionAutenticada } from '../../../domain/entities/conexion-autenticada.js';
import { FrameAutenticacionEntity } from '../entities/frame-autenticacion.entity.js';
import { canonico } from '../protocol/json-estricto.js';

export class AutenticacionCp2Mapper {
  static reto(reto: RetoAutenticacion): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(canonico({ v: 2, kind: 'CHALLENGE', connectionId: reto.connectionId,
      nonce: reto.nonce, timeoutSec: reto.timeoutSec }));
  }

  static aceptacion(conexion: ConexionAutenticada): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(canonico({ v: 2, kind: 'AUTH_OK', protocol: 'cp.v2', connectionId: conexion.connectionId }));
  }
}
