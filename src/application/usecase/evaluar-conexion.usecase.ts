import { DecisionConexion } from '../../domain/entities/decision-conexion.js';
import type { SolicitudConexion } from '../../domain/entities/solicitud-conexion.js';
import type { EvaluarConexionEntrada } from '../../domain/ports/portin/evaluar-conexion.port.js';
import { esSolicitudConexionValida } from '../validations/conexion.validation.js';

export class EvaluarConexion implements EvaluarConexionEntrada {
  ejecutar(solicitud: SolicitudConexion): DecisionConexion {
    return new DecisionConexion(esSolicitudConexionValida(solicitud) ? 'NO_DISPONIBLE' : 'SOLICITUD_INVALIDA');
  }
}
