import type { EstadoServicioSalida } from '../../domain/ports/portout/estado-servicio.port.js';
import { EstadoServicio } from '../../domain/entities/estado-servicio.js';

export class EstadoRelayCp2Adapter implements EstadoServicioSalida {
  constructor(private readonly disponible: () => boolean) {}
  obtener(): EstadoServicio { return new EstadoServicio(this.disponible(), 2); }
}
