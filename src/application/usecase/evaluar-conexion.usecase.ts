import { DecisionConexion } from '../../domain/entities/decision-conexion.js';
import type { SolicitudConexion } from '../../domain/entities/solicitud-conexion.js';
import type { EvaluarConexionEntrada } from '../../domain/ports/portin/evaluar-conexion.port.js';
import { esSolicitudConexionValida } from '../validations/conexion.validation.js';

export class EvaluarConexion implements EvaluarConexionEntrada {
  constructor(private readonly permitirAutenticacion = false) {}
  ejecutar(solicitud: SolicitudConexion): DecisionConexion {
    if (!esSolicitudConexionValida(solicitud)) return new DecisionConexion('SOLICITUD_INVALIDA');
    return new DecisionConexion(this.permitirAutenticacion ? 'AUTENTICACION_REQUERIDA' : 'NO_DISPONIBLE');
  }
}
