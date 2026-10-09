import { createServer, type Server } from 'node:http';
import type { WebSocketAdapter } from '../adapter/websocket.adapter.js';
import type { ServicioRouter } from '../routers/servicio.router.js';

export function crearServidorHttp(router: ServicioRouter, websocket: WebSocketAdapter): Server {
  const servidor = createServer((solicitud, respuesta) => router.manejar(solicitud, respuesta));
  servidor.headersTimeout = 5000;
  servidor.requestTimeout = 10000;
  servidor.keepAliveTimeout = 2000;
  servidor.maxHeadersCount = 32;
  servidor.maxConnections = 16;
  servidor.on('upgrade', (solicitud, socket) => websocket.upgrade(solicitud, socket));
  return servidor;
}
