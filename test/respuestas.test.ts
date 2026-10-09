import assert from 'node:assert/strict';
import { once } from 'node:events';
import { connect, type AddressInfo } from 'node:net';
import { test } from 'node:test';
import { ServicioController } from '../src/infrastructure/controller/servicio.controller.js';
import { crearServidorHttp } from '../src/infrastructure/config/servidor.config.js';
import { WebSocketAdapter } from '../src/infrastructure/adapter/websocket.adapter.js';
import { ServicioRouter } from '../src/infrastructure/routers/servicio.router.js';

test('respuestas: fallos HTTP y de upgrade son genéricos y no exponen detalles', async (contexto) => {
  const fallar = (): never => { throw new Error('detalle-interno-de-doble'); };
  const servidor = crearServidorHttp(
    new ServicioRouter(new ServicioController({ ejecutar: fallar })),
    new WebSocketAdapter({ ejecutar: fallar }),
  );
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  contexto.after(() => new Promise<void>((resolver) => {
    servidor.close(() => resolver());
    servidor.closeAllConnections();
  }));
  const { port } = servidor.address() as AddressInfo;
  for (const ruta of ['/healthz', '/keepalive']) {
    const respuesta = await fetch(`http://127.0.0.1:${port}${ruta}`);
    assert.equal(respuesta.status, 500);
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
    assert.match(respuesta.headers.get('content-type') ?? '', /application\/json/);
    assert.deepEqual(await respuesta.json(), { error: 'Error interno' });
  }
  const socket = connect(port, '127.0.0.1');
  try {
    socket.setTimeout(3000, () => socket.destroy(new Error('Timeout de prueba')));
    await once(socket, 'connect');
    socket.write('GET /ws HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Protocol: cp.v1\r\n\r\n');
    const [datos] = await once(socket, 'data');
    assert.match(String(datos), /^HTTP\/1.1 500 Internal Server Error/);
    assert.doesNotMatch(String(datos), /detalle-interno/);
    assert.match(String(datos), /Content-Length: 0/);
  } finally { socket.destroy(); }
});
