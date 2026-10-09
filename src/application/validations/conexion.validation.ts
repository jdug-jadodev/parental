import type { SolicitudConexion } from '../../domain/entities/solicitud-conexion.js';

export function esSolicitudConexionValida(solicitud: SolicitudConexion): boolean {
  return solicitud.metodo === 'GET' && solicitud.ruta === '/ws' &&
    solicitud.origen === undefined && solicitud.subprotocolo === 'cp.v1';
}
