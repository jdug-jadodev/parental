export class MensajeVerificadoEntity {
  constructor(
    readonly kind: 'SYNC_REQUEST' | 'SET_POLICY' | 'STATE' | 'ACK',
    readonly pairId: string,
    readonly sender: 'PARENT' | 'CHILD',
    readonly commandId: string | null,
  ) { Object.freeze(this); }
}
