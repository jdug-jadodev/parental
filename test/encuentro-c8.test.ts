import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { crearServidorEncuentroC8Local, crearServidorInicialCerrado } from '../src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../src/infrastructure/config/servidor.config.js';
import { CoordinarEncuentroC8 } from '../src/application/usecase/coordinar-encuentro-c8.usecase.js';
import { EncuentroC8Mapper } from '../src/application/mapper/encuentro-c8.mapper.js';
import type { MensajeClienteC8, MensajeServidorC8, SalidaEncuentroC8 } from '../src/application/dtos/encuentro-c8.dto.js';
import { EntropiaEncuentroAdapter } from '../src/infrastructure/adapter/entropia-encuentro.adapter.js';
import { VerificacionEncuentroAdapter } from '../src/infrastructure/adapter/verificacion-encuentro.adapter.js';
import { CodecEncuentroC8 } from '../src/infrastructure/adapter/protocol/c8/codec-encuentro.js';
import { CodecVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/codec-vinculacion.js';
import { CriptografiaVinculacionCp2 } from '../src/infrastructure/adapter/protocol/cp2/criptografia-vinculacion.js';
import { canonico } from '../src/infrastructure/adapter/protocol/json-estricto.js';

const origen = 'https://relay.example';
const codec = new CodecEncuentroC8();
const pairCodec = new CodecVinculacionCp2(readFileSync(new URL('../contrato-cp2/vinculacion.schema.json', import.meta.url)));
const verificacion = new VerificacionEncuentroAdapter(codec, pairCodec, new CriptografiaVinculacionCp2(pairCodec));
const hijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const padre = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = (clave: typeof hijo): string => clave.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
const bytes = (valor: unknown): Buffer => Buffer.from(canonico(valor));
const b64 = (valor: unknown): string => bytes(valor).toString('base64url');
const uuid = '11111111-1111-4111-8111-111111111111';
const nonce = Buffer.alloc(32, 4).toString('base64url');
const oferta = { v: 2, kind: 'CHILD_OFFER', protocol: 'cp.v2', childPublicKeyB64: publica(hijo), enrollId: uuid, enrollNonce: nonce };
function autenticar(reto: SalidaEncuentroC8, rol: 'CHILD' | 'PARENT', clave = rol === 'CHILD' ? hijo : padre,
  dominio = 'C8v1/PROOF\n'): MensajeClienteC8 {
  assert.equal(reto.mensaje.kind, 'CHALLENGE');
  if (reto.mensaje.kind !== 'CHALLENGE') throw new Error('Falta reto');
  const payload = bytes({ v: 1, kind: 'PROOF', connectionId: reto.connectionId, nonceB64: reto.mensaje.nonceB64,
    publicKeyB64: publica(clave), relayOrigin: origen, role: rol });
  return { v: 1, kind: 'AUTH', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', Buffer.concat([Buffer.from(dominio), payload]), clave.privateKey).toString('base64url') };
}
function aceptar(cambios: object = {}, clave = padre): string {
  const payload = bytes({ v: 2, kind: 'PAIR_ACCEPT', protocol: 'cp.v2', pairId: uuid, enrollId: uuid, enrollNonce: nonce,
    childPublicKeyB64: publica(hijo), parentPublicKeyB64: publica(padre), relayOrigin: origen,
    recoveryHashes: { MAINTENANCE: nonce, RECOVER_PARENT: nonce, RETIRE: nonce }, ...cambios });
  return b64({ v: 2, kind: 'SIGNED', purpose: 'PAIR', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', Buffer.concat([Buffer.from('CPv2/PAIR\n'), payload]), clave.privateKey).toString('base64url') });
}
function entorno() {
  let ahora = 1000;
  const caso = adaptar(new CoordinarEncuentroC8({ ahora: () => ahora }, new EntropiaEncuentroAdapter(), verificacion, origen));
  const abrir = (rol: 'CHILD' | 'PARENT'): string => {
    const reto = caso.abrir();
    assert.equal(caso.ejecutar(reto.connectionId, autenticar(reto, rol))[0]?.mensaje.kind, 'READY');
    return reto.connectionId;
  };
  const publicar = (id: string, ttlMs = 120000): string => {
    const respuesta = caso.ejecutar(id, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs })[0]!.mensaje;
    assert.equal(respuesta.kind, 'CODE');
    if (respuesta.kind !== 'CODE') throw new Error('Sin código');
    return respuesta.code;
  };
  return { caso, abrir, publicar, avanzar: (ms: number) => { ahora += ms; } };
}

function adaptar(caso: CoordinarEncuentroC8) {
  return { abrir: () => EncuentroC8Mapper.aDto(caso.abrir()),
    ejecutar: (id: string, m: MensajeClienteC8) => caso.ejecutar(id, EncuentroC8Mapper.aDominio(m)).map(EncuentroC8Mapper.aDto),
    cerrar: (id: string) => caso.cerrar(id).map(EncuentroC8Mapper.aDto), limpiar: () => caso.limpiar().map(EncuentroC8Mapper.aDto) };
}

test('C8: encuentro real firmado conserva oferta y PAIR originales, no confirma guardado', () => {
  const e = entorno();
  const child = e.abrir('CHILD'), parent = e.abrir('PARENT');
  const code = e.publicar(child);
  const entrega = e.caso.ejecutar(parent, { v: 1, kind: 'CLAIM', code });
  assert.deepEqual(entrega.map((s) => s.mensaje.kind), ['OFFER', 'CLAIMED']);
  assert.deepEqual(entrega[0]!.mensaje, { v: 1, kind: 'OFFER', offerB64: b64(oferta), remainingMs: 120000 });
  const pairB64 = aceptar();
  const resultado = e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64 });
  assert.deepEqual(resultado.map((s) => s.mensaje.kind), ['PAIR', 'SENT']);
  assert.deepEqual(resultado[0], { connectionId: child, mensaje: { v: 1, kind: 'PAIR', pairB64 }, cerrar: false });
  assert.throws(() => e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64 }));
});

test('C8: reto consumido, dominio separado y posesión no reutilizable entre sockets', () => {
  const e = entorno();
  const reto = e.caso.abrir(), otro = e.caso.abrir();
  const auth = autenticar(reto, 'CHILD');
  assert.throws(() => e.caso.ejecutar(otro.connectionId, auth));
  assert.throws(() => e.caso.ejecutar(otro.connectionId, autenticar(otro, 'CHILD')));
  e.caso.ejecutar(reto.connectionId, auth);
  assert.throws(() => e.caso.ejecutar(reto.connectionId, auth));
  const tercero = e.caso.abrir();
  assert.throws(() => e.caso.ejecutar(tercero.connectionId, autenticar(tercero, 'CHILD', hijo, 'CPv2/AUTH\n')));
});

test('C8: parser cerrado rechaza alias, órdenes, extras, duplicados y no canonicalidad', () => {
  assert.deepEqual({ ...codec.leer(bytes({ v: 1, kind: 'CANCEL' })) }, { v: 1, kind: 'CANCEL' });
  for (const mensaje of [{ v: 2, kind: 'CANCEL' }, { v: 1, kind: 'SET_POLICY' },
    { v: 1, kind: 'CANCEL', code: 'ABCDEFGH' }, { v: 1, kind: 'CLAIM', code: 'abcdefgh' },
    { v: 1, kind: 'CLAIM', code: 'ABCD0IGH' }, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 0 },
    { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 120001 },
    { v: 1, kind: 'SEND_PAIR', pairB64: aceptar() + '=' }]) assert.throws(() => codec.leer(bytes(mensaje)));
  for (const texto of ['{"kind":"CANCEL","v":1,"v":1}', '{ "kind":"CANCEL","v":1}',
    '{"v":1,"kind":"CANCEL"}', 'x'.repeat(16385)]) assert.throws(() => codec.leer(Buffer.from(texto)));
});

test('C8: AUTH caduca a10s; cupo18 y desconexión libera sólo su plaza', () => {
  const e = entorno(), reto = e.caso.abrir();
  e.avanzar(10000);
  assert.throws(() => e.caso.ejecutar(reto.connectionId, autenticar(reto, 'CHILD')));
  assert.equal(e.caso.limpiar()[0]?.cerrar, true);
  const conexiones = Array.from({ length: 18 }, () => e.caso.abrir());
  assert.throws(() => e.caso.abrir());
  e.caso.cerrar(conexiones[0]!.connectionId);
  assert.ok(e.caso.abrir());
});

test('C8: descuenta desde CHALLENGE, no renueva con reclamo y expira en límite exacto', () => {
  const e = entorno(), child = e.abrir('CHILD');
  e.avanzar(1000);
  const code = e.publicar(child, 10000), parent = e.abrir('PARENT');
  e.avanzar(2000);
  const resultado = e.caso.ejecutar(parent, { v: 1, kind: 'CLAIM', code });
  assert.equal(resultado[0]?.mensaje.kind, 'OFFER');
  if (resultado[0]?.mensaje.kind === 'OFFER') assert.equal(resultado[0].mensaje.remainingMs, 7000);
  e.avanzar(7000);
  assert.throws(() => e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64: aceptar() }));
  assert.equal(e.caso.limpiar().length, 2);
});

test('C8: publicación ya vencida y oferta de clave ajena no producen código', () => {
  const e = entorno(), child = e.abrir('CHILD');
  assert.throws(() => e.caso.ejecutar(child, { v: 1, kind: 'PUBLISH', offerB64: b64({ ...oferta, childPublicKeyB64: publica(padre) }), ttlMs: 1000 }));
  e.avanzar(1000);
  assert.equal(e.caso.ejecutar(child, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 1000 })[0]?.mensaje.kind, 'UNAVAILABLE');
});

test('C8: sólo un reclamante; consumido y desconocido tienen idéntica respuesta', () => {
  const e = entorno(), child = e.abrir('CHILD'), parent = e.abrir('PARENT'), intruso = e.abrir('PARENT');
  const code = e.publicar(child);
  e.caso.ejecutar(parent, { v: 1, kind: 'CLAIM', code });
  const consumido = e.caso.ejecutar(intruso, { v: 1, kind: 'CLAIM', code });
  const desconocido = e.caso.ejecutar(intruso, { v: 1, kind: 'CLAIM', code: 'AAAAAAAA' });
  assert.deepEqual(consumido, desconocido);
  assert.throws(() => e.caso.ejecutar(intruso, { v: 1, kind: 'SEND_PAIR', pairB64: aceptar() }));
  assert.equal(e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64: aceptar() })[0]?.mensaje.kind, 'PAIR');
});

test('C8: roles, identidad distinta y publicación única no se eluden con otro mensaje', () => {
  const e = entorno(), child = e.abrir('CHILD'), parent = e.abrir('PARENT');
  const code = e.publicar(child);
  assert.throws(() => e.publicar(child));
  assert.throws(() => e.publicar(parent));
  assert.throws(() => e.caso.ejecutar(child, { v: 1, kind: 'CLAIM', code }));
  const reto = e.caso.abrir();
  e.caso.ejecutar(reto.connectionId, autenticar(reto, 'PARENT', hijo));
  assert.equal(e.caso.ejecutar(reto.connectionId, { v: 1, kind: 'CLAIM', code })[0]?.mensaje.kind, 'UNAVAILABLE');
});

test('C8: PAIR de otro origen, nonce, oferta, pública o firma no se entrega', () => {
  const e = entorno(), child = e.abrir('CHILD'), parent = e.abrir('PARENT');
  e.caso.ejecutar(parent, { v: 1, kind: 'CLAIM', code: e.publicar(child) });
  for (const cambios of [{ relayOrigin: 'https://otro.example' }, { enrollNonce: Buffer.alloc(32, 9).toString('base64url') },
    { enrollId: '22222222-2222-4222-8222-222222222222' }, { childPublicKeyB64: publica(padre) },
    { parentPublicKeyB64: publica(hijo) }]) {
    assert.throws(() => e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64: aceptar(cambios) }));
  }
  assert.throws(() => e.caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64: aceptar({}, hijo) }));
});

test('C8: cancelación invalida ambos, callback viejo no afecta nuevo y código queda tombstone', () => {
  let ahora = 0;
  const entropia = new EntropiaEncuentroAdapter();
  const caso = adaptar(new CoordinarEncuentroC8({ ahora: () => ahora }, { identificador: () => entropia.identificador(),
    nonce: () => entropia.nonce(), codigo: () => 'ABCDEFGH' }, verificacion, origen));
  const abrir = (rol: 'CHILD' | 'PARENT') => { const r = caso.abrir(); caso.ejecutar(r.connectionId, autenticar(r, rol)); return r.connectionId; };
  const child = abrir('CHILD'), parent = abrir('PARENT');
  caso.ejecutar(child, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 1000 });
  caso.ejecutar(parent, { v: 1, kind: 'CLAIM', code: 'ABCDEFGH' });
  assert.equal(caso.ejecutar(child, { v: 1, kind: 'CANCEL' }).length, 2);
  assert.throws(() => caso.ejecutar(parent, { v: 1, kind: 'SEND_PAIR', pairB64: aceptar() }));
  const nuevo = abrir('CHILD');
  assert.throws(() => caso.ejecutar(nuevo, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 1000 }));
  caso.cerrar(child);
  ahora = 1000;
  caso.limpiar();
  assert.equal(caso.ejecutar(nuevo, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 120000 })[0]?.mensaje.kind, 'CODE');
});

test('C8: cinco fallidos por socket y cuarenta intentos globales por minuto', () => {
  const e = entorno();
  for (let cliente = 0; cliente < 8; cliente++) {
    const id = e.abrir('PARENT');
    for (let intento = 0; intento < 5; intento++) {
      assert.equal(e.caso.ejecutar(id, { v: 1, kind: 'CLAIM', code: 'ABCDEFGH' })[0]?.cerrar, intento === 4);
    }
    assert.throws(() => e.caso.ejecutar(id, { v: 1, kind: 'CLAIM', code: 'ABCDEFGH' }));
  }
  const noveno = e.abrir('PARENT');
  assert.equal(e.caso.ejecutar(noveno, { v: 1, kind: 'CLAIM', code: 'ABCDEFGH' })[0]?.cerrar, true);
  e.caso.cerrar(noveno);
  e.avanzar(60000);
  assert.equal(e.caso.ejecutar(e.abrir('PARENT'), { v: 1, kind: 'CLAIM', code: 'ABCDEFGH' })[0]?.cerrar, false);
});

test('C8: cupo16 encuentros incluye cancelados y no expulsa los existentes', () => {
  const e = entorno();
  for (let i = 0; i < 16; i++) { const child = e.abrir('CHILD'); e.publicar(child); e.caso.cerrar(child); }
  const child = e.abrir('CHILD');
  assert.equal(e.caso.ejecutar(child, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 120000 })[0]?.mensaje.kind, 'UNAVAILABLE');
  e.avanzar(120000);
  e.caso.limpiar();
  assert.ok(e.publicar(e.abrir('CHILD')));
});

test('C8: entropía produce exactamente ocho símbolos sin sesgo de módulo32', () => {
  const entropia = new EntropiaEncuentroAdapter();
  for (let i = 0; i < 100; i++) assert.match(entropia.codigo(), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
});

async function iniciar(bootstrap = false) {
  const servidor = bootstrap ? crearServidorInicialCerrado({ RELAY_MODE: 'bootstrap', NODE_ENV: 'production', LOG_LEVEL: 'error' })
    : crearServidorEncuentroC8Local({ RELAY_MODE: 'c8-local', NODE_ENV: 'test', PUBLIC_ORIGIN: origen });
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const { port } = servidor.address() as AddressInfo;
  let cierre: Promise<void> | undefined;
  return { url: `ws://127.0.0.1:${port}/pair`, detener: () => cierre ??= (async () => {
    const cerrado = once(servidor, 'close'); cerrarServidorHttp(servidor); await cerrado;
  })() };
}

async function cliente(url: string) {
  const socket = new WebSocket(url, 'c8.v1', { perMessageDeflate: true });
  const cola: MensajeServidorC8[] = [];
  const pendientes: { resolver: (m: MensajeServidorC8) => void; rechazar: (e: Error) => void }[] = [];
  let cerrado = false;
  const cierre = new Promise<number>((resolver) => socket.once('close', (codigo) => {
    cerrado = true;
    for (const p of pendientes.splice(0)) p.rechazar(new Error('Cerrado'));
    resolver(codigo);
  }));
  socket.on('error', () => socket.terminate());
  socket.on('message', (data) => {
    const frame = JSON.parse(data.toString()) as MensajeServidorC8;
    const pendiente = pendientes.shift();
    if (pendiente) pendiente.resolver(frame); else cola.push(frame);
  });
  await once(socket, 'open');
  const recibir = (): Promise<MensajeServidorC8> => {
    const m = cola.shift();
    if (m) return Promise.resolve(m);
    if (cerrado) return Promise.reject(new Error('Cerrado'));
    return new Promise((resolver, rechazar) => {
      const limite = setTimeout(() => {
        const indice = pendientes.indexOf(p);
        if (indice >= 0) pendientes.splice(indice, 1);
        rechazar(new Error('Timeout C8'));
      }, 3000);
      const p = { resolver: (valor: MensajeServidorC8) => { clearTimeout(limite); resolver(valor); },
        rechazar: (e: Error) => { clearTimeout(limite); rechazar(e); } };
      pendientes.push(p);
    });
  };
  const enviar = (m: MensajeClienteC8): void => { socket.send(canonico(m), { binary: false }); };
  const auth = async (rol: 'CHILD' | 'PARENT'): Promise<void> => {
    const reto = await recibir();
    assert.equal(reto.kind, 'CHALLENGE');
    if (reto.kind !== 'CHALLENGE') throw new Error('Falta reto');
    enviar(autenticar({ connectionId: reto.connectionId, mensaje: reto }, rol));
    assert.equal((await recibir()).kind, 'READY');
  };
  return { socket, cierre, recibir, enviar, auth };
}

function rechazo(url: string, protocolo = 'c8.v1', origin?: string): Promise<number> {
  return new Promise((resolver, rechazar) => {
    const socket = new WebSocket(url, protocolo, { origin });
    const limite = setTimeout(() => { socket.terminate(); rechazar(new Error('Timeout upgrade')); }, 3000);
    socket.on('error', () => {});
    socket.once('unexpected-response', (_req, res) => { clearTimeout(limite); res.resume(); socket.terminate(); resolver(res.statusCode!); });
    socket.once('open', () => { clearTimeout(limite); socket.terminate(); rechazar(new Error('Upgrade inesperado')); });
  });
}

test('C8 local: dos WebSockets reales intercambian oferta y PAIR firmados sin cámara', async (t) => {
  const servidor = await iniciar(); t.after(servidor.detener);
  const child = await cliente(servidor.url), parent = await cliente(servidor.url);
  await child.auth('CHILD'); await parent.auth('PARENT');
  assert.equal(child.socket.extensions, '');
  assert.equal(child.socket.protocol, 'c8.v1');
  child.enviar({ v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 120000 });
  const codigo = await child.recibir();
  if (codigo.kind !== 'CODE') throw new Error('Falta código');
  parent.enviar({ v: 1, kind: 'CLAIM', code: codigo.code });
  const recibida = await parent.recibir();
  assert.equal(recibida.kind, 'OFFER');
  if (recibida.kind === 'OFFER') assert.deepEqual(Buffer.from(recibida.offerB64, 'base64url'), bytes(oferta));
  assert.equal((await child.recibir()).kind, 'CLAIMED');
  const pairB64 = aceptar();
  parent.enviar({ v: 1, kind: 'SEND_PAIR', pairB64 });
  assert.deepEqual(await child.recibir(), { v: 1, kind: 'PAIR', pairB64 });
  assert.equal((await parent.recibir()).kind, 'SENT');
  parent.enviar({ v: 1, kind: 'CANCEL' });
  assert.equal((await child.recibir()).kind, 'UNAVAILABLE');
  assert.equal(await child.cierre, 1000);
  const health = await fetch(servidor.url.replace('ws:', 'http:').replace('/pair', '/healthz'));
  assert.equal(health.status, 503);
});

test('C8 local: rutas, query, Origin, subprotocolo y producción fallan cerrado; bootstrap intacto', async (t) => {
  const servidor = await iniciar(); t.after(servidor.detener);
  assert.equal(await rechazo(servidor.url + '?code=ABCDEFGH'), 400);
  assert.equal(await rechazo(servidor.url, 'cp.v2'), 400);
  assert.equal(await rechazo(servidor.url.replace('/pair', '/ws')), 400);
  assert.equal(await rechazo(servidor.url, 'c8.v1', 'https://otro.example'), 400);
  for (const env of [{}, { RELAY_MODE: 'c8-local', NODE_ENV: 'production', PUBLIC_ORIGIN: origen },
    { RELAY_MODE: 'c8-local', NODE_ENV: 'test', PUBLIC_ORIGIN: 'http://relay.example' }]) {
    assert.throws(() => crearServidorEncuentroC8Local(env));
  }
  const cerrado = await iniciar(true); t.after(cerrado.detener);
  assert.equal(await rechazo(cerrado.url), 400);
});

test('C8 local: mensajes previos a prueba, binarios y órdenes se rechazan sin eco', async (t) => {
  const servidor = await iniciar(); t.after(servidor.detener);
  const sinAuth = await cliente(servidor.url); await sinAuth.recibir();
  sinAuth.enviar({ v: 1, kind: 'CLAIM', code: 'ABCDEFGH' });
  assert.equal(await sinAuth.cierre, 1008);
  const binario = await cliente(servidor.url); await binario.recibir();
  binario.socket.send(Buffer.from('{}'));
  assert.equal(await binario.cierre, 1008);
  const autenticado = await cliente(servidor.url); await autenticado.auth('PARENT');
  autenticado.socket.send('{"kind":"SET_POLICY","v":2}');
  assert.equal(await autenticado.cierre, 1008);
});

test('C8 local: cierre del iniciador retira encuentro y notifica al otro sin reabrir código', async (t) => {
  const servidor = await iniciar(); t.after(servidor.detener);
  const child = await cliente(servidor.url), parent = await cliente(servidor.url);
  await child.auth('CHILD'); await parent.auth('PARENT');
  child.enviar({ v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 120000 });
  const m = await child.recibir(); if (m.kind !== 'CODE') throw new Error('Falta código');
  parent.enviar({ v: 1, kind: 'CLAIM', code: m.code }); await parent.recibir(); await child.recibir();
  child.socket.terminate(); await child.cierre;
  assert.equal((await parent.recibir()).kind, 'UNAVAILABLE');
  assert.equal(await parent.cierre, 1000);
  const otro = await cliente(servidor.url); await otro.auth('PARENT');
  otro.enviar({ v: 1, kind: 'CLAIM', code: m.code });
  assert.equal((await otro.recibir()).kind, 'UNAVAILABLE');
});

test('C8: verifica también caducidad después de criptografía sin generar plazos nuevos', () => {
  let ahora = 0;
  let demora = 10000;
  const lento = adaptar(new CoordinarEncuentroC8({ ahora: () => ahora }, new EntropiaEncuentroAdapter(), {
    prueba: (...args) => { const identidad = verificacion.prueba(...args); ahora += demora; return identidad; },
    oferta: (...args) => { const valor = verificacion.oferta(...args); ahora += demora; return valor; },
    aceptacion: (...args) => { verificacion.aceptacion(...args); ahora += demora; },
  }, origen));
  const reto = lento.abrir();
  assert.throws(() => lento.ejecutar(reto.connectionId, autenticar(reto, 'CHILD')));
  lento.cerrar(reto.connectionId);
  demora = 0;
  const nuevo = lento.abrir();
  lento.ejecutar(nuevo.connectionId, autenticar(nuevo, 'CHILD'));
  demora = 1000;
  const respuesta = lento.ejecutar(nuevo.connectionId, { v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 1000 });
  assert.equal(respuesta[0]?.mensaje.kind, 'UNAVAILABLE');
});

test('C8 local: vencimiento autónomo cierra aunque cliente no cancele; cinco intentos cierran', async (t) => {
  const servidor = await iniciar(); t.after(servidor.detener);
  const child = await cliente(servidor.url); await child.auth('CHILD');
  child.enviar({ v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 500 });
  assert.equal((await child.recibir()).kind, 'CODE');
  assert.equal((await child.recibir()).kind, 'UNAVAILABLE');
  assert.equal(await child.cierre, 1000);
  const parent = await cliente(servidor.url); await parent.auth('PARENT');
  for (let i = 0; i < 5; i++) {
    parent.enviar({ v: 1, kind: 'CLAIM', code: 'ABCDEFGH' });
    assert.equal((await parent.recibir()).kind, 'UNAVAILABLE');
  }
  assert.equal(await parent.cierre, 1000);
});

test('C8 local: cierre controlado usa1012 en ambos roles de un encuentro', async (t) => {
  const servidor = await iniciar(); t.after(servidor.detener);
  const child = await cliente(servidor.url), parent = await cliente(servidor.url);
  await child.auth('CHILD'); await parent.auth('PARENT');
  child.enviar({ v: 1, kind: 'PUBLISH', offerB64: b64(oferta), ttlMs: 120000 });
  const m = await child.recibir(); if (m.kind !== 'CODE') throw new Error('Falta código');
  parent.enviar({ v: 1, kind: 'CLAIM', code: m.code }); await parent.recibir(); await child.recibir();
  await servidor.detener();
  assert.equal(await child.cierre, 1012);
  assert.equal(await parent.cierre, 1012);
});
