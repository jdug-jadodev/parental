import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { crearServidorLocal } from '../src/infrastructure/config/dependencias.js';

test('HTTP: keepalive responde sin afirmar disponibilidad CP/1 ni abrir otras rutas', async (contexto) => {
  const servidor = crearServidorLocal();
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  contexto.after(() => new Promise<void>((resolver) => {
    servidor.close(() => resolver());
    servidor.closeAllConnections();
  }));
  const { port } = servidor.address() as AddressInfo;
  const origen = `http://127.0.0.1:${port}`;
  const keepalive = await fetch(`${origen}/keepalive`);
  assert.equal(keepalive.status, 200);
  assert.equal(keepalive.headers.get('cache-control'), 'no-store');
  assert.match(keepalive.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await keepalive.json(), { alive: true });
  const health = await fetch(`${origen}/healthz`);
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { ok: false, protocol: 1 });
  for (const ruta of ['/ws', '/auth', '/config', '/healthz?x=1', '/keepalive?x=1', '/keepalive/', '/']) {
    const respuesta = await fetch(`${origen}${ruta}`);
    assert.equal(respuesta.status, 404, ruta);
    assert.deepEqual(await respuesta.json(), { error: 'Ruta no disponible' });
  }
  for (const metodo of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']) {
    const respuesta = await fetch(`${origen}/keepalive`, { method: metodo });
    assert.equal(respuesta.status, 404, metodo);
  }
});
