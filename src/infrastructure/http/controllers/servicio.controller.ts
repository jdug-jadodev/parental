import type { ConsultarServicioEntrada } from '../../../application/ports/input/consultar-servicio.js';
import type { ConsultaRequestDto, ConsultaResponseDto } from '../dtos/servicio.dto.js';
import { ServicioMapper } from '../mappers/servicio.mapper.js';

export class ServicioController {
  constructor(private readonly consultar: ConsultarServicioEntrada) {}
  manejar(request: ConsultaRequestDto): ConsultaResponseDto {
    return ServicioMapper.aResponse(this.consultar.ejecutar(ServicioMapper.aDominio(request)));
  }
}
