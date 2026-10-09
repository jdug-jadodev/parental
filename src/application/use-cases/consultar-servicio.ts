import { ResultadoConsulta, type ConsultaServicio } from '../../domain/servicio.js';
import type { ConsultarServicioEntrada } from '../ports/input/consultar-servicio.js';
import type { EstadoServicioSalida } from '../ports/output/estado-servicio.js';

export class ConsultarServicio implements ConsultarServicioEntrada {
  constructor(private readonly estado: EstadoServicioSalida) {}
  ejecutar(consulta: ConsultaServicio): ResultadoConsulta {
    return new ResultadoConsulta(consulta.esSalud() ? 'SALUD' : 'NO_ENCONTRADO', this.estado.obtener());
  }
}
