import type { EstadoServicio } from '../../../domain/servicio.js';

export interface EstadoServicioSalida {
  obtener(): EstadoServicio;
}
