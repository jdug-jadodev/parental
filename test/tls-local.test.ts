import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { crearServidorLocal } from '../src/infrastructure/config/dependencias.js';

const fixture = JSON.parse(readFileSync(new URL('../pruebas/vectores_crypto.json', import.meta.url), 'utf8')) as {
  publicKeys: { PARENT: string; CHILD: string }; vectors: { payload: { pairId: string } }[];
};
const env = { NODE_ENV: 'test', PUBLIC_ORIGIN: 'https://127.0.0.1', ACTIVE_PAIR_ID: fixture.vectors[0]!.payload.pairId,
  PARENT_PUBLIC_KEY_B64: fixture.publicKeys.PARENT, CHILD_PUBLIC_KEY_B64: fixture.publicKeys.CHILD };

test('WSS local: TLS no habilita un canal sin configuración pública autenticada', () => {
  assert.throws(() => crearServidorLocal(undefined, {}), /configuración pública autenticada/);
});

test('WSS local: producción permanece bloqueada incluso con TLS inyectado', () => {
  assert.throws(() => crearServidorLocal({ ...env, NODE_ENV: 'production' }, {}), /solo permite ejecución local/);
});

test('WSS local: certificado/clave ausentes o inválidos fallan antes de escuchar', () => {
  assert.throws(() => crearServidorLocal(env, {}), /TLS local requiere/);
  assert.throws(() => crearServidorLocal(env, { cert: 'certificado inválido de prueba', key: 'clave inválida de prueba' }));
});
