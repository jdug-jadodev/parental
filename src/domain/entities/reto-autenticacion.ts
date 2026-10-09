export class RetoAutenticacion {
  readonly timeoutSec = 10;
  readonly venceEn: number;
  constructor(readonly connectionId: string, readonly nonce: string, creadoEn: number) {
    this.venceEn = creadoEn + this.timeoutSec * 1000;
    Object.freeze(this);
  }
}
