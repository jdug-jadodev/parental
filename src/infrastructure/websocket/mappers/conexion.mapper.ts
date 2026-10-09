import { DecisionConexion, SolicitudConexion } from '../../../domain/conexion.js';
import type { ConexionRequestDto, ConexionResponseDto } from '../dtos/conexion.dto.js';

export class ConexionMapper {
  static aDominio(dto: ConexionRequestDto): SolicitudConexion {
    return new SolicitudConexion(dto.metodo, dto.ruta, dto.origen, dto.subprotocolo);
  }
  static aRequest(solicitud: SolicitudConexion): ConexionRequestDto {
    return { metodo: solicitud.metodo, ruta: solicitud.ruta, origen: solicitud.origen, subprotocolo: solicitud.subprotocolo };
  }
  static aResponse(decision: DecisionConexion): ConexionResponseDto {
    return { status: decision.motivo === 'SOLICITUD_INVALIDA' ? 400 : 503 };
  }
  static deResponse(dto: ConexionResponseDto): DecisionConexion {
    return new DecisionConexion(dto.status === 400 ? 'SOLICITUD_INVALIDA' : 'NO_DISPONIBLE');
  }
}
