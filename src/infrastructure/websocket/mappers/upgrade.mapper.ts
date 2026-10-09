import type { DecisionConexion, SolicitudConexion } from '../../../domain/conexion.js';
import { UpgradeEntity, RechazoUpgradeEntity } from '../entities/upgrade.entity.js';
import { ConexionMapper } from './conexion.mapper.js';
import type { ConexionRequestDto, ConexionResponseDto } from '../dtos/conexion.dto.js';

export class UpgradeMapper {
  static aRequest(entidad: UpgradeEntity): ConexionRequestDto {
    const texto = (valor: string | string[] | undefined): string | undefined =>
      Array.isArray(valor) ? valor.join(', ') : valor;
    return {
      metodo: entidad.method, ruta: entidad.url,
      origen: texto(entidad.headers.origin), subprotocolo: texto(entidad.headers['sec-websocket-protocol']),
    };
  }
  static aDominio(entidad: UpgradeEntity): SolicitudConexion {
    return ConexionMapper.aDominio(this.aRequest(entidad));
  }
  static aEntidad(solicitud: SolicitudConexion): UpgradeEntity {
    return new UpgradeEntity(solicitud.metodo, solicitud.ruta, {
      origin: solicitud.origen, 'sec-websocket-protocol': solicitud.subprotocolo,
    });
  }
  static aRechazo(decision: DecisionConexion): RechazoUpgradeEntity {
    return this.deResponse(ConexionMapper.aResponse(decision));
  }
  static deResponse(dto: ConexionResponseDto): RechazoUpgradeEntity {
    return new RechazoUpgradeEntity(dto.status);
  }
}
