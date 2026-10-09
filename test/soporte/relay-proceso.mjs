import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearServidorLocal } from '../../dist/src/infrastructure/config/dependencias.js';

assert.ok(process.send, 'Proceso de prueba requiere IPC');
const limite = setTimeout(() => process.exit(1), 45000);
process.once('disconnect', () => process.exit(1));
process.once('message', async ({ env, certB64, keyB64, puerto }) => {
  const servidor = crearServidorLocal(env, {
    cert: Buffer.from(certB64, 'base64'), key: Buffer.from(keyB64, 'base64'),
  });
  servidor.listen(puerto, '127.0.0.1');
  await once(servidor, 'listening');
  process.send({ puerto: servidor.address().port, pid: process.pid });
});
process.once('exit', () => clearTimeout(limite));
