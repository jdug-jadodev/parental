import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { IncomingMessage } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { test } from 'node:test';
import { crearServidorLocal } from '../src/bootstrap/composicion.js';
import { crearTransporteWebSocket } from '../src/infrastructure/websocket/transporte.js';
import { SolicitudConexion } from '../src/domain/conexion.js';

test('R-LIMIT-01: transporte preparado sin listener, sin compresión y con límite 16 KiB', () => {
  const transporte = crearTransporteWebSocket();
  assert.equal(transporte.options.noServer, true);
  assert.equal(transporte.options.maxPayload, 16384);
  assert.equal(transporte.options.perMessageDeflate, false);
  const elegir = transporte.options.handleProtocols;
  assert.equal(typeof elegir, 'function');
  if (typeof elegir === 'function') {
    assert.equal(elegir(new Set(['cp.v1']), {} as IncomingMessage), 'cp.v1');
    assert.equal(elegir(new Set(['otro']), {} as IncomingMessage), false);
  }
  transporte.close();
});

test('R-LIMIT-01: upgrades inválidos rechazados y válidos aún bloqueados por R02', async (contexto) => {
  const servidor = crearServidorLocal();
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  contexto.after(() => new Promise<void>((resolver) => {
    servidor.close(() => resolver());
    servidor.closeAllConnections();
  }));
  assert.equal(servidor.maxConnections, 16);
  assert.equal(servidor.maxHeadersCount, 32);
  const { port } = servidor.address() as AddressInfo;
  for (const [ruta, cabeceras, codigo] of [
    ['/ws', 'Sec-WebSocket-Protocol: cp.v1\r\n', 503],
    ['/ws?clave=prohibida', 'Sec-WebSocket-Protocol: cp.v1\r\n', 400],
    ['/otra', 'Sec-WebSocket-Protocol: cp.v1\r\n', 400],
    ['/ws', '', 400],
    ['/ws', 'Sec-WebSocket-Protocol: otro\r\n', 400],
    ['/ws', 'Sec-WebSocket-Protocol: cp.v1\r\nOrigin: https://example.com\r\n', 400],
  ] as const) {
    const socket = connect(port, '127.0.0.1');
    try {
      socket.setTimeout(3000, () => socket.destroy(new Error('Timeout de prueba')));
      await once(socket, 'connect');
      socket.write(`GET ${ruta} HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n${cabeceras}\r\n`);
      const [datos] = await once(socket, 'data');
      assert.match(String(datos), new RegExp(`^HTTP/1.1 ${codigo}`));
    } finally { socket.destroy(); }
  }
  assert.equal(new SolicitudConexion('POST', '/ws', undefined, 'cp.v1').esValida(), false);
});
