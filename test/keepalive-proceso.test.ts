import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KeepaliveProceso } from '../src/infrastructure/adapter/keepalive-proceso.js';
import { leerKeepalive } from '../src/infrastructure/config/keepalive.config.js';

const drenar = (): Promise<void> => new Promise((resolver) => setImmediate(resolver));

test('Autollamada: opt-in SELF_URL, destino fijo keepalive y diez minutos por defecto', () => {
  assert.equal(leerKeepalive({}), undefined);
  assert.deepEqual(leerKeepalive({ SELF_URL: 'https://relay.example.com' }), {
    url: 'https://relay.example.com/keepalive', intervaloMs: 600000,
  });
  assert.equal(leerKeepalive({ SELF_URL: 'https://relay.example.com', KEEP_ALIVE_INTERVAL_MS: '60000' })?.intervaloMs, 60000);
  assert.equal(leerKeepalive({ SELF_URL: 'https://relay.example.com', KEEP_ALIVE_INTERVAL_MS: '3600000' })?.intervaloMs, 3600000);
});

test('Autollamada: rechaza intervalos/orígenes ambiguos, credenciales, query y localhost', () => {
  assert.throws(() => leerKeepalive({ KEEP_ALIVE_INTERVAL_MS: '600000' }));
  for (const origen of ['', 'http://relay.example.com', 'https://relay.example.com/', 'https://localhost',
    'https://127.0.0.1', 'https://u:p@relay.example.com', 'https://relay.example.com/health',
    'https://relay.example.com?q=1', 'https://relay.example.com#hash']) {
    assert.throws(() => leerKeepalive({ SELF_URL: origen }));
  }
  for (const intervalo of ['', '0', '-1', '59999', '3600001', '0600000', '1e6', '600000.5']) {
    assert.throws(() => leerKeepalive({ SELF_URL: 'https://relay.example.com', KEEP_ALIVE_INTERVAL_MS: intervalo }));
  }
});

test('Autollamada: espera diez minutos, no sigue redirects ni envía cuerpo/autorización', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const llamadas: { url: unknown; opciones: RequestInit | undefined }[] = [];
  let avisos = 0;
  const solicitar: typeof fetch = async (url, opciones) => {
    llamadas.push({ url, opciones }); return new Response(null);
  };
  const keepalive = new KeepaliveProceso('https://relay.example.com/keepalive', 600000, solicitar, () => avisos++);
  t.after(() => keepalive.detener()); keepalive.iniciar(); keepalive.iniciar();
  t.mock.timers.tick(599999); assert.equal(llamadas.length, 0);
  t.mock.timers.tick(1); await drenar(); assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0]?.url, 'https://relay.example.com/keepalive');
  assert.equal(llamadas[0]?.opciones?.method, 'GET');
  assert.equal(llamadas[0]?.opciones?.redirect, 'error');
  assert.equal(llamadas[0]?.opciones?.headers, undefined);
  assert.equal(llamadas[0]?.opciones?.body, undefined);
  assert.equal(avisos, 0);
  t.mock.timers.tick(600000); await drenar(); assert.equal(llamadas.length, 2);
});

test('Autollamada: no superpone solicitudes y detener aborta la que sigue pendiente', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let llamadas = 0; let signal: AbortSignal | undefined; let avisos = 0;
  const solicitar: typeof fetch = async (_url, opciones) => {
    llamadas++; signal = opciones?.signal ?? undefined;
    return new Promise((_resolver, rechazar) => signal?.addEventListener('abort', () => rechazar(new Error('Abortada')), { once: true }));
  };
  const keepalive = new KeepaliveProceso('https://relay.example.com/keepalive', 600000, solicitar, () => avisos++, 1800000);
  t.after(() => keepalive.detener()); keepalive.iniciar();
  t.mock.timers.tick(600000); assert.equal(llamadas, 1);
  t.mock.timers.tick(600000); assert.equal(llamadas, 1);
  keepalive.detener(); assert.equal(signal?.aborted, true); await drenar();
  assert.equal(avisos, 0); keepalive.iniciar(); t.mock.timers.tick(600000); assert.equal(llamadas, 1);
});

test('Autollamada: timeout aborta, permite siguiente ciclo y nunca modifica estado del relay', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let llamadas = 0; let avisos = 0;
  const solicitar: typeof fetch = async (_url, opciones) => {
    llamadas++;
    return new Promise((_resolver, rechazar) => opciones?.signal?.addEventListener('abort', () => rechazar(new Error('Timeout')), { once: true }));
  };
  const keepalive = new KeepaliveProceso('https://relay.example.com/keepalive', 600000, solicitar, () => avisos++);
  t.after(() => keepalive.detener()); keepalive.iniciar();
  t.mock.timers.tick(600000); t.mock.timers.tick(10000); await drenar(); assert.equal(avisos, 1);
  t.mock.timers.tick(590000); assert.equal(llamadas, 2);
});

test('Autollamada: errores HTTP/red y cuerpo descartado sin guardar ni registrar respuestas', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let llamadas = 0; let avisos = 0; let descartado = false;
  const solicitar: typeof fetch = async () => {
    llamadas++;
    if (llamadas === 2) throw new Error('Error de transporte de prueba');
    return new Response(new ReadableStream({ cancel: () => { descartado = true; } }), { status: 503 });
  };
  const keepalive = new KeepaliveProceso('https://relay.example.com/keepalive', 600000, solicitar, () => avisos++);
  t.after(() => keepalive.detener()); keepalive.iniciar();
  t.mock.timers.tick(600000); await drenar(); assert.equal(avisos, 1); assert.equal(descartado, true);
  t.mock.timers.tick(600000); await drenar(); assert.equal(avisos, 2);
});
