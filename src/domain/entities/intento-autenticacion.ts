export class IntentoAutenticacion {
  readonly #frame: Uint8Array;
  constructor(readonly connectionId: string, frame: Uint8Array) {
    this.#frame = new Uint8Array(frame);
    Object.freeze(this);
  }
  bytes(): Uint8Array { return new Uint8Array(this.#frame); }
}
