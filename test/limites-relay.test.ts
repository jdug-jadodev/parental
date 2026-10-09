import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cupo } from '../src/application/validations/cupo.validation.js';
import { LimiteUpgradesAdapter } from '../src/infrastructure/adapter/limite-upgrades.js';
import { LatidosTransporte } from '../src/infrastructure/adapter/latidos-transporte.js';
import { enviarAcotado, type SocketSalida } from '../src/infrastructure/adapter/salida-websocket.js';

test('R-LIMIT-02: ráfaga 20, recarga 10/s y reloj regresivo no concede cupo', () => {
  const cupo = new Cupo(20, 10, 0);
  for (let i = 0; i < 20; i++) assert.equal(cupo.admitir(0), true);
  assert.equal(cupo.admitir(0), false);
  assert.equal(cupo.admitir(99), false);
  assert.equal(cupo.admitir(100), true);
  assert.equal(cupo.admitir(0), false);
  assert.equal(cupo.admitir(199), false);
  assert.equal(cupo.admitir(200), true);
  for (let i = 0; i < 20; i++) assert.equal(cupo.admitir(100000), true);
  assert.equal(cupo.admitir(100000), false);
});

test('R-LIMIT: upgrades por IP, límite global, tabla acotada y caducidad TTL', () => {
  const limite = new LimiteUpgradesAdapter(0, 2, 60000);
  for (let i = 0; i < 20; i++) assert.equal(limite.admitir('ip1', 0), true);
  assert.equal(limite.admitir('ip1', 0), false);
  assert.equal(limite.admitir('ip2', 0), true);
  assert.equal(limite.admitir('ip3', 0), false);
  assert.equal(limite.cantidad, 2);
  assert.equal(limite.admitir('ip3', 60000), true);
  assert.equal(limite.cantidad, 1);
  assert.equal(limite.admitir(undefined, 60000), false);
  const global = new LimiteUpgradesAdapter(0);
  for (let i = 0; i < 40; i++) assert.equal(global.admitir(String(i), 0), true);
  assert.equal(global.admitir('otra', 0), false);
});

test('R-LIMIT-02: salida exacta 64 KiB aceptada, exceso cerrado sin enviar ni cola', () => {
  let enviados = 0;
  let fallos = 0;
  let buffer = 65535;
  const socket: SocketSalida = {
    readyState: 1, get bufferedAmount() { return buffer; },
    send: (_bytes, opciones, callback) => { assert.equal(opciones.binary, false); enviados++; callback(); },
  };
  assert.equal(enviarAcotado(socket, 'a', () => fallos++), true);
  assert.equal(enviarAcotado(socket, 'á', () => fallos++), false);
  assert.equal(enviados, 1);
  assert.equal(fallos, 1);
  buffer = 65537;
  assert.equal(enviarAcotado(socket, new Uint8Array(1), () => fallos++), false);
  assert.equal(enviados, 1);
  assert.equal(fallos, 2);
  assert.equal(enviarAcotado({ ...socket, readyState: 3 }, 'a', () => fallos++), false);
});

test('R-FAIL: fallo de envío asíncrono y excepción no acumulan salida', () => {
  let fallos = 0;
  let terminado = false;
  const socket: SocketSalida = { readyState: 1, bufferedAmount: 0,
    send: (_bytes, _opciones, callback) => callback(new Error('Fallo simulado')) };
  enviarAcotado(socket, 'a', () => fallos++, () => { terminado = true; });
  assert.equal(fallos, 1);
  assert.equal(terminado, true);
  assert.equal(enviarAcotado({ ...socket, send: () => { throw new Error('Fallo simulado'); } }, 'a', () => fallos++), false);
  assert.equal(fallos, 2);
});

test('R-FAIL-01: ping de transporte exige su nonce; socket muerto termina y se elimina', () => {
  const latidos = new LatidosTransporte();
  let nonce = new Uint8Array();
  let terminados = 0;
  const socket = { readyState: 1, ping: (bytes: Uint8Array) => { nonce = new Uint8Array(bytes); }, terminate: () => terminados++ };
  latidos.registrar(socket);
  latidos.revisar();
  latidos.pong(socket, nonce);
  latidos.revisar();
  assert.equal(terminados, 0);
  latidos.pong(socket, new Uint8Array(16));
  latidos.revisar();
  assert.equal(terminados, 1);
  assert.equal(latidos.cantidad, 0);
  for (let i = 0; i < 1000; i++) { latidos.registrar(socket); latidos.eliminar(socket); }
  assert.equal(latidos.cantidad, 0);
});
