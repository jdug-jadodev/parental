export class EstadoServicio {
  readonly protocolo = 1;
  constructor(readonly operativo: boolean) { Object.freeze(this); }
}
