import type { Configuracion, SolicitudConfiguracion } from '../../../domain/configuracion.js';

export interface ConfigurarServidorEntrada {
  ejecutar(solicitud: SolicitudConfiguracion): Configuracion;
}
