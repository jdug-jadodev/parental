import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { Socket } from 'node:net';
import { performance } from 'node:perf_hooks';
import WebSocket, { type RawData, type WebSocketServer } from 'ws';
import type { EvaluarConexionEntrada } from '../../domain/ports/portin/evaluar-conexion.port.js';
import type { AutenticarConexionEntrada } from '../../domain/ports/portin/autenticar-conexion.port.js';
import type { ProcesarMensajeEntrada } from '../../domain/ports/portin/procesar-mensaje.port.js';
import type { ConexionAutenticada, RolAutenticado } from '../../domain/entities/conexion-autenticada.js';
import type { RetoAutenticacion } from '../../domain/entities/reto-autenticacion.js';
import { IntentoAutenticacion } from '../../domain/entities/intento-autenticacion.js';
import { FalloAutenticacion } from '../../domain/entities/fallo-autenticacion.js';
import { Cupo } from '../../application/validations/cupo.validation.js';
import { UpgradeEntity } from './entities/upgrade.entity.js';
import { RechazoUpgradeEntity } from './entities/rechazo-upgrade.entity.js';
import { UpgradeMapper } from './mapper/upgrade.mapper.js';
import { AutenticacionCp2Mapper } from './mapper/autenticacion-cp2.mapper.js';
import { RelayCp2Mapper } from './mapper/relay-cp2.mapper.js';
import { CodecAutenticacionCp2 } from './protocol/cp2/codec-autenticacion.js';
import { LimiteUpgradesAdapter } from './limite-upgrades.js';
import { enviarAcotado } from './salida-websocket.js';

export class WebSocketAuthCp2Adapter {
  readonly maximoConexiones = 18;
  private readonly autenticados = new Map<RolAutenticado, WebSocket>();
  private deteniendo = false;

  constructor(
    private readonly evaluar: EvaluarConexionEntrada,
    private readonly autenticacion: AutenticarConexionEntrada,
    private readonly transporte: WebSocketServer,
    private readonly codec: CodecAutenticacionCp2,
    private readonly upgrades: LimiteUpgradesAdapter,
    private readonly procesar?: ProcesarMensajeEntrada,
  ) {}

  upgrade(solicitud: IncomingMessage, socket: Duplex, head: Buffer = Buffer.alloc(0)): void {
    const limite = setTimeout(() => socket.destroy(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
    socket.on('error', () => socket.destroy());
    try {
      if (this.deteniendo) { socket.end(new RechazoUpgradeEntity(503).serializar()); return; }
      if (!(socket instanceof Socket) || socket.remoteAddress !== '127.0.0.1') {
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); return;
      }
      if (solicitud.rawHeaders.length > 64 || this.evaluar.ejecutar(UpgradeMapper.aDominio(
        new UpgradeEntity(solicitud.method ?? '', solicitud.url ?? '', solicitud.headers),
      )).motivo !== 'AUTENTICACION_REQUERIDA') {
        socket.end(new RechazoUpgradeEntity(400).serializar()); return;
      }
      if (!this.upgrades.admitir(socket.remoteAddress, performance.now()) || this.transporte.clients.size >= 18) {
        socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); return;
      }
      const reto = this.autenticacion.abrir();
      const cancelar = (): void => this.autenticacion.cancelar(reto.connectionId);
      socket.once('close', cancelar);
      try {
        this.transporte.handleUpgrade(solicitud, socket, head, (cliente) => {
          clearTimeout(limite);
          socket.off('close', cancelar);
          this.conectar(cliente, reto);
        });
      } catch (error) { cancelar(); throw error; }
    } catch (error) {
      socket.end(error instanceof FalloAutenticacion && error.codigo === 'RATE_LIMITED'
        ? 'HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'
        : new RechazoUpgradeEntity(503).serializar());
    }
  }

  detener(): void {
    if (this.deteniendo) return;
    this.deteniendo = true;
    for (const socket of this.transporte.clients) this.cerrar(socket, 1012);
    this.transporte.close();
  }

  private conectar(socket: WebSocket, reto: RetoAutenticacion): void {
    let identidad: ConexionAutenticada | undefined;
    let rechazado = false;
    let ultimoNonce: string | undefined;
    let pongPendiente = false;
    const cupo = new Cupo(20, 10, performance.now());
    const controles = new Cupo(20, 10, performance.now());
    const rechazar = (codigo = 1008): void => {
      if (rechazado) return;
      rechazado = true;
      clearTimeout(limite);
      this.autenticacion.cancelar(reto.connectionId);
      this.cerrar(socket, codigo);
    };
    const limite = setTimeout(rechazar, Math.max(0, reto.venceEn - performance.now()));
    limite.unref();
    socket.on('error', () => socket.terminate());
    socket.once('close', () => {
      clearTimeout(limite);
      this.autenticacion.cancelar(reto.connectionId);
      if (identidad && this.autenticados.get(identidad.rol) === socket) this.autenticados.delete(identidad.rol);
    });
    socket.on('ping', (bytes: Buffer) => {
      if (rechazado || socket.readyState !== WebSocket.OPEN) return;
      if (!controles.admitir(performance.now()) || socket.bufferedAmount + bytes.length + 2 > 65536) { rechazar(); return; }
      socket.pong(bytes, false, (error) => { if (error) socket.terminate(); });
    });
    socket.on('pong', () => { if (!controles.admitir(performance.now())) rechazar(); });
    socket.on('message', (datos: RawData, binario: boolean) => {
      if (rechazado || socket.readyState !== WebSocket.OPEN) return;
      if (binario) { rechazar(1003); return; }
      try {
        const bytes = Array.isArray(datos) ? Buffer.concat(datos) : datos instanceof ArrayBuffer ? Buffer.from(datos) : datos;
        if (!identidad) {
          const conexion = this.autenticacion.autenticar(new IntentoAutenticacion(reto.connectionId, bytes));
          identidad = conexion;
          clearTimeout(limite);
          if (!enviarAcotado(socket, AutenticacionCp2Mapper.aceptacion(conexion).texto, () => rechazar())) { rechazar(); return; }
          const anterior = this.autenticados.get(conexion.rol);
          this.autenticados.set(conexion.rol, socket);
          if (anterior && anterior !== socket) this.cerrar(anterior, 1008);
          return;
        }
        if (!cupo.admitir(performance.now())) { rechazar(); return; }
        if (this.autenticados.get(identidad.rol) !== socket) { rechazar(); return; }
        let frame;
        try { frame = this.codec.leerFrame(bytes); }
        catch {
          if (!this.procesar) { rechazar(); return; }
          const mensaje = this.procesar.ejecutar(identidad, bytes);
          const destino = this.autenticados.get(identidad.rol === 'PARENT' ? 'CHILD' : 'PARENT');
          if (!destino || destino.readyState !== WebSocket.OPEN || !enviarAcotado(destino,
            Buffer.from(mensaje.bytes()).toString('utf8'), () => this.cerrar(destino, 1008))) {
            if (destino) this.cerrar(destino, 1008);
            if (!enviarAcotado(socket, RelayCp2Mapper.ausente(mensaje.commandId).texto, () => rechazar())) rechazar();
          }
          return;
        }
        if (frame.kind !== 'PING') { rechazar(); return; }
        if (pongPendiente || frame.nonce === ultimoNonce) return;
        pongPendiente = true;
        ultimoNonce = frame.nonce;
        const enviado = enviarAcotado(socket, this.codec.codificarFrame({ v: 2, kind: 'PONG', nonce: frame.nonce }),
          () => rechazar(), () => { pongPendiente = false; });
        if (!enviado) rechazar();
      } catch { rechazar(); }
    });
    enviarAcotado(socket, AutenticacionCp2Mapper.reto(reto).texto, () => rechazar());
  }

  private cerrar(socket: WebSocket, codigo: number): void {
    if (socket.readyState === WebSocket.CLOSED) return;
    socket.close(codigo);
    const limite = setTimeout(() => socket.terminate(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
  }
}
