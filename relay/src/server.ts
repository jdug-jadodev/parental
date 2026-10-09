import { createServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { leerConfiguracion, leerPuerto, VARIABLES_PUBLICAS } from './config.js';
import { upgradePermitido } from './transporte.js';
export { leerPuerto } from './config.js';

// Base C00 exclusivamente local. No hay eco WSS ni modo público sin autenticar.
export function crearServidorLocal(): Server {
  const servidor = createServer((solicitud, respuesta) => {
    respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');
    respuesta.setHeader('Cache-Control', 'no-store');
    if (solicitud.method === 'GET' && solicitud.url === '/healthz') {
      respuesta.writeHead(503);
      respuesta.end(JSON.stringify({ ok: false, protocol: 1 }));
      return;
    }
    respuesta.writeHead(404);
    respuesta.end(JSON.stringify({ error: 'Ruta no disponible' }));
  });
  servidor.headersTimeout = 5000;
  servidor.requestTimeout = 10000;
  servidor.keepAliveTimeout = 2000;
  servidor.maxHeadersCount = 32;
  servidor.maxConnections = 16;
  servidor.on('upgrade', (solicitud, socket) => {
    const estado = upgradePermitido(solicitud) ? '503 Service Unavailable' : '400 Bad Request';
    const limite = setTimeout(() => socket.destroy(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
    socket.end(`HTTP/1.1 ${estado}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  });
  return servidor;
}

function iniciar(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('C00 solo permite ejecución local. El relay público requiere R01–R03.');
  }
  // La base sin variables sigue disponible; una configuración parcial falla cerrada.
  if (VARIABLES_PUBLICAS.some((nombre) => process.env[nombre] !== undefined)) {
    leerConfiguracion(process.env);
  }
  const servidor = crearServidorLocal();
  servidor.on('error', () => {
    console.error('No se pudo iniciar el servidor local. Revisa el puerto.');
    process.exitCode = 1;
  });
  servidor.listen(leerPuerto(process.env.PORT), '127.0.0.1', () => {
    console.info('Base local iniciada; /healthz indica que CP/1 todavía no está operativo.');
  });
  const detener = (): void => {
    const limite = setTimeout(() => servidor.closeAllConnections(), 3000);
    limite.unref();
    servidor.close(() => clearTimeout(limite));
  };
  process.once('SIGTERM', detener);
  process.once('SIGINT', detener);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) iniciar();
