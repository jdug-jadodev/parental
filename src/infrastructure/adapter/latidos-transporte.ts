import { randomBytes } from 'node:crypto';

export interface SocketLatido {
  readonly readyState: number;
  ping(bytes: Uint8Array): void;
  terminate(): void;
}

export class LatidosTransporte {
  private readonly pendientes = new Map<SocketLatido, Buffer | null>();
  registrar(socket: SocketLatido): void { this.pendientes.set(socket, null); }
  eliminar(socket: SocketLatido): void { this.pendientes.delete(socket); }
  pong(socket: SocketLatido, bytes: Uint8Array): void {
    const nonce = this.pendientes.get(socket);
    if (nonce && nonce.equals(bytes)) this.pendientes.set(socket, null);
  }
  revisar(): void {
    for (const [socket, pendiente] of this.pendientes) {
      if (socket.readyState !== 1) { this.pendientes.delete(socket); continue; }
      if (pendiente) { this.pendientes.delete(socket); socket.terminate(); continue; }
      const nonce = randomBytes(16);
      this.pendientes.set(socket, nonce);
      try { socket.ping(nonce); } catch { this.pendientes.delete(socket); socket.terminate(); }
    }
  }
  get cantidad(): number { return this.pendientes.size; }
}
