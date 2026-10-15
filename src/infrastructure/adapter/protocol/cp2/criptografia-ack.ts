import { createHash, createPublicKey, verify } from 'node:crypto';
import type { AckCp2 } from '../../../../application/dtos/ack-cp2.dto.js';
import { base64, publicaP256 } from '../formatos.js';
import { exigir } from '../json-estricto.js';
import { CodecAckCp2 } from './codec-ack.js';
import { bytesFirmaMessageCp2 } from './criptografia-ordenes.js';
import { MAX_FRAME_CP2, MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';

export interface AckFirmadoCp2 {
  readonly mensaje: AckCp2;
  readonly payloadSha256B64: string;
  bytesPayload(): Buffer;
  bytesFrame(): Buffer;
}

export class CriptografiaAckCp2 {
  constructor(private readonly codec: CodecAckCp2) {}
  verificar(bytes: Uint8Array, publicaHijoEsperada: string): AckFirmadoCp2 {
    exigir(bytes.length <= MAX_FRAME_CP2, 'Frame ACK CP/2 demasiado grande');
    const frame = Buffer.from(bytes);
    const sobre = this.codec.leerSobre(frame);
    const payload = base64(sobre.payloadB64, MAX_PAYLOAD_CP2);
    const spki = base64(publicaHijoEsperada, 150);
    publicaP256(spki);
    const clave = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    exigir(verify('sha256', bytesFirmaMessageCp2(payload), { key: clave, dsaEncoding: 'der' },
      base64(sobre.sigB64, 72)), 'Firma ACK CHILD CP/2 incorrecta');
    const mensaje = this.codec.leerAckSinVerificar(payload);
    return Object.freeze({ mensaje, payloadSha256B64: createHash('sha256').update(payload).digest('base64url'),
      bytesPayload: () => Buffer.from(payload), bytesFrame: () => Buffer.from(frame),
    });
  }
}
