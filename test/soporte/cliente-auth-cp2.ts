import { once } from 'node:events';
import { sign, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import type { FrameAutenticacionCp2, RetoConexionCp2, RolCp2 } from '../../src/application/dtos/autenticacion-cp2.dto.js';
import { CodecAutenticacionCp2 } from '../../src/infrastructure/adapter/protocol/cp2/codec-autenticacion.js';
import { bytesFirmaAuthCp2 } from '../../src/infrastructure/adapter/protocol/cp2/criptografia-autenticacion.js';
import { crearServidorAutenticacionCp2Local } from '../../src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../../src/infrastructure/config/servidor.config.js';

export const codecAuthCp2 = new CodecAutenticacionCp2(readFileSync(new URL('../../contrato-cp2/autenticacion.schema.json', import.meta.url)));
export async function iniciarAuthCp2(env: NodeJS.ProcessEnv) {
  const servidor = crearServidorAutenticacionCp2Local(env);
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const { port } = servidor.address() as AddressInfo;
  let cierre: Promise<void> | undefined;
  return { servidor, url: `ws://127.0.0.1:${port}/ws`, detener: () => cierre ??= (async () => {
    const cerrado = once(servidor, 'close'); cerrarServidorHttp(servidor); await cerrado;
  })() };
}
export function firmarAuthCp2(reto: RetoConexionCp2, pareja: string, rol: RolCp2, privada: KeyObject,
  cambios: Record<string, unknown> = {}): Buffer {
  const payload = codecAuthCp2.codificarPrueba({ v: 2, kind: 'AUTH_PROOF', protocol: 'cp.v2',
    pairId: pareja, role: rol, connectionId: reto.connectionId, nonce: reto.nonce, ...cambios });
  return codecAuthCp2.codificarFrame({ v: 2, kind: 'SIGNED', purpose: 'AUTH', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', bytesFirmaAuthCp2(payload), { key: privada, dsaEncoding: 'der' }).toString('base64url') });
}
export class ClienteAuthCp2 {
  private readonly frames: FrameAutenticacionCp2[] = [];
  private readonly pendientes: { resolver: (frame: FrameAutenticacionCp2) => void; rechazar: (error: Error) => void }[] = [];
  readonly cerrado: Promise<number>;
  private finalizado = false;
  private constructor(readonly socket: WebSocket) {
    this.cerrado = new Promise((resolver) => socket.once('close', (codigo) => {
      this.finalizado = true;
      for (const pendiente of this.pendientes.splice(0)) pendiente.rechazar(new Error('Conexión cerrada'));
      resolver(codigo);
    }));
    socket.on('error', () => socket.terminate());
    socket.on('message', (bytes: Buffer) => {
      const frame = { ...codecAuthCp2.leerFrame(bytes) };
      const pendiente = this.pendientes.shift();
      if (pendiente) pendiente.resolver(frame); else this.frames.push(frame);
    });
  }
  static async conectar(url: string): Promise<ClienteAuthCp2> {
    const cliente = new ClienteAuthCp2(new WebSocket(url, 'cp.v2', { perMessageDeflate: true }));
    await once(cliente.socket, 'open'); return cliente;
  }
  recibir(timeout = 3000): Promise<FrameAutenticacionCp2> {
    const frame = this.frames.shift();
    if (frame) return Promise.resolve(frame);
    if (this.finalizado) return Promise.reject(new Error('Conexión cerrada'));
    return new Promise((resolver, rechazar) => {
      const limite = setTimeout(() => {
        const indice = this.pendientes.indexOf(pendiente);
        if (indice >= 0) this.pendientes.splice(indice, 1);
        rechazar(new Error('Timeout esperando frame CP2'));
      }, timeout);
      const pendiente = { resolver: (valor: FrameAutenticacionCp2) => { clearTimeout(limite); resolver(valor); },
        rechazar: (error: Error) => { clearTimeout(limite); rechazar(error); } };
      this.pendientes.push(pendiente);
    });
  }
  async reto(): Promise<RetoConexionCp2> {
    const frame = await this.recibir();
    if (frame.kind !== 'CHALLENGE') throw new Error('Se esperaba CHALLENGE CP2');
    return frame;
  }
}
