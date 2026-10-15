import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';

const canonico = (valor) => {
  if (Array.isArray(valor)) return '[' + valor.map(canonico).join(',') + ']';
  if (valor !== null && typeof valor === 'object') {
    return '{' + Object.keys(valor).sort().map((clave) => JSON.stringify(clave) + ':' + canonico(valor[clave])).join(',') + '}';
  }
  return JSON.stringify(valor);
};
const padre = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const hijo = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publica = (clave) => clave.export({ type: 'spki', format: 'der' }).toString('base64url');
const nonce = () => randomBytes(32).toString('base64url');
const parentPublicKeyB64 = publica(padre.publicKey);
const childPublicKeyB64 = publica(hijo.publicKey);
const oferta = { v: 2, kind: 'CHILD_OFFER', protocol: 'cp.v2', childPublicKeyB64,
  enrollId: randomUUID(), enrollNonce: nonce() };
const aceptacion = { v: 2, kind: 'PAIR_ACCEPT', protocol: 'cp.v2', pairId: randomUUID(),
  enrollId: oferta.enrollId, enrollNonce: oferta.enrollNonce, parentPublicKeyB64, childPublicKeyB64,
  relayOrigin: 'https://relay.example:443',
  recoveryHashes: { MAINTENANCE: nonce(), RECOVER_PARENT: nonce(), RETIRE: nonce() } };
const sobre = (payload, purpose, privada) => {
  const bytes = Buffer.from(canonico(payload));
  const dominio = Buffer.concat([Buffer.from('CPv2/' + purpose + '\n'), bytes]);
  return canonico({ v: 2, kind: 'SIGNED', purpose, payloadB64: bytes.toString('base64url'),
    sigB64: sign('sha256', dominio, { key: privada, dsaEncoding: 'der' }).toString('base64url') });
};
const auth = (role, privada) => sobre({ v: 2, kind: 'AUTH_PROOF', protocol: 'cp.v2',
  pairId: aceptacion.pairId, role, connectionId: randomUUID(), nonce: nonce() }, 'AUTH', privada);
console.log(JSON.stringify({ fixture: 'CP2_PUBLICO_EFIMERO_SIN_AUTORIDAD',
  parentPublicKeyB64, childPublicKeyB64, childOfferUtf8: canonico(oferta),
  pairFrameUtf8: sobre(aceptacion, 'PAIR', padre.privateKey),
  pairPayloadSha256B64: createHash('sha256').update(canonico(aceptacion)).digest('base64url'),
  authParentFrameUtf8: auth('PARENT', padre.privateKey), authChildFrameUtf8: auth('CHILD', hijo.privateKey) }, null, 2));
