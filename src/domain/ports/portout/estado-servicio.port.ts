import type { EstadoServicio } from '../../entities/estado-servicio.js';

export interface EstadoServicioSalida {
  obtener(): EstadoServicio;
}
