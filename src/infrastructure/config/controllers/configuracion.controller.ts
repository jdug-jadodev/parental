import type { ConfigurarServidorEntrada } from '../../../application/ports/input/configurar-servidor.js';
import type { ConfiguracionRequestDto, ConfiguracionResponseDto } from '../dtos/configuracion.dto.js';
import { ConfiguracionMapper } from '../mappers/configuracion.mapper.js';

export class ConfiguracionController {
  constructor(private readonly configurar: ConfigurarServidorEntrada) {}
  manejar(request: ConfiguracionRequestDto): ConfiguracionResponseDto {
    return ConfiguracionMapper.aResponse(this.configurar.ejecutar(ConfiguracionMapper.aDominio(request)));
  }
}
