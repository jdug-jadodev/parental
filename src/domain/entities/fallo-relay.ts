export type CodigoRelay = 'BAD_SCHEMA' | 'BAD_SIGNATURE' | 'WRONG_PAIR' | 'WRONG_ROLE' | 'RATE_LIMITED';

export class FalloRelay extends Error {
  constructor(readonly codigo: CodigoRelay) { super('Mensaje rechazado'); }
}
