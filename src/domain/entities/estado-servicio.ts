export class EstadoServicio {
  constructor(readonly operativo: boolean, readonly protocolo: 1 | 2 = 1) { Object.freeze(this); }
}
