import { once } from 'node:events';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import WebSocket from 'ws';
import { crearServidorEncuentroC8Local } from '../../dist/src/infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from '../../dist/src/infrastructure/config/servidor.config.js';
import { canonico } from '../../dist/src/infrastructure/adapter/protocol/json-estricto.js';
import { CodecVinculacionCp2 } from '../../dist/src/infrastructure/adapter/protocol/cp2/codec-vinculacion.js';
import { CriptografiaVinculacionCp2 } from '../../dist/src/infrastructure/adapter/protocol/cp2/criptografia-vinculacion.js';

const entrada = createInterface({ input: process.stdin, crlfDelay: Infinity });
const iterador = entrada[Symbol.asyncIterator]();
const limite = setTimeout(() => { process.stderr.write('INTEROP_TIMEOUT\n'); process.exit(1); }, 45000);
const bytes = (o) => Buffer.from(canonico(o));
const b64 = (o) => bytes(o).toString('base64url');
const emitir = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const comprobar = (condicion) => { if (!condicion) throw new Error('INTEROP_INVALID'); };
const leer = async () => {
  const linea = await iterador.next();
  comprobar(!linea.done && linea.value.length <= 65536);
  return JSON.parse(linea.value);
};
const codec = new CodecVinculacionCp2(readFileSync(new URL('../../contrato-cp2/vinculacion.schema.json', import.meta.url)));
const criptografia = new CriptografiaVinculacionCp2(codec);
const claves = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = claves.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
const sockets = new Set();
let servidor;

async function conectar(url, ca, origen, rol) {
  const socket = new WebSocket(url, 'c8.v1', { ca, perMessageDeflate: false });
  sockets.add(socket);
  const cola = [], pendientes = [];
  let cerrado = false;
  socket.on('error', () => socket.terminate());
  socket.on('close', () => {
    cerrado = true;
    sockets.delete(socket);
    for (const p of pendientes.splice(0)) p.rechazar(new Error('INTEROP_CLOSED'));
  });
  socket.on('message', (data, binario) => {
    if (binario) { socket.terminate(); return; }
    const m = JSON.parse(data.toString());
    const p = pendientes.shift();
    if (p) p.resolver(m); else cola.push(m);
  });
  const recibir = () => {
    if (cola.length) return Promise.resolve(cola.shift());
    if (cerrado) return Promise.reject(new Error('INTEROP_CLOSED'));
    return new Promise((resolver, rechazar) => pendientes.push({ resolver, rechazar }));
  };
  const enviar = (m) => socket.send(canonico(m), { binary: false });
  await once(socket, 'open');
  comprobar(socket.protocol === 'c8.v1' && socket.extensions === '');
  const reto = await recibir();
  comprobar(reto.kind === 'CHALLENGE' && reto.relayOrigin === origen);
  const payload = bytes({ v: 1, kind: 'PROOF', connectionId: reto.connectionId, nonceB64: reto.nonceB64,
    publicKeyB64: publica, relayOrigin: origen, role: rol });
  enviar({ v: 1, kind: 'AUTH', payloadB64: payload.toString('base64url'),
    sigB64: sign('sha256', Buffer.concat([Buffer.from('C8v1/PROOF\n'), payload]), claves.privateKey).toString('base64url') });
  comprobar((await recibir()).kind === 'READY');
  return { recibir, enviar };
}

try {
  const init = await leer();
  comprobar(init.role === 'PARENT' || init.role === 'CHILD');
  comprobar(Number.isInteger(init.port) && init.port > 0 && init.port <= 65535);
  comprobar(typeof init.certPem === 'string' && init.certPem.length < 16384 && typeof init.keyPem === 'string' && init.keyPem.length < 16384);
  const origen = `https://127.0.0.1:${init.port}`;
  servidor = crearServidorEncuentroC8Local({ RELAY_MODE: 'c8-local', NODE_ENV: 'test', PUBLIC_ORIGIN: origen },
    { cert: init.certPem, key: init.keyPem });
  delete init.keyPem;
  servidor.listen(init.port, '127.0.0.1');
  await once(servidor, 'listening');
  const peer = await conectar(`wss://127.0.0.1:${init.port}/pair`, init.certPem, origen, init.role === 'PARENT' ? 'CHILD' : 'PARENT');
  if (init.role === 'PARENT') {
    const oferta = { v: 2, kind: 'CHILD_OFFER', protocol: 'cp.v2', childPublicKeyB64: publica,
      enrollId: randomUUID(), enrollNonce: randomBytes(32).toString('base64url') };
    const offerB64 = b64(oferta);
    peer.enviar({ v: 1, kind: 'PUBLISH', offerB64, ttlMs: 120000 });
    const codigo = await peer.recibir();
    comprobar(codigo.kind === 'CODE');
    emitir({ event: 'READY', origin: origen, peerPublicKeyB64: publica, offerB64, code: codigo.code });
    const reclamado = await peer.recibir();
    comprobar(reclamado.kind === 'CLAIMED');
    const recibida = await peer.recibir();
    comprobar(recibida.kind === 'PAIR');
    const frame = Buffer.from(recibida.pairB64, 'base64url');
    const pair = criptografia.verificarAceptacion(frame, reclamado.parentPublicKeyB64).mensaje;
    comprobar(pair.childPublicKeyB64 === publica && pair.enrollId === oferta.enrollId &&
      pair.enrollNonce === oferta.enrollNonce && pair.relayOrigin === origen);
    emitir({ event: 'PAIR_RECEIVED', pairSha256B64: createHash('sha256').update(frame).digest('base64url'),
      parentPublicKeyB64: pair.parentPublicKeyB64 });
  } else {
    emitir({ event: 'READY', origin: origen, peerPublicKeyB64: publica });
    const reclamar = await leer();
    comprobar(reclamar.event === 'CLAIM' && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(reclamar.code));
    peer.enviar({ v: 1, kind: 'CLAIM', code: reclamar.code });
    const recibida = await peer.recibir();
    comprobar(recibida.kind === 'OFFER');
    const oferta = codec.leerOferta(Buffer.from(recibida.offerB64, 'base64url'));
    const hash = () => randomBytes(32).toString('base64url');
    const payload = bytes({ v: 2, kind: 'PAIR_ACCEPT', protocol: 'cp.v2', pairId: randomUUID(), enrollId: oferta.enrollId,
      enrollNonce: oferta.enrollNonce, childPublicKeyB64: oferta.childPublicKeyB64, parentPublicKeyB64: publica,
      relayOrigin: origen, recoveryHashes: { MAINTENANCE: hash(), RECOVER_PARENT: hash(), RETIRE: hash() } });
    const frame = bytes({ v: 2, kind: 'SIGNED', purpose: 'PAIR', payloadB64: payload.toString('base64url'),
      sigB64: sign('sha256', Buffer.concat([Buffer.from('CPv2/PAIR\n'), payload]), claves.privateKey).toString('base64url') });
    criptografia.verificarAceptacion(frame, publica);
    peer.enviar({ v: 1, kind: 'SEND_PAIR', pairB64: frame.toString('base64url') });
    comprobar((await peer.recibir()).kind === 'SENT');
    emitir({ event: 'PAIR_SENT', pairSha256B64: createHash('sha256').update(frame).digest('base64url'), parentPublicKeyB64: publica });
  }
  comprobar((await leer()).event === 'DONE');
  emitir({ event: 'DONE' });
} catch {
  process.stderr.write('INTEROP_FAILED\n');
  process.exitCode = 1;
} finally {
  clearTimeout(limite);
  entrada.close();
  for (const socket of sockets) socket.terminate();
  if (servidor) {
    const cerrado = once(servidor, 'close');
    cerrarServidorHttp(servidor);
    await cerrado;
  }
}
