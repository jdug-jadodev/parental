import type { TipoConsulta } from './consulta-servicio.js';
import type { EstadoServicio } from './estado-servicio.js';

export class ResultadoConsulta {
  constructor(readonly tipo: TipoConsulta, readonly estado: EstadoServicio) { Object.freeze(this); }
}
