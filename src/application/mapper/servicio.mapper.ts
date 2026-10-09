import { ConsultaServicio } from '../../domain/entities/consulta-servicio.js';
import type { ResultadoConsulta } from '../../domain/entities/resultado-consulta.js';
import type { ConsultaRequestDto, ConsultaResponseDto } from '../dtos/servicio.dto.js';

export class ServicioMapper {
  static aDominio(dto: ConsultaRequestDto): ConsultaServicio { return new ConsultaServicio(dto.tipo); }
  static aResponse(resultado: ResultadoConsulta): ConsultaResponseDto {
    if (resultado.tipo === 'KEEPALIVE') return { status: 200, body: { alive: true } };
    return {
      status: resultado.estado.operativo ? 200 : 503,
      body: { ok: resultado.estado.operativo, protocol: resultado.estado.protocolo },
    };
  }
}
