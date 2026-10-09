import type { EstadoServicioSalida } from '../../application/ports/output/estado-servicio.js';
import { EstadoServicio } from '../../domain/servicio.js';

export class EstadoLocalAdapter implements EstadoServicioSalida {
  obtener(): EstadoServicio { return new EstadoServicio(false); }
}
