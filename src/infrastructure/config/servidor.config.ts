import { createServer, type Server, type RequestListener } from 'node:http';
import { createServer as crearHttps, type ServerOptions } from 'node:https';
import type { WebSocketAdapter } from '../adapter/websocket.adapter.js';
import type { ServicioRouter } from '../routers/servicio.router.js';

type AdaptadorWebSocket = Pick<WebSocketAdapter, 'upgrade' | 'detener' | 'maximoConexiones'>;
const adaptadores = new WeakMap<Server, AdaptadorWebSocket>();

export type TlsLocal = Pick<ServerOptions, 'key' | 'cert'>;

export function crearServidorHttp(router: ServicioRouter, websocket: AdaptadorWebSocket, tls?: TlsLocal): Server {
  if (tls && (!tls.key || !tls.cert)) throw new Error('TLS local requiere certificado y clave efímeros');
  const manejar: RequestListener = (solicitud, respuesta) => router.manejar(solicitud, respuesta);
  const servidor = tls ? crearHttps({ ...tls, minVersion: 'TLSv1.2' }, manejar) : createServer(manejar);
  servidor.headersTimeout = 5000;
  servidor.requestTimeout = 10000;
  servidor.keepAliveTimeout = 2000;
  servidor.maxHeadersCount = 32;
  servidor.maxConnections = websocket.maximoConexiones;
  servidor.on('upgrade', (solicitud, socket, head) => websocket.upgrade(solicitud, socket, head));
  adaptadores.set(servidor, websocket);
  servidor.once('close', () => { websocket.detener(); adaptadores.delete(servidor); });
  return servidor;
}

export function cerrarServidorHttp(servidor: Server): void {
  adaptadores.get(servidor)?.detener();
  const limite = setTimeout(() => servidor.closeAllConnections(), 3000);
  limite.unref();
  servidor.close(() => clearTimeout(limite));
}
