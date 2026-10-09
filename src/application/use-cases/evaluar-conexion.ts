import { DecisionConexion, type SolicitudConexion } from '../../domain/conexion.js';
import type { EvaluarConexionEntrada } from '../ports/input/evaluar-conexion.js';

export class EvaluarConexion implements EvaluarConexionEntrada {
  ejecutar(solicitud: SolicitudConexion): DecisionConexion {
    return new DecisionConexion(solicitud.esValida() ? 'NO_DISPONIBLE' : 'SOLICITUD_INVALIDA');
  }
}
