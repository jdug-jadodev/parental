import { createHash, createPublicKey, verify } from 'node:crypto';
import type { MensajePadreCp2 } from '../../../../application/dtos/ordenes-cp2.dto.js';
import { base64, publicaP256 } from '../formatos.js';
import { exigir } from '../json-estricto.js';
import { CodecOrdenesCp2 } from './codec-ordenes.js';
import { MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';

export function bytesFirmaMessageCp2(payload: Uint8Array): Buffer {
  return Buffer.concat([Buffer.from('CPv2/MESSAGE\n', 'utf8'), Buffer.from(payload)]);
}

export interface MensajePadreFirmadoCp2 {
  readonly mensaje: MensajePadreCp2;
  readonly payloadSha256B64: string;
  bytesPayload(): Buffer;
  bytesFrame(): Buffer;
}

export class CriptografiaOrdenesCp2 {
  constructor(private readonly codec: CodecOrdenesCp2) {}

  verificar(bytes: Uint8Array, publicaPadreEsperada: string): MensajePadreFirmadoCp2 {
    exigir(bytes.length <= 16384, 'Frame MESSAGE CP/2 demasiado grande');
    const frame = Buffer.from(bytes);
    const sobre = this.codec.leerSobre(frame);
    const payload = base64(sobre.payloadB64, MAX_PAYLOAD_CP2);
    const spki = base64(publicaPadreEsperada, 150);
    publicaP256(spki);
    const clave = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    exigir(verify('sha256', bytesFirmaMessageCp2(payload), { key: clave, dsaEncoding: 'der' },
      base64(sobre.sigB64, 72)), 'Firma MESSAGE CP/2 incorrecta');
    const mensaje = this.codec.leerMensajeSinVerificar(payload);
    return Object.freeze({ mensaje,
      payloadSha256B64: createHash('sha256').update(payload).digest('base64url'),
      bytesPayload: () => Buffer.from(payload), bytesFrame: () => Buffer.from(frame),
    });
  }
}
