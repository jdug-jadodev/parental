import type { EvaluarConexionEntrada } from '../../../application/ports/input/evaluar-conexion.js';
import type { ConexionRequestDto, ConexionResponseDto } from '../dtos/conexion.dto.js';
import { ConexionMapper } from '../mappers/conexion.mapper.js';

export class ConexionController {
  constructor(private readonly evaluar: EvaluarConexionEntrada) {}
  manejar(request: ConexionRequestDto): ConexionResponseDto {
    return ConexionMapper.aResponse(this.evaluar.ejecutar(ConexionMapper.aDominio(request)));
  }
}
