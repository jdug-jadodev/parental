import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { EvaluarConexionEntrada } from '../../domain/ports/portin/evaluar-conexion.port.js';
import { UpgradeEntity } from './entities/upgrade.entity.js';
import { RechazoUpgradeEntity } from './entities/rechazo-upgrade.entity.js';
import { UpgradeMapper } from './mapper/upgrade.mapper.js';

export class WebSocketAdapter {
  constructor(private readonly evaluar: EvaluarConexionEntrada) {}
  upgrade(solicitud: IncomingMessage, socket: Duplex): void {
    const limite = setTimeout(() => socket.destroy(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
    socket.on('error', () => socket.destroy());
    try {
      const entidad = new UpgradeEntity(solicitud.method ?? '', solicitud.url ?? '', solicitud.headers);
      const decision = this.evaluar.ejecutar(UpgradeMapper.aDominio(entidad));
      socket.end(UpgradeMapper.aRechazo(decision).serializar());
    } catch { socket.end(new RechazoUpgradeEntity(500).serializar()); }
  }
}
