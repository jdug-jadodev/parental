import { ResultadoConsulta } from '../../domain/entities/resultado-consulta.js';
import type { ConsultaServicio } from '../../domain/entities/consulta-servicio.js';
import type { ConsultarServicioEntrada } from '../../domain/ports/portin/consultar-servicio.port.js';
import type { EstadoServicioSalida } from '../../domain/ports/portout/estado-servicio.port.js';

export class ConsultarServicio implements ConsultarServicioEntrada {
  constructor(private readonly estado: EstadoServicioSalida) {}
  ejecutar(consulta: ConsultaServicio): ResultadoConsulta {
    return new ResultadoConsulta(consulta.tipo, this.estado.obtener());
  }
}
