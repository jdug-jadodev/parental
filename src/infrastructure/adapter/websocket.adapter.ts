import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { Socket } from 'node:net';
import { performance } from 'node:perf_hooks';
import WebSocket, { type RawData, type WebSocketServer } from 'ws';
import type { EvaluarConexionEntrada } from '../../domain/ports/portin/evaluar-conexion.port.js';
import type { AutenticarConexionEntrada } from '../../domain/ports/portin/autenticar-conexion.port.js';
import type { RetoAutenticacion } from '../../domain/entities/reto-autenticacion.js';
import type { ConexionAutenticada, RolAutenticado } from '../../domain/entities/conexion-autenticada.js';
import { IntentoAutenticacion } from '../../domain/entities/intento-autenticacion.js';
import { FalloAutenticacion, type CodigoAutenticacion } from '../../domain/entities/fallo-autenticacion.js';
import { UpgradeEntity } from './entities/upgrade.entity.js';
import { RechazoUpgradeEntity } from './entities/rechazo-upgrade.entity.js';
import { UpgradeMapper } from './mapper/upgrade.mapper.js';
import { AutenticacionMapper } from './mapper/autenticacion.mapper.js';
import type { ProcesarMensajeEntrada } from '../../domain/ports/portin/procesar-mensaje.port.js';
import { FalloRelay } from '../../domain/entities/fallo-relay.js';
import { Cupo } from '../../application/validations/cupo.validation.js';
import { RelayMapper } from './mapper/relay.mapper.js';
import { LimiteUpgradesAdapter } from './limite-upgrades.js';
import { enviarAcotado } from './salida-websocket.js';
import { LatidosTransporte } from './latidos-transporte.js';

export class WebSocketAdapter {
  private readonly autenticados = new Map<RolAutenticado, WebSocket>();
  private deteniendo = false;
  private readonly latidos = new LatidosTransporte();
  private readonly revision: ReturnType<typeof setInterval> | undefined;
  constructor(
    private readonly evaluar: EvaluarConexionEntrada,
    private readonly autenticacion?: AutenticarConexionEntrada,
    private readonly transporte?: WebSocketServer,
    private readonly procesar?: ProcesarMensajeEntrada,
    private readonly upgrades?: LimiteUpgradesAdapter,
  ) {
    if (Boolean(autenticacion) !== Boolean(transporte)) throw new Error('Autenticación y transporte deben configurarse juntos');
    if (transporte) {
      this.revision = setInterval(() => this.latidos.revisar(), 30000);
      this.revision.unref();
    }
  }
  get maximoConexiones(): number { return this.transporte ? 18 : 16; }
  upgrade(solicitud: IncomingMessage, socket: Duplex, head: Buffer = Buffer.alloc(0)): void {
    const limite = setTimeout(() => socket.destroy(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
    socket.on('error', () => socket.destroy());
    try {
      if (solicitud.rawHeaders.length > 64) {
        socket.end(new RechazoUpgradeEntity(400).serializar());
        return;
      }
      if (this.upgrades && !this.upgrades.admitir(socket instanceof Socket ? socket.remoteAddress : undefined, performance.now())) {
        throw new FalloAutenticacion('RATE_LIMITED');
      }
      const entidad = new UpgradeEntity(solicitud.method ?? '', solicitud.url ?? '', solicitud.headers);
      const decision = this.evaluar.ejecutar(UpgradeMapper.aDominio(entidad));
      if (decision.motivo === 'AUTENTICACION_REQUERIDA' && this.autenticacion && this.transporte && !this.deteniendo) {
        if (!(socket instanceof Socket) || socket.remoteAddress !== '127.0.0.1') {
          socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
          return;
        }
        if (this.transporte.clients.size >= 18) throw new FalloAutenticacion('RATE_LIMITED');
        const reto = this.autenticacion.abrir();
        const cancelar = (): void => this.autenticacion?.cancelar(reto.connectionId);
        socket.once('close', cancelar);
        try {
          this.transporte.handleUpgrade(solicitud, socket, head, (cliente) => {
            clearTimeout(limite);
            socket.off('close', cancelar);
            this.conectar(cliente, reto);
          });
        } catch (error) { cancelar(); throw error; }
        return;
      }
      if (decision.motivo === 'AUTENTICACION_REQUERIDA') {
        socket.end(new RechazoUpgradeEntity(503).serializar());
        return;
      }
      socket.end(UpgradeMapper.aRechazo(decision).serializar());
    } catch (error) {
      if (error instanceof FalloAutenticacion && error.codigo === 'RATE_LIMITED') {
        socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      } else { socket.end(new RechazoUpgradeEntity(500).serializar()); }
    }
  }
  detener(): void {
    if (this.deteniendo) return;
    this.deteniendo = true;
    clearInterval(this.revision);
    for (const socket of this.transporte?.clients ?? []) this.cerrar(socket, 1012, 'Reinicio del servicio');
    this.transporte?.close();
  }
  private conectar(socket: WebSocket, reto: RetoAutenticacion): void {
    const connectionId = reto.connectionId;
    let identidad: ConexionAutenticada | undefined;
    let rechazado = false;
    const cupo = new Cupo(20, 10, performance.now());
    const controles = new Cupo(20, 10, performance.now());
    let pongPendiente = false;
    let ultimoNonce: string | undefined;
    const rechazar = (codigo: CodigoAutenticacion, cierre = 1008): void => {
      if (rechazado) return;
      rechazado = true;
      clearTimeout(limite);
      this.autenticacion?.cancelar(connectionId);
      if (socket.readyState === WebSocket.OPEN) socket.send(AutenticacionMapper.error(codigo).texto, (error) => { if (error) socket.terminate(); });
      this.cerrar(socket, cierre, 'Autenticación rechazada');
    };
    const limite = setTimeout(() => rechazar('STALE_NONCE'), Math.max(0, reto.venceEn - performance.now()));
    limite.unref();
    socket.on('error', () => socket.terminate());
    this.latidos.registrar(socket);
    const admitirControl = (): boolean => {
      if (rechazado || socket.readyState !== WebSocket.OPEN) return false;
      if (!controles.admitir(performance.now())) { rechazar('RATE_LIMITED'); return false; }
      return true;
    };
    socket.on('pong', (bytes: Buffer) => { if (admitirControl()) this.latidos.pong(socket, bytes); });
    socket.on('ping', (bytes: Buffer) => {
      if (!admitirControl()) return;
      if (socket.bufferedAmount + bytes.length + 2 > 65536) { this.cerrar(socket, 1008, 'Salida saturada'); return; }
      socket.pong(bytes, false, (error) => { if (error) socket.terminate(); });
    });
    socket.once('close', () => {
      this.latidos.eliminar(socket);
      clearTimeout(limite);
      this.autenticacion?.cancelar(connectionId);
      if (identidad && this.autenticados.get(identidad.rol) === socket) {
        this.autenticados.delete(identidad.rol);
        const otro = this.autenticados.get(identidad.rol === 'PARENT' ? 'CHILD' : 'PARENT');
        if (otro) this.enviar(otro, RelayMapper.presencia(identidad.rol, false).texto);
      }
    });
    socket.on('message', (datos: RawData, binario: boolean) => {
      if (rechazado || socket.readyState !== WebSocket.OPEN) return;
      if (binario) { rechazar('BAD_SCHEMA', 1003); return; }
      try {
        const bytes = Array.isArray(datos) ? Buffer.concat(datos) : datos instanceof ArrayBuffer ? Buffer.from(datos) : datos;
        if (identidad) {
          if (!cupo.admitir(performance.now())) throw new FalloRelay('RATE_LIMITED');
          if (!this.procesar) throw new FalloRelay('BAD_SCHEMA');
          const mensaje = this.procesar.ejecutar(identidad, bytes);
          if (mensaje.tipo === 'PING') {
            if (pongPendiente || mensaje.nonce === ultimoNonce) return;
            pongPendiente = true;
            ultimoNonce = mensaje.nonce!;
            const enviado = enviarAcotado(socket, RelayMapper.pong(mensaje.nonce!).texto, () => socket.terminate(), () => { pongPendiente = false; });
            if (!enviado) { pongPendiente = false; return; }
            return;
          }
          const receptor = this.autenticados.get(identidad.rol === 'PARENT' ? 'CHILD' : 'PARENT');
          const ausente = (): void => { this.enviar(socket, RelayMapper.ausente(mensaje.commandId).texto); };
          if (!receptor) { ausente(); return; }
          let notificado = false;
          const fallo = (): void => {
            this.cerrar(receptor, 1008, 'Receptor lento o no disponible');
            if (!notificado) { notificado = true; ausente(); }
          };
          if (!enviarAcotado(receptor, mensaje.bytes(), fallo) && !notificado) ausente();
          return;
        }
        const conexion = this.autenticacion!.autenticar(new IntentoAutenticacion(connectionId, bytes));
        identidad = conexion;
        clearTimeout(limite);
        socket.send(AutenticacionMapper.aceptacion(conexion).texto, (error) => { if (error) socket.terminate(); });
        const anterior = this.autenticados.get(conexion.rol);
        this.autenticados.set(conexion.rol, socket);
        if (anterior && anterior !== socket) this.cerrar(anterior, 1008, 'Conexión sustituida');
        const rolOtro = conexion.rol === 'PARENT' ? 'CHILD' : 'PARENT';
        const otro = this.autenticados.get(rolOtro);
        const online = otro?.readyState === WebSocket.OPEN;
        this.enviar(socket, RelayMapper.presencia(rolOtro, online).texto);
        if (online) this.enviar(otro, RelayMapper.presencia(conexion.rol, true).texto);
      } catch (error) {
        rechazar(error instanceof FalloAutenticacion || error instanceof FalloRelay ? error.codigo : 'KEY_UNAVAILABLE');
      }
    });
    socket.send(AutenticacionMapper.reto(reto).texto, (error) => { if (error) socket.terminate(); });
  }
  private enviar(socket: WebSocket, bytes: string): void {
    enviarAcotado(socket, bytes, () => this.cerrar(socket, 1008, 'Salida saturada'));
  }
  private cerrar(socket: WebSocket, codigo: number, motivo: string): void {
    if (socket.readyState === WebSocket.CLOSED) return;
    socket.close(codigo, motivo);
    const limite = setTimeout(() => socket.terminate(), 1000);
    limite.unref();
    socket.once('close', () => clearTimeout(limite));
  }
}
