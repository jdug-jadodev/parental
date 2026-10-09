import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ServicioController } from '../controller/servicio.controller.js';

export class ServicioRouter {
  constructor(private readonly controller: ServicioController) {}
  manejar(solicitud: IncomingMessage, respuesta: ServerResponse): void {
    respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');
    respuesta.setHeader('Cache-Control', 'no-store');
    try {
      const rutas = {
        '/healthz': () => this.controller.health(),
        '/keepalive': () => this.controller.keepalive(),
      };
      const ruta = solicitud.url;
      if (solicitud.method !== 'GET' || (ruta !== '/healthz' && ruta !== '/keepalive')) {
        respuesta.writeHead(404);
        respuesta.end(JSON.stringify({ error: 'Ruta no disponible' }));
        return;
      }
      const resultado = rutas[ruta]();
      respuesta.writeHead(resultado.status);
      respuesta.end(JSON.stringify(resultado.body));
    } catch {
      respuesta.writeHead(500);
      respuesta.end(JSON.stringify({ error: 'Error interno' }));
    }
  }
}
