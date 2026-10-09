import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { DecisionConexion } from '../src/domain/entities/decision-conexion.js';
import { SolicitudConexion } from '../src/domain/entities/solicitud-conexion.js';
import { UpgradeEntity } from '../src/infrastructure/adapter/entities/upgrade.entity.js';
import { RechazoUpgradeEntity } from '../src/infrastructure/adapter/entities/rechazo-upgrade.entity.js';
import { UpgradeMapper } from '../src/infrastructure/adapter/mapper/upgrade.mapper.js';
import { WebSocketAdapter } from '../src/infrastructure/adapter/websocket.adapter.js';

test('WebSocket: adaptador de entrada inyecta puerto y entrega dominio, no DTO/socket', (contexto) => {
  let llamadas = 0;
  const adaptador = new WebSocketAdapter({ ejecutar: (solicitud) => {
    llamadas++;
    assert.ok(solicitud instanceof SolicitudConexion);
    assert.deepEqual(Object.keys(solicitud).sort(), ['metodo', 'origen', 'ruta', 'subprotocolo']);
    assert.equal(solicitud.ruta, '/ws');
    return new DecisionConexion('NO_DISPONIBLE');
  } });
  const socket = new PassThrough();
  contexto.after(() => socket.destroy());
  let respuesta = '';
  socket.on('data', (datos: Buffer) => { respuesta += datos.toString('utf8'); });
  adaptador.upgrade({ method: 'GET', url: '/ws', headers: { 'sec-websocket-protocol': 'cp.v1' } } as IncomingMessage, socket);
  assert.equal(llamadas, 1);
  assert.match(respuesta, /^HTTP\/1.1 503 Service Unavailable/);
});

test('WebSocket: entidad copia cabeceras y arrays para aislar cambios externos', () => {
  const protocolos = ['cp.v1', 'otro'];
  const cabeceras = { 'sec-websocket-protocol': protocolos };
  const entidad = new UpgradeEntity('GET', '/ws', cabeceras);
  protocolos.pop();
  cabeceras['sec-websocket-protocol'] = ['nuevo'];
  assert.deepEqual(entidad.headers['sec-websocket-protocol'], ['cp.v1', 'otro']);
  assert.ok(Object.isFrozen(entidad));
  assert.ok(Object.isFrozen(entidad.headers));
  assert.ok(Object.isFrozen(entidad.headers['sec-websocket-protocol']));
});

test('WebSocket: fallo de infraestructura no se mapea como decisión del dominio', () => {
  assert.throws(() => UpgradeMapper.deRechazo(new RechazoUpgradeEntity(500)), /no es una decisión de dominio/);
});
