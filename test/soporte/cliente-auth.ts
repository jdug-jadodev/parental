import { generateKeyPairSync, randomUUID, sign, type KeyObject } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import type { Frame, PruebaAutenticacion, RetoConexion, Rol } from '../../src/application/dtos/protocolo.dto.js';
import { CodecProtocolo } from '../../src/infrastructure/adapter/protocol/codec-protocolo.js';
import { bytesFirma } from '../../src/infrastructure/adapter/protocol/crypto-protocol.js';
import { crearServidorLocal } from '../../src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../../src/infrastructure/config/servidor.config.js';

export const codecAuth = new CodecProtocolo(readFileSync(new URL('../../compartido/protocolo.schema.json', import.meta.url)));
export function entornoAuth() {
  const claves = { PARENT: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), CHILD: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }) };
  const pareja = randomUUID();
  const env = {
    NODE_ENV: 'test', ACTIVE_PAIR_ID: pareja, PUBLIC_ORIGIN: 'https://relay.example.com',
    PARENT_PUBLIC_KEY_B64: claves.PARENT.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
    CHILD_PUBLIC_KEY_B64: claves.CHILD.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
  };
  return { env, claves, pareja };
}
export async function iniciarAuth(env: NodeJS.ProcessEnv): Promise<{ servidor: Server; url: string; detener: () => Promise<void> }> {
  const servidor = crearServidorLocal(env);
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const { port } = servidor.address() as AddressInfo;
  return { servidor, url: `ws://127.0.0.1:${port}/ws`, detener: async () => {
    const cerrado = once(servidor, 'close');
    cerrarServidorHttp(servidor);
    await cerrado;
  } };
}
export function firmarAuth(reto: RetoConexion, pareja: string, rol: Rol, privada: KeyObject, cambios: Partial<PruebaAutenticacion> = {}): Buffer {
  const payload = codecAuth.codificarPayload({ v: 1, kind: 'AUTH_PROOF', connectionId: reto.connectionId, nonce: reto.nonce, pairId: pareja, role: rol, ...cambios });
  const firma = sign('sha256', bytesFirma('AUTH', payload), { key: privada, dsaEncoding: 'der' });
  return codecAuth.codificarFrame({ v: 1, kind: 'SIGNED', purpose: 'AUTH', payloadB64: payload.toString('base64url'), sigB64: firma.toString('base64url') });
}

export class ClienteAuth {
  readonly presencias: Frame[] = [];
  private readonly frames: Frame[] = [];
  private readonly pendientes: { resolver: (frame: Frame) => void; rechazar: (error: Error) => void }[] = [];
  readonly cerrado: Promise<number>;
  private finalizado = false;
  private constructor(readonly socket: WebSocket) {
    this.cerrado = new Promise((resolver) => socket.once('close', (codigo) => {
      this.finalizado = true;
      for (const pendiente of this.pendientes.splice(0)) pendiente.rechazar(new Error('Conexión cerrada sin frame esperado'));
      resolver(codigo);
    }));
    socket.on('error', () => socket.terminate());
    socket.on('message', (datos: Buffer) => {
      const frame = { ...codecAuth.leerFrame(datos) };
      if (frame.kind === 'PEER_STATUS') { this.presencias.push(frame); return; }
      const pendiente = this.pendientes.shift();
      if (pendiente) pendiente.resolver(frame); else this.frames.push(frame);
    });
  }
  static async conectar(url: string, autoPong = true): Promise<ClienteAuth> {
    const cliente = new ClienteAuth(new WebSocket(url, 'cp.v1', { perMessageDeflate: true, autoPong }));
    await once(cliente.socket, 'open');
    return cliente;
  }
  recibir(timeout = 3000): Promise<Frame> {
    const frame = this.frames.shift();
    if (frame) return Promise.resolve(frame);
    if (this.finalizado) return Promise.reject(new Error('Conexión cerrada'));
    return new Promise((resolver, rechazar) => {
      const limite = setTimeout(() => {
        const indice = this.pendientes.indexOf(pendiente);
        if (indice >= 0) this.pendientes.splice(indice, 1);
        rechazar(new Error('Timeout esperando frame de prueba'));
      }, timeout);
      const pendiente = {
        resolver: (valor: Frame) => { clearTimeout(limite); resolver(valor); },
        rechazar: (error: Error) => { clearTimeout(limite); rechazar(error); },
      };
      this.pendientes.push(pendiente);
    });
  }
  async reto(): Promise<RetoConexion> {
    const frame = await this.recibir();
    if (frame.kind !== 'CHALLENGE') throw new Error('Se esperaba CHALLENGE');
    return frame;
  }
  enviar(frame: Uint8Array, binario = false): void { this.socket.send(frame, { binary: binario }); }
}
