import type { ConsultarServicioEntrada } from '../../domain/ports/portin/consultar-servicio.port.js';
import type { ConsultaRequestDto, ConsultaResponseDto } from '../../application/dtos/servicio.dto.js';
import { ServicioMapper } from '../../application/mapper/servicio.mapper.js';

export class ServicioController {
  constructor(private readonly consultar: ConsultarServicioEntrada) {}
  health(): ConsultaResponseDto { return this.manejar({ tipo: 'SALUD' }); }
  keepalive(): ConsultaResponseDto { return this.manejar({ tipo: 'KEEPALIVE' }); }
  private manejar(request: ConsultaRequestDto): ConsultaResponseDto {
    return ServicioMapper.aResponse(this.consultar.ejecutar(ServicioMapper.aDominio(request)));
  }
}
