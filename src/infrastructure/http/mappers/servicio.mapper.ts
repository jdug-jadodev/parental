import { ConsultaServicio, type ResultadoConsulta } from '../../../domain/servicio.js';
import type { ConsultaRequestDto, ConsultaResponseDto } from '../dtos/servicio.dto.js';

export class ServicioMapper {
  static aDominio(dto: ConsultaRequestDto): ConsultaServicio { return new ConsultaServicio(dto.metodo, dto.ruta); }
  static aResponse(resultado: ResultadoConsulta): ConsultaResponseDto {
    if (resultado.tipo === 'NO_ENCONTRADO') return { status: 404, body: { error: 'Ruta no disponible' } };
    return {
      status: resultado.estado.operativo ? 200 : 503,
      body: { ok: resultado.estado.operativo, protocol: resultado.estado.protocolo },
    };
  }
}
