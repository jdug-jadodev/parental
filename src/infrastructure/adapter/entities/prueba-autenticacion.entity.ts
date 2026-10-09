export class PruebaAutenticacionEntity {
  constructor(
    readonly connectionId: string,
    readonly nonce: string,
    readonly pairId: string,
    readonly role: 'PARENT' | 'CHILD',
  ) { Object.freeze(this); }
}
