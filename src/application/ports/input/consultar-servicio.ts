import type { ConsultaServicio, ResultadoConsulta } from '../../../domain/servicio.js';

export interface ConsultarServicioEntrada {
  ejecutar(consulta: ConsultaServicio): ResultadoConsulta;
}
