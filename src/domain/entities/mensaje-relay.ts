import type { RolAutenticado } from './conexion-autenticada.js';

export type TipoMensajeRelay = 'PING' | 'SYNC_REQUEST' | 'SET_POLICY' | 'STATE' | 'ACK';

export class MensajeRelay {
  readonly #frame: Uint8Array;
  constructor(
    readonly tipo: TipoMensajeRelay,
    readonly pareja: string | null,
    readonly emisor: RolAutenticado | null,
    readonly nonce: string | null,
    readonly commandId: string | null,
    frame: Uint8Array,
  ) { this.#frame = new Uint8Array(frame); Object.freeze(this); }
  bytes(): Uint8Array { return new Uint8Array(this.#frame); }
}
