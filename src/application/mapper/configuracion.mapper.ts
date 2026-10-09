import { SolicitudConfiguracion } from '../../domain/entities/solicitud-configuracion.js';
import type { Configuracion } from '../../domain/entities/configuracion.js';
import type { ConfiguracionRequestDto, ConfiguracionResponseDto } from '../dtos/configuracion.dto.js';

export class ConfiguracionMapper {
  static aDominio(dto: ConfiguracionRequestDto): SolicitudConfiguracion {
    return new SolicitudConfiguracion({
      PORT: dto.PORT, PUBLIC_ORIGIN: dto.PUBLIC_ORIGIN, ACTIVE_PAIR_ID: dto.ACTIVE_PAIR_ID,
      PARENT_PUBLIC_KEY_B64: dto.PARENT_PUBLIC_KEY_B64, CHILD_PUBLIC_KEY_B64: dto.CHILD_PUBLIC_KEY_B64,
      NODE_ENV: dto.NODE_ENV, LOG_LEVEL: dto.LOG_LEVEL,
    });
  }
  static aResponse(configuracion: Configuracion): ConfiguracionResponseDto {
    return Object.freeze({
      puerto: configuracion.puerto, origen: configuracion.origen, pareja: configuracion.pareja,
      publicaPadre: configuracion.publicaPadre, publicaHijo: configuracion.publicaHijo,
      entorno: configuracion.entorno, nivelLog: configuracion.nivelLog,
    });
  }
}
