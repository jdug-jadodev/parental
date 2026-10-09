import type { DecisionConexion } from '../../entities/decision-conexion.js';
import type { SolicitudConexion } from '../../entities/solicitud-conexion.js';

export interface EvaluarConexionEntrada {
  ejecutar(solicitud: SolicitudConexion): DecisionConexion;
}
