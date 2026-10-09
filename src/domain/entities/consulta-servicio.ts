export type TipoConsulta = 'SALUD' | 'KEEPALIVE';

export class ConsultaServicio {
  constructor(readonly tipo: TipoConsulta) { Object.freeze(this); }
}
