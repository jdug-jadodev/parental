export type CodigoAutenticacion = 'BAD_SCHEMA' | 'BAD_SIGNATURE' | 'WRONG_PAIR' | 'WRONG_ROLE' |
  'STALE_NONCE' | 'RATE_LIMITED' | 'KEY_UNAVAILABLE';

export class FalloAutenticacion extends Error {
  constructor(readonly codigo: CodigoAutenticacion) { super('Autenticación rechazada'); }
}
