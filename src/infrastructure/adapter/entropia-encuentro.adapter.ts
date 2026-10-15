import { randomBytes, randomUUID } from 'node:crypto';
import type { EntropiaEncuentroSalida } from '../../domain/ports/portout/entropia-encuentro.port.js';

export class EntropiaEncuentroAdapter implements EntropiaEncuentroSalida {
  identificador(): string { return randomUUID(); }
  nonce(): string { return randomBytes(32).toString('base64url'); }
  codigo(): string {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return [...randomBytes(8)].map((valor) => alfabeto[valor & 31]!).join('');
  }
}
