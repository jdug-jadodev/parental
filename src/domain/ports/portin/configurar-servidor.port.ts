import type { Configuracion } from '../../entities/configuracion.js';
import type { SolicitudConfiguracion } from '../../entities/solicitud-configuracion.js';

export interface ConfigurarServidorEntrada {
  ejecutar(solicitud: SolicitudConfiguracion): Configuracion;
}
