import type { IncomingMessage } from 'node:http';
import { WebSocketServer } from 'ws';
import { MAX_FRAME } from './protocol.js';

// Preparado para R02; no se enlaza a HTTP ni acepta sockets en R01.
export function crearTransporteWebSocket(): WebSocketServer {
  return new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME,
    perMessageDeflate: false,
    handleProtocols: (protocolos) => protocolos.has('cp.v1') ? 'cp.v1' : false,
  });
}

export function upgradePermitido(solicitud: IncomingMessage): boolean {
  return solicitud.method === 'GET' && solicitud.url === '/ws' &&
    solicitud.headers.origin === undefined &&
    solicitud.headers['sec-websocket-protocol'] === 'cp.v1';
}
