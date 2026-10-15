import { DecisionConexion } from '../../domain/entities/decision-conexion.js';
import type { SolicitudConexion } from '../../domain/entities/solicitud-conexion.js';
import type { EvaluarConexionEntrada } from '../../domain/ports/portin/evaluar-conexion.port.js';

export class EvaluarConexionCp2 implements EvaluarConexionEntrada {
  ejecutar(solicitud: SolicitudConexion): DecisionConexion {
    const valida = solicitud.metodo === 'GET' && solicitud.ruta === '/ws' &&
      solicitud.origen === undefined && solicitud.subprotocolo === 'cp.v2';
    return new DecisionConexion(valida ? 'AUTENTICACION_REQUERIDA' : 'SOLICITUD_INVALIDA');
  }
}
