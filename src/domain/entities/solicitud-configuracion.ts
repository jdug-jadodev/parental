export type ValoresConfiguracion = Readonly<Record<string, string | undefined>>;

export class SolicitudConfiguracion {
  readonly valores: ValoresConfiguracion;
  constructor(valores: ValoresConfiguracion) {
    this.valores = Object.freeze({ ...valores });
    Object.freeze(this);
  }
}
