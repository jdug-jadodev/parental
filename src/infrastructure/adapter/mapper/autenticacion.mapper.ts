import { PruebaAutenticacion } from '../../../domain/entities/prueba-autenticacion.js';
import type { RetoAutenticacion } from '../../../domain/entities/reto-autenticacion.js';
import type { ConexionAutenticada } from '../../../domain/entities/conexion-autenticada.js';
import type { CodigoAutenticacion } from '../../../domain/entities/fallo-autenticacion.js';
import { PruebaAutenticacionEntity } from '../entities/prueba-autenticacion.entity.js';
import { FrameAutenticacionEntity } from '../entities/frame-autenticacion.entity.js';

export class AutenticacionMapper {
  static aDominio(entidad: PruebaAutenticacionEntity): PruebaAutenticacion {
    return new PruebaAutenticacion(entidad.connectionId, entidad.nonce, entidad.pairId, entidad.role);
  }
  static aEntidad(prueba: PruebaAutenticacion): PruebaAutenticacionEntity {
    return new PruebaAutenticacionEntity(prueba.connectionId, prueba.nonce, prueba.pareja, prueba.rol);
  }
  static reto(reto: RetoAutenticacion): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(JSON.stringify({
      v: 1, kind: 'CHALLENGE', connectionId: reto.connectionId, nonce: reto.nonce, timeoutSec: reto.timeoutSec,
    }));
  }
  static aceptacion(conexion: ConexionAutenticada): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(JSON.stringify({ v: 1, kind: 'AUTH_OK', connectionId: conexion.connectionId }));
  }
  static error(code: CodigoAutenticacion): FrameAutenticacionEntity {
    return new FrameAutenticacionEntity(JSON.stringify({ v: 1, kind: 'ERROR', code }));
  }
}
