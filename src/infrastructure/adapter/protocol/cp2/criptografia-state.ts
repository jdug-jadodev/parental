import { createHash, createPublicKey, verify } from 'node:crypto';
import type { StateCp2 } from '../../../../application/dtos/state-cp2.dto.js';
import { base64, publicaP256 } from '../formatos.js';
import { exigir } from '../json-estricto.js';
import { CodecStateCp2 } from './codec-state.js';
import { bytesFirmaMessageCp2 } from './criptografia-ordenes.js';
import { MAX_FRAME_CP2, MAX_PAYLOAD_CP2 } from './codec-vinculacion.js';

export interface StateFirmadoCp2 {
  readonly mensaje: StateCp2;
  readonly payloadSha256B64: string;
  bytesPayload(): Buffer;
  bytesFrame(): Buffer;
}
export class CriptografiaStateCp2 {
  constructor(private readonly codec: CodecStateCp2) {}
  verificar(bytes: Uint8Array, publicaHijoEsperada: string): StateFirmadoCp2 {
    exigir(bytes.length <= MAX_FRAME_CP2, 'Frame STATE demasiado grande');
    const frame = Buffer.from(bytes);
    const sobre = this.codec.leerSobre(frame);
    const payload = base64(sobre.payloadB64, MAX_PAYLOAD_CP2);
    const spki = base64(publicaHijoEsperada, 150); publicaP256(spki);
    exigir(verify('sha256', bytesFirmaMessageCp2(payload), { key: createPublicKey({ key: spki, type: 'spki', format: 'der' }),
      dsaEncoding: 'der' }, base64(sobre.sigB64, 72)), 'Firma STATE CHILD incorrecta');
    const mensaje = this.codec.leerStateSinVerificar(payload);
    return Object.freeze({ mensaje, payloadSha256B64: createHash('sha256').update(payload).digest('base64url'),
      bytesPayload: () => Buffer.from(payload), bytesFrame: () => Buffer.from(frame) });
  }
}
