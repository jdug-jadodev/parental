import { createServer, type Server } from 'node:http';
import type { ServicioController } from './controllers/servicio.controller.js';
import type { ConexionController } from '../websocket/controllers/conexion.controller.js';
import { UpgradeEntity, RechazoUpgradeEntity } from '../websocket/entities/upgrade.entity.js';
import { UpgradeMapper } from '../websocket/mappers/upgrade.mapper.js';

export function crearServidorHttp(servicio: ServicioController, conexion: ConexionController): Server {
  const servidor = createServer((solicitud, respuesta) => {
    respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');
    respuesta.setHeader('Cache-Control', 'no-store');
    try {
      const resultado = servicio.manejar({ metodo: solicitud.method ?? '', ruta: solicitud.url ?? '' });
      respuesta.writeHead(resultado.status);
      respuesta.end(JSON.stringify(resultado.body));
    } catch {
      respuesta.writeHead(500);
      respuesta.end(JSON.stringify({ error: 'Error interno' }));
    }
  });
  servidor.headersTimeout = 5000;
  servidor.requestTimeout = 10000;
  servidor.keepAliveTimeout = 2000;
  servidor.maxHeadersCount = 32;
  servidor.maxConnections = 16;
  servidor.on('upgrade', (solicitud, socket) => {
    const limite = setTimeout(() => socket.destroy(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
    socket.on('error', () => socket.destroy());
    try {
      const entidad = new UpgradeEntity(solicitud.method ?? '', solicitud.url ?? '', solicitud.headers);
      const resultado = conexion.manejar(UpgradeMapper.aRequest(entidad));
      socket.end(UpgradeMapper.deResponse(resultado).serializar());
    } catch { socket.end(new RechazoUpgradeEntity(500).serializar()); }
  });
  return servidor;
}
