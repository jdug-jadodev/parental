import type { EstadoServicioSalida } from '../../domain/ports/portout/estado-servicio.port.js';
import { EstadoServicio } from '../../domain/entities/estado-servicio.js';

export class EstadoLocalAdapter implements EstadoServicioSalida {
  obtener(): EstadoServicio { return new EstadoServicio(false); }
}
