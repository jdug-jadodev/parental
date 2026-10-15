import { createHash, createPublicKey, verify } from 'node:crypto';
import type { PruebaAutenticacionCp2, RolCp2 } from '../../../../application/dtos/autenticacion-cp2.dto.js';
import { base64, publicaP256 } from '../formatos.js';
import { exigir } from '../json-estricto.js';
import { CodecAutenticacionCp2 } from './codec-autenticacion.js';
import { MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';

export function bytesFirmaAuthCp2(payload: Uint8Array): Buffer {
  return Buffer.concat([Buffer.from('CPv2/AUTH\n', 'utf8'), Buffer.from(payload)]);
}

export interface PruebaFirmadaCp2 {
  readonly mensaje: PruebaAutenticacionCp2;
  readonly payloadSha256B64: string;
  bytesPayload(): Buffer;
  bytesFrame(): Buffer;
}

export class CriptografiaAutenticacionCp2 {
  constructor(private readonly codec: CodecAutenticacionCp2) {}

  verificarPrueba(bytes: Uint8Array, publicaEsperada: string, rolEsperado: RolCp2): PruebaFirmadaCp2 {
    exigir(rolEsperado === 'PARENT' || rolEsperado === 'CHILD', 'Rol esperado inválido');
    const frame = Buffer.from(bytes);
    const sobre = this.codec.leerFrame(frame);
    exigir(sobre.kind === 'SIGNED', 'Se esperaba sobre AUTH CP/2');
    const payload = base64(sobre.payloadB64, MAX_PAYLOAD_CP2);
    const spki = base64(publicaEsperada, 150);
    publicaP256(spki);
    const clave = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    exigir(verify('sha256', bytesFirmaAuthCp2(payload), { key: clave, dsaEncoding: 'der' },
      base64(sobre.sigB64, 72)), 'Firma AUTH CP/2 incorrecta');
    const mensaje = this.codec.leerPruebaSinVerificar(payload);
    exigir(mensaje.role === rolEsperado, 'Rol AUTH distinto del esperado');
    return Object.freeze({ mensaje,
      payloadSha256B64: createHash('sha256').update(payload).digest('base64url'),
      bytesPayload: () => Buffer.from(payload), bytesFrame: () => Buffer.from(frame),
    });
  }
}
