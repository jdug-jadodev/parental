import type { DecisionConexion, SolicitudConexion } from '../../../domain/conexion.js';

export interface EvaluarConexionEntrada {
  ejecutar(solicitud: SolicitudConexion): DecisionConexion;
}
