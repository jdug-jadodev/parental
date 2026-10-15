import { createHash, createPublicKey, verify } from 'node:crypto';
import type { AceptacionVinculoCp2 } from '../../../../application/dtos/vinculacion-cp2.dto.js';
import { base64, publicaP256 } from '../formatos.js';
import { exigir } from '../json-estricto.js';
import { CodecVinculacionCp2 } from './codec-vinculacion.js';

export function bytesFirmaPairCp2(payload: Uint8Array): Buffer {
  return Buffer.concat([Buffer.from('CPv2/PAIR\n', 'utf8'), Buffer.from(payload)]);
}

export interface AceptacionFirmadaCp2 {
  readonly mensaje: AceptacionVinculoCp2;
  readonly payloadSha256B64: string;
  bytesPayload(): Buffer;
  bytesFrame(): Buffer;
}

export class CriptografiaVinculacionCp2 {
  constructor(private readonly codec: CodecVinculacionCp2) {}

  verificarAceptacion(bytes: Uint8Array, publicaPadreEsperada: string): AceptacionFirmadaCp2 {
    const frame = Buffer.from(bytes);
    const sobre = this.codec.leerSobrePair(frame);
    const payload = base64(sobre.payloadB64, 8192);
    const spki = base64(publicaPadreEsperada, 150);
    publicaP256(spki);
    const clave = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    exigir(verify('sha256', bytesFirmaPairCp2(payload), { key: clave, dsaEncoding: 'der' },
      base64(sobre.sigB64, 72)), 'Firma PAIR CP/2 incorrecta');
    const mensaje = this.codec.leerAceptacionSinVerificar(payload);
    exigir(mensaje.parentPublicKeyB64 === publicaPadreEsperada, 'Pública padre distinta de la esperada');
    return Object.freeze({
      mensaje,
      payloadSha256B64: createHash('sha256').update(payload).digest('base64url'),
      bytesPayload: () => Buffer.from(payload),
      bytesFrame: () => Buffer.from(frame),
    });
  }
}
