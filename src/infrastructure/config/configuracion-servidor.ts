import type { ConfigurarServidorEntrada } from '../../domain/ports/portin/configurar-servidor.port.js';
import type { ConfiguracionRequestDto, ConfiguracionResponseDto } from '../../application/dtos/configuracion.dto.js';
import { ConfiguracionMapper } from '../../application/mapper/configuracion.mapper.js';

export const VARIABLES_PUBLICAS = [
  'PUBLIC_ORIGIN', 'ACTIVE_PAIR_ID', 'PARENT_PUBLIC_KEY_B64', 'CHILD_PUBLIC_KEY_B64',
] as const;

export class ConfiguracionServidor {
  constructor(private readonly configurar: ConfigurarServidorEntrada) {}
  leer(request: ConfiguracionRequestDto): ConfiguracionResponseDto {
    return ConfiguracionMapper.aResponse(this.configurar.ejecutar(ConfiguracionMapper.aDominio(request)));
  }
}
