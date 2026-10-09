import { createServer, type Server } from 'node:http';
import type { WebSocketAdapter } from '../adapter/websocket.adapter.js';
import type { ServicioRouter } from '../routers/servicio.router.js';

const adaptadores = new WeakMap<Server, WebSocketAdapter>();

export function crearServidorHttp(router: ServicioRouter, websocket: WebSocketAdapter): Server {
  const servidor = createServer((solicitud, respuesta) => router.manejar(solicitud, respuesta));
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
