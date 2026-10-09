import { WebSocketServer } from 'ws';
import { MAX_FRAME } from '../adapter/protocol/codec-protocolo.js';

export function crearTransporteWebSocket(): WebSocketServer {
  return new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME,
    perMessageDeflate: false,
    autoPong: false,
    maxFragments: 64,
    maxBufferedChunks: 128,
    handleProtocols: (protocolos) => protocolos.has('cp.v1') ? 'cp.v1' : false,
  });
}
