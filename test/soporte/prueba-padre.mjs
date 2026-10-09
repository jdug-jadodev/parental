import assert from 'node:assert/strict';
import { fork, spawn, spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { get } from 'node:https';
import { delimiter, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { crearServidorLocal } from '../../dist/src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../../dist/src/infrastructure/config/servidor.config.js';
import { CodecProtocolo } from '../../dist/src/infrastructure/adapter/protocol/codec-protocolo.js';
import { bytesFirma, ClaveVerificacion, CriptografiaProtocolo } from '../../dist/src/infrastructure/adapter/protocol/crypto-protocol.js';

const argumentos = process.argv.slice(2);
const proceso = argumentos[0] === '--proceso';
const fallos = proceso || argumentos[0] === '--fallos';
if (fallos) argumentos.shift();
assert.equal(argumentos.length, 2, 'Uso: pnpm run test:padre --ruta-padre RUTA');
assert.equal(argumentos[0], '--ruta-padre');
const padre = resolve(argumentos[1]);
const raiz = fileURLToPath(new URL('../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const archivo of ['compartido/00_CONTRATO_V1.md', 'compartido/protocolo.schema.json', 'pruebas/vectores_crypto.json']) {
  assert.equal(hash(readFileSync(join(padre, archivo))), hash(readFileSync(join(raiz, archivo))), `Copia congelada distinta: ${archivo}`);
}
const clases = join(padre, 'app-parent/build/tmp/kotlin-classes/debug');
for (const nombre of ['RelayConnection', 'TransporteOkHttp']) {
  const fuente = join(padre, `app-parent/src/main/java/dev/controlparental/parent/network/${nombre}.kt`);
  const compilado = join(clases, `dev/controlparental/parent/network/${nombre}.class`);
  assert.ok(existsSync(compilado) && statSync(compilado).mtimeMs >= statSync(fuente).mtimeMs, 'Solicitar al proyecto padre un build actualizado');
}
const cache = join(process.env.GRADLE_USER_HOME ?? join(process.env.USERPROFILE ?? process.env.HOME, '.gradle'), 'caches/modules-2/files-2.1');
function jar(grupo, modulo, version) {
  const carpeta = join(cache, grupo, modulo, version);
  const encontrados = readdirSync(carpeta).flatMap(sub => readdirSync(join(carpeta, sub)).filter(nombre => nombre === `${modulo}-${version}.jar`).map(nombre => join(carpeta, sub, nombre)));
  assert.equal(encontrados.length, 1, `Dependencia local ausente/ambigua: ${modulo} ${version}`);
  return encontrados[0];
}
const classpath = [clases, join(padre, 'core-protocol/build/libs/core-protocol.jar'),
  jar('org.jetbrains.kotlin', 'kotlin-stdlib', '2.2.0'),
  jar('org.jetbrains.kotlinx', 'kotlinx-coroutines-core-jvm', '1.10.2'),
  jar('org.jetbrains.kotlinx', 'kotlinx-serialization-core-jvm', '1.9.0'),
  jar('org.jetbrains.kotlinx', 'kotlinx-serialization-json-jvm', '1.9.0'),
  jar('com.squareup.okhttp3', 'okhttp', '4.12.0'),
  jar('com.squareup.okhttp3', 'okhttp-tls', '4.12.0'),
  jar('com.squareup.okio', 'okio-jvm', '3.6.0')];
const baseTemporal = process.platform === 'win32' ? join(process.env.LOCALAPPDATA, 'Temp/opencode') : process.env.TMPDIR ?? '/tmp';
const temporal = mkdtempSync(join(baseTemporal, 'relay-padre-jvm-'));
const java = nombre => process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? `${nombre}.exe` : nombre) : nombre;
const compilacion = spawnSync(java('javac'), ['-encoding', 'UTF-8', '-cp', classpath.join(delimiter), '-d', temporal, join(raiz, 'test/soporte/PruebaPadre.java')], { encoding: 'utf8', timeout: 30000 });
if (compilacion.status !== 0) throw new Error(`No se compiló el driver JVM: ${compilacion.stderr ?? ''}`);
const jvm = spawn(java('java'), ['-cp', [temporal, ...classpath].join(delimiter), 'dev.controlparental.parent.network.PruebaPadre', ...(fallos ? ['fallos'] : [])], { stdio: ['pipe', 'pipe', 'pipe'] });
jvm.stderr.resume();
const terminado = new Promise(resolver => { jvm.once('error', () => resolver(-1)); jvm.once('exit', codigo => resolver(codigo)); });
const lectura = createInterface({ input: jvm.stdout });
const lineas = [], pendientes = [];
lectura.on('line', linea => { const pendiente = pendientes.shift(); if (pendiente) pendiente(linea); else lineas.push(linea); });
const leerLinea = () => lineas.length ? Promise.resolve(lineas.shift()) : new Promise(resolver => pendientes.push(resolver));
const limite = setTimeout(() => jvm.kill(), 45000);
const dentroDe = (promesa, ms) => {
  let timer;
  return Promise.race([promesa, new Promise((_, rechazar) => { timer = setTimeout(() => rechazar(new Error('Timeout de integración local')), ms); })]).finally(() => clearTimeout(timer));
};
let servidor, hijo, relay, salidaRelay;
try {
  const [tipo, publicaPadre, certB64, keyB64] = (await dentroDe(leerLinea(), 15000)).split('\t');
  assert.equal(tipo, 'LISTO');
  const cert = Buffer.from(certB64, 'base64'), key = Buffer.from(keyB64, 'base64');
  const identidadHijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const publicaHijo = identidadHijo.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
  const pareja = randomUUID();
  const env = { NODE_ENV: 'test', PUBLIC_ORIGIN: 'https://127.0.0.1', ACTIVE_PAIR_ID: pareja,
    PARENT_PUBLIC_KEY_B64: publicaPadre, CHILD_PUBLIC_KEY_B64: publicaHijo };
  const arrancar = async puerto => {
    if (!proceso) {
      servidor = crearServidorLocal(env, { cert, key });
      servidor.listen(puerto, '127.0.0.1');
      await once(servidor, 'listening');
      return { puerto: servidor.address().port };
    }
    relay = fork(fileURLToPath(new URL('./relay-proceso.mjs', import.meta.url)), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    salidaRelay = new Promise(resolver => {
      relay.once('error', () => resolver('error'));
      relay.once('exit', () => resolver('exit'));
    });
    const listo = once(relay, 'message').then(([mensaje]) => mensaje);
    relay.send({ env, certB64, keyB64, puerto });
    const resultado = await dentroDe(Promise.race([listo, salidaRelay]), 10000);
    assert.equal(typeof resultado, 'object', 'Relay terminó antes de escuchar');
    assert.equal(resultado.pid, relay.pid);
    return resultado;
  };
  const inicial = await arrancar(0);
  const origen = `https://127.0.0.1:${inicial.puerto}`;
  const health = await new Promise((resolver, rechazar) => get(`${origen}/healthz`, { ca: cert }, respuesta => { respuesta.resume(); resolver(respuesta.statusCode); }).on('error', rechazar));
  assert.equal(health, 503);
  const codec = new CodecProtocolo(readFileSync(join(raiz, 'compartido/protocolo.schema.json')));
  const cripto = new CriptografiaProtocolo(codec);
  const clavePadre = ClaveVerificacion.desdeSpki('PARENT', publicaPadre);
  const firmar = (payload, purpose) => {
    const bytes = codec.codificarPayload(payload);
    const sigB64 = sign('sha256', bytesFirma(purpose, bytes), { key: identidadHijo.privateKey, dsaEncoding: 'der' }).toString('base64url');
    return codec.codificarFrame({ v: 1, kind: 'SIGNED', purpose, payloadB64: bytes.toString('base64url'), sigB64 });
  };
  const frames = [], esperas = [];
  const recibir = () => dentroDe(frames.length ? Promise.resolve(frames.shift()) : new Promise(resolver => esperas.push(resolver)), 10000);
  const conectarHijo = async () => {
    hijo = new WebSocket(origen.replace('https:', 'wss:') + '/ws', 'cp.v1', { ca: cert });
    hijo.on('message', bytes => {
      const frame = codec.leerFrame(bytes);
      if (frame.kind === 'PEER_STATUS') return;
      const pendiente = esperas.shift();
      if (pendiente) pendiente(bytes); else frames.push(bytes);
    });
    hijo.on('error', () => {});
    await once(hijo, 'open');
    const reto = codec.leerFrame(await recibir());
    assert.equal(reto.kind, 'CHALLENGE');
    hijo.send(firmar({ v: 1, kind: 'AUTH_PROOF', pairId: pareja, role: 'CHILD', connectionId: reto.connectionId, nonce: reto.nonce }, 'AUTH'), { binary: false });
    assert.equal(codec.leerFrame(await recibir()).kind, 'AUTH_OK');
    return reto.connectionId;
  };
  const conexionHijo = await conectarHijo();
  jvm.stdin.write(`${origen}\t${pareja}\t${publicaHijo}\n`);
  const sync = cripto.verificarSobre(await recibir(), clavePadre, 'MESSAGE').mensaje;
  assert.equal(sync.kind, 'SYNC_REQUEST'); assert.equal(sync.pairId, pareja);
  const bootId = randomUUID(), childSessionId = randomUUID(), commandNonce = randomBytes(32).toString('base64url');
  hijo.send(firmar({ v: 1, kind: 'STATE', pairId: pareja, sender: 'CHILD', syncNonce: sync.syncNonce, bootId, childSessionId,
    stateSeq: '1', lastAcceptedSeq: '0', lastCommandId: null, lastCommandPayloadSha256B64: null, lastResult: 'NONE',
    mode: 'LOCKED', reason: 'OK', remainingSec: null, networkValidated: true, channelHealthy: true,
    isDeviceOwner: false, lockTaskActive: false, commandNonce }, 'MESSAGE'), { binary: false });
  const documento = cripto.verificarSobre(await recibir(), clavePadre, 'MESSAGE');
  const orden = documento.mensaje;
  assert.equal(orden.kind, 'SET_POLICY'); assert.equal(orden.pairId, pareja);
  assert.equal(orden.bootId, bootId); assert.equal(orden.childSessionId, childSessionId); assert.equal(orden.commandNonce, commandNonce);
  if (fallos) {
    assert.equal(await dentroDe(leerLinea(), 5000), 'ORDEN_SIN_ACK');
    const cierreHijo = once(hijo, 'close');
    if (proceso) {
      assert.ok(relay.kill('SIGKILL'));
      assert.equal(await dentroDe(salidaRelay, 5000), 'exit');
    } else {
      const cierreServidor = once(servidor, 'close');
      cerrarServidorHttp(servidor);
      await dentroDe(cierreServidor, 5000);
    }
    assert.equal((await dentroDe(cierreHijo, 5000))[0], proceso ? 1006 : 1012);
    const reiniciado = await arrancar(inicial.puerto);
    assert.equal(reiniciado.puerto, inicial.puerto);
    if (proceso) assert.notEqual(reiniciado.pid, inicial.pid);
    assert.equal(await dentroDe(leerLinea(), 20000), 'RECONECTADO');
    assert.equal(frames.length, 0);
    assert.notEqual(await conectarHijo(), conexionHijo);
    jvm.stdin.write('HIJO_LISTO\n');
    const syncNuevo = cripto.verificarSobre(await recibir(), clavePadre, 'MESSAGE').mensaje;
    assert.equal(syncNuevo.kind, 'SYNC_REQUEST');
    assert.notEqual(syncNuevo.syncNonce, sync.syncNonce);
    hijo.send(firmar({ v: 1, kind: 'STATE', pairId: pareja, sender: 'CHILD', syncNonce: syncNuevo.syncNonce, bootId,
      childSessionId: randomUUID(), stateSeq: '1', lastAcceptedSeq: '0', lastCommandId: null,
      lastCommandPayloadSha256B64: null, lastResult: 'NONE', mode: 'LOCKED', reason: 'OK', remainingSec: null,
      networkValidated: true, channelHealthy: true, isDeviceOwner: false, lockTaskActive: false,
      commandNonce: randomBytes(32).toString('base64url') }, 'MESSAGE'), { binary: false });
    assert.equal(await dentroDe(leerLinea(), 15000), 'OK\tREINICIO_SIN_ACK_SESION_NUEVA_SIN_REPLAY');
    assert.equal(await dentroDe(terminado, 5000), 0);
    assert.equal(frames.length, 0);
    console.log(proceso
      ? 'OK: ACK omitido, proceso relay terminado abruptamente, cierre 1006 y nuevo PID en el mismo puerto; padre JVM reautenticado y sincronización sin replay.'
      : 'OK: ACK no emitido por hijo simulado, cierre 1012 y recreación de instancia WSS en el mismo proceso; padre JVM reautenticado, ticket viejo rechazado y nueva sincronización sin replay.');
    console.log('Solo RelayConnection/core; no prueba agotamiento de reintentos, persistencia/reconciliación de ControlPoliticas ni aplicación real.');
  } else {
    hijo.send(firmar({ v: 1, kind: 'ACK', pairId: pareja, sender: 'CHILD', bootId, childSessionId, commandId: orden.commandId,
      seq: orden.seq, commandPayloadSha256B64: documento.payloadSha256B64, result: 'ACCEPTED_PENDING_ENFORCEMENT',
      mode: 'LOCKED', reason: 'OK', remainingSec: null }, 'MESSAGE'), { binary: false });
    assert.equal(await dentroDe(leerLinea(), 15000), 'OK\tTLS_AUTH_PONG_SYNC_STATE_POLICY_ACK_FONDO');
    assert.equal(await dentroDe(terminado, 5000), 0);
    console.log('OK: transporte y RelayConnection JVM del padre → relay WSS local → hijo Node simulado; TLS no confiable rechazado, AUTH/PONG y cuatro tipos MESSAGE verificados.');
    console.log('No acredita APK, Keystore, ControlPoliticas, Device Owner ni aplicación de una orden; ACK solo simulado y pendiente de enforcement.');
  }
} finally {
  clearTimeout(limite); lectura.close(); jvm.kill();
  if (hijo) hijo.terminate();
  if (relay && relay.exitCode === null && relay.signalCode === null) {
    relay.kill('SIGKILL');
    await dentroDe(salidaRelay, 5000);
  }
  if (servidor?.listening) { const cerrado = once(servidor, 'close'); cerrarServidorHttp(servidor); await cerrado; }
}
