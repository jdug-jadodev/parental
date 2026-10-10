import { EventEmitter, once } from 'node:events';
import { createServer } from 'node:https';
import WebSocket, { WebSocketServer } from 'ws';

export async function crearProxyPerdidaAck({ destino, cert, key, descartar }) {
  const eventos = new EventEmitter();
  const errores = [];
  const pares = new Set();
  let descartados = 0;
  const servidor = createServer({ cert, key, minVersion: 'TLSv1.2' }, (peticion, respuesta) => {
    respuesta.writeHead(peticion.url === '/healthz' ? 503 : 404);
    respuesta.end();
  });
  const websocket = new WebSocketServer({ noServer: true, clientTracking: false, perMessageDeflate: false, maxPayload: 16384 });
  servidor.on('upgrade', (peticion, socket, head) => {
    if (peticion.url !== '/ws' || peticion.headers.origin !== undefined ||
        peticion.headers['sec-websocket-protocol'] !== 'cp.v1' || pares.size >= 1) {
      socket.destroy(); return;
    }
    const remoto = new WebSocket(destino, 'cp.v1', { ca: cert, perMessageDeflate: false, maxPayload: 16384 });
    const par = { remoto, local: null, socket };
    pares.add(par);
    const terminar = () => {
      clearTimeout(plazo); pares.delete(par);
      remoto.terminate(); par.local?.terminate(); socket.destroy();
    };
    const plazo = setTimeout(terminar, 10000);
    const reenviar = (receptor, bytes, binario) => {
      if (!receptor || receptor.readyState !== WebSocket.OPEN || receptor.bufferedAmount + bytes.length > 65536) {
        terminar(); return;
      }
      receptor.send(bytes, { binary: binario }, error => { if (error) terminar(); });
    };
    remoto.on('error', terminar);
    remoto.on('close', terminar);
    socket.on('error', terminar);
    remoto.on('open', () => {
      clearTimeout(plazo);
      if (remoto.protocol !== 'cp.v1') { terminar(); return; }
      websocket.handleUpgrade(peticion, socket, head, local => {
        par.local = local;
        local.on('error', terminar);
        local.on('close', terminar);
        local.on('message', (bytes, binario) => reenviar(remoto, bytes, binario));
      });
    });
    remoto.on('message', (bytes, binario) => {
      try {
        if (!binario && descartar(bytes)) {
          descartados++; eventos.emit('descartado', Buffer.from(bytes)); return;
        }
        reenviar(par.local, bytes, binario);
      } catch (error) { errores.push(error); terminar(); }
    });
  });
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  return {
    origen: `https://127.0.0.1:${servidor.address().port}`, eventos, errores,
    get descartados() { return descartados; },
    async cerrar() {
      for (const par of pares) { par.remoto.terminate(); par.local?.terminate(); par.socket.destroy(); }
      const cerrado = once(servidor, 'close');
      servidor.close(); servidor.closeAllConnections(); websocket.close();
      await cerrado;
    },
  };
}
