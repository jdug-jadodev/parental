import { WebSocketServer } from 'ws';
import { MAX_FRAME_CP2 } from '../adapter/protocol/cp2/codec-vinculacion.js';

export function crearTransporteWebSocketCp2(): WebSocketServer {
  return new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_CP2,
    perMessageDeflate: false, autoPong: false, maxFragments: 64, maxBufferedChunks: 128,
    handleProtocols: (protocolos) => protocolos.size === 1 && protocolos.has('cp.v2') ? 'cp.v2' : false,
  });
}
