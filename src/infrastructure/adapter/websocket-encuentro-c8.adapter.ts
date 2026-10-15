import type { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import type { Duplex } from 'node:stream';
import { performance } from 'node:perf_hooks';
import WebSocket, { type WebSocketServer } from 'ws';
import type { CoordinarEncuentroEntrada } from '../../domain/ports/portin/coordinar-encuentro.port.js';
import type { SalidaEncuentro } from '../../domain/entities/salida-encuentro.js';
import { EncuentroC8Mapper } from '../../application/mapper/encuentro-c8.mapper.js';
import { Cupo } from '../../application/validations/cupo.validation.js';
import { CodecEncuentroC8 } from './protocol/c8/codec-encuentro.js';
import { canonico } from './protocol/json-estricto.js';
import { LimiteUpgradesAdapter } from './limite-upgrades.js';
import { enviarAcotado } from './salida-websocket.js';

export class WebSocketEncuentroC8Adapter {
  readonly maximoConexiones = 18;
  private readonly sockets = new Map<string, WebSocket>();
  private readonly revision: ReturnType<typeof setInterval>;
  private deteniendo = false;

  constructor(private readonly coordinar: CoordinarEncuentroEntrada, private readonly codec: CodecEncuentroC8,
    private readonly transporte: WebSocketServer, private readonly upgrades: LimiteUpgradesAdapter,
    private readonly alcance: 'LOCAL' | 'RENDER' = 'LOCAL', private readonly limitePublico?: number) {
    if (alcance === 'RENDER' && (!Number.isFinite(limitePublico) || limitePublico! <= performance.now())) {
      throw new Error('C8 público requiere ventana finita vigente');
    }
    this.revision = setInterval(() => {
      if (this.limitePublico !== undefined && performance.now() >= this.limitePublico) this.detener();
      else this.emitir(this.coordinar.limpiar());
    }, 100);
    this.revision.unref();
  }

  upgrade(solicitud: IncomingMessage, socket: Duplex, head: Buffer = Buffer.alloc(0)): void {
    const limite = setTimeout(() => socket.destroy(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
    socket.on('error', () => socket.destroy());
    const rechazar = (codigo: number): void => { socket.end(`HTTP/1.1 ${codigo} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); };
    if (this.limitePublico !== undefined && performance.now() >= this.limitePublico) this.detener();
    if (this.deteniendo) { rechazar(503); return; }
    if (!(socket instanceof Socket) || this.alcance === 'LOCAL' && socket.remoteAddress !== '127.0.0.1') { rechazar(403); return; }
    if (solicitud.method !== 'GET' || solicitud.url !== '/pair' || solicitud.headers.origin !== undefined ||
      solicitud.headers['sec-websocket-protocol'] !== 'c8.v1' ||
      solicitud.rawHeaders.length > 64) { rechazar(400); return; }
    if (!this.upgrades.admitir(socket.remoteAddress, performance.now()) || this.transporte.clients.size >= 18) { rechazar(429); return; }
    try {
      this.transporte.handleUpgrade(solicitud, socket, head, (cliente) => {
        clearTimeout(limite);
        try { this.conectar(cliente); } catch { cliente.terminate(); }
      });
    } catch { rechazar(503); }
  }

  detener(): void {
    if (this.deteniendo) return;
    this.deteniendo = true;
    clearInterval(this.revision);
    for (const id of this.sockets.keys()) this.cerrar(id, 1012);
    this.coordinar.limpiar();
    this.transporte.close();
  }

  private conectar(socket: WebSocket): void {
    this.emitir(this.coordinar.limpiar());
    const reto = this.coordinar.abrir();
    const id = reto.conexion;
    this.sockets.set(id, socket);
    const cupo = new Cupo(20, 10, performance.now());
    const controles = new Cupo(20, 10, performance.now());
    socket.on('error', () => this.cerrar(id, 1008));
    socket.once('close', () => {
      if (this.sockets.get(id) === socket) {
        this.sockets.delete(id);
        this.emitir(this.coordinar.cerrar(id));
      }
    });
    socket.on('message', (data, binario) => {
      if (this.sockets.get(id) !== socket) return;
      if (binario || !cupo.admitir(performance.now())) { this.cerrar(id, 1008); return; }
      try {
        this.emitir(this.coordinar.limpiar());
        const bytes = Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
        this.emitir(this.coordinar.ejecutar(id, EncuentroC8Mapper.aDominio(this.codec.leer(bytes))));
      } catch { this.cerrar(id, 1008); }
    });
    socket.on('ping', (bytes) => {
      if (!controles.admitir(performance.now()) || socket.bufferedAmount + bytes.length + 2 > 65536) { this.cerrar(id, 1008); return; }
      try { socket.pong(bytes); } catch { this.cerrar(id, 1008); }
    });
    socket.on('pong', () => { if (!controles.admitir(performance.now())) this.cerrar(id, 1008); });
    this.emitir([reto]);
  }

  private emitir(salidas: readonly SalidaEncuentro[]): void {
    for (const evento of salidas) {
      const salida = EncuentroC8Mapper.aDto(evento);
      const socket = this.sockets.get(salida.connectionId);
      if (!socket) continue;
      if (!enviarAcotado(socket, canonico(salida.mensaje), () => this.cerrar(salida.connectionId, 1008))) {
        this.cerrar(salida.connectionId, 1008);
      }
      if (salida.cerrar) this.cerrar(salida.connectionId, this.deteniendo ? 1012 : 1000);
    }
  }

  private cerrar(id: string, codigo: number): void {
    const socket = this.sockets.get(id);
    this.sockets.delete(id);
    const salidas = this.coordinar.cerrar(id);
    if (socket) {
      try { socket.close(codigo); } catch { socket.terminate(); }
      const limite = setTimeout(() => socket.terminate(), 1000);
      limite.unref();
      socket.once('close', () => clearTimeout(limite));
    }
    this.emitir(salidas);
  }
}
