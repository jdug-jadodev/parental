import { randomBytes, randomUUID } from 'node:crypto';
import type { EntropiaSalida } from '../../domain/ports/portout/entropia.port.js';

export class EntropiaAdapter implements EntropiaSalida {
  identificador(): string { return randomUUID(); }
  nonce(): string { return randomBytes(32).toString('base64url'); }
}
