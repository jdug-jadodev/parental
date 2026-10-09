import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { leerConfiguracion } from '../src/config.js';

const publica = (curva = 'prime256v1'): string => generateKeyPairSync('ec', { namedCurve: curva })
  .publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
const env: NodeJS.ProcessEnv = {
  PUBLIC_ORIGIN: 'https://relay.example.com',
  ACTIVE_PAIR_ID: '12345678-1234-4123-8123-123456789abc',
  PARENT_PUBLIC_KEY_B64: publica(), CHILD_PUBLIC_KEY_B64: publica(),
  NODE_ENV: 'test',
};

test('R-CONFIG-01: configuración pública válida e inmutable', () => {
  const config = leerConfiguracion(env);
  assert.equal(config.puerto, 10000);
  assert.equal(config.padre.rol, 'PARENT');
  assert.equal(config.hijo.rol, 'CHILD');
  assert.ok(Object.isFrozen(config));
  assert.equal(leerConfiguracion({ ...env, NODE_ENV: 'production' }).nivelLog, 'error');
});

test('R-CONFIG-01: rechaza ausencias y valores ambiguos sin exponerlos', () => {
  for (const campo of ['PUBLIC_ORIGIN', 'ACTIVE_PAIR_ID', 'PARENT_PUBLIC_KEY_B64', 'CHILD_PUBLIC_KEY_B64']) {
    const incompleta = { ...env };
    delete incompleta[campo];
    assert.throws(() => leerConfiguracion(incompleta), new RegExp(campo));
  }
  for (const origen of ['http://relay.example.com', 'https://relay.example.com/', 'https://relay.example.com/ws',
    'https://usuario:clave@relay.example.com', 'https://relay.example.com?x=1', 'https://relay.example.com#x']) {
    assert.throws(() => leerConfiguracion({ ...env, PUBLIC_ORIGIN: origen }), /PUBLIC_ORIGIN inválido/);
  }
  for (const pareja of ['no-uuid', '12345678-1234-1123-8123-123456789abc']) {
    assert.throws(() => leerConfiguracion({ ...env, ACTIVE_PAIR_ID: pareja }), /UUID v4/);
  }
  for (const clave of ['privada-no-permitida', `${env.PARENT_PUBLIC_KEY_B64}=`, publica('secp384r1')]) {
    assert.throws(() => leerConfiguracion({ ...env, PARENT_PUBLIC_KEY_B64: clave }), /Clave pública PARENT inválida/);
  }
  assert.throws(() => leerConfiguracion({ ...env, CHILD_PUBLIC_KEY_B64: env.PARENT_PUBLIC_KEY_B64 }), /distintas/);
  assert.throws(() => leerConfiguracion({ ...env, NODE_ENV: 'otro' }), /NODE_ENV/);
  assert.throws(() => leerConfiguracion({ ...env, LOG_LEVEL: 'debug' }), /LOG_LEVEL/);
  assert.throws(() => leerConfiguracion({ ...env, NODE_ENV: 'production', LOG_LEVEL: 'info' }), /LOG_LEVEL/);
  assert.throws(() => leerConfiguracion({ ...env, PORT: '0' }), /PORT/);
});
