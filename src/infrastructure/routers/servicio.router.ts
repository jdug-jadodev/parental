import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ServicioController } from '../controller/servicio.controller.js';
import type { ConsultaResponseDto } from '../../application/dtos/servicio.dto.js';

export class ServicioRouter {
  private readonly rutas: ReadonlyMap<string, () => ConsultaResponseDto>;
  constructor(controller: ServicioController) {
    this.rutas = new Map([
      ['/healthz', () => controller.health()],
      ['/keepalive', () => controller.keepalive()],
    ]);
  }
  manejar(solicitud: IncomingMessage, respuesta: ServerResponse): void {
    respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');
    respuesta.setHeader('Cache-Control', 'no-store');
    try {
      const resolver = solicitud.method === 'GET' ? this.rutas.get(solicitud.url ?? '') : undefined;
      if (!resolver) {
        respuesta.writeHead(404);
        respuesta.end(JSON.stringify({ error: 'Ruta no disponible' }));
        return;
      }
      const resultado = resolver();
      respuesta.writeHead(resultado.status);
      respuesta.end(JSON.stringify(resultado.body));
    } catch {
      respuesta.writeHead(500);
      respuesta.end(JSON.stringify({ error: 'Error interno' }));
    }
  }
}
