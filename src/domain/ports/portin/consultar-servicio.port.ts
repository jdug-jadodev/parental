import type { ConsultaServicio } from '../../entities/consulta-servicio.js';
import type { ResultadoConsulta } from '../../entities/resultado-consulta.js';

export interface ConsultarServicioEntrada {
  ejecutar(consulta: ConsultaServicio): ResultadoConsulta;
}
