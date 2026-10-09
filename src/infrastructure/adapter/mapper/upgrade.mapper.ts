import { SolicitudConexion } from '../../../domain/entities/solicitud-conexion.js';
import { DecisionConexion } from '../../../domain/entities/decision-conexion.js';
import { UpgradeEntity } from '../entities/upgrade.entity.js';
import { RechazoUpgradeEntity } from '../entities/rechazo-upgrade.entity.js';

export class UpgradeMapper {
  static aDominio(entidad: UpgradeEntity): SolicitudConexion {
    const texto = (valor: string | string[] | undefined): string | undefined =>
      Array.isArray(valor) ? valor.join(', ') : valor;
    return new SolicitudConexion(
      entidad.method, entidad.url, texto(entidad.headers.origin), texto(entidad.headers['sec-websocket-protocol']),
    );
  }
  static aEntidad(solicitud: SolicitudConexion): UpgradeEntity {
    return new UpgradeEntity(solicitud.metodo, solicitud.ruta, {
      origin: solicitud.origen, 'sec-websocket-protocol': solicitud.subprotocolo,
    });
  }
  static aRechazo(decision: DecisionConexion): RechazoUpgradeEntity {
    return new RechazoUpgradeEntity(decision.motivo === 'SOLICITUD_INVALIDA' ? 400 : 503);
  }
  static deRechazo(entidad: RechazoUpgradeEntity): DecisionConexion {
    if (entidad.status === 500) throw new Error('El error de transporte no es una decisión de dominio');
    return new DecisionConexion(entidad.status === 400 ? 'SOLICITUD_INVALIDA' : 'NO_DISPONIBLE');
  }
}
