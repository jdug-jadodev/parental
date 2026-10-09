import { WebSocketServer } from 'ws';
import { MAX_FRAME } from '../protocol/codec-protocolo.js';

export function crearTransporteWebSocket(): WebSocketServer {
  return new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME,
    perMessageDeflate: false,
    handleProtocols: (protocolos) => protocolos.has('cp.v1') ? 'cp.v1' : false,
  });
}
