export class EstadoServicio {
  readonly protocolo = 1;
  constructor(readonly operativo: boolean) { Object.freeze(this); }
}

export class ConsultaServicio {
  constructor(readonly metodo: string, readonly ruta: string) { Object.freeze(this); }
  esSalud(): boolean { return this.metodo === 'GET' && this.ruta === '/healthz'; }
}

export class ResultadoConsulta {
  constructor(readonly tipo: 'SALUD' | 'NO_ENCONTRADO', readonly estado: EstadoServicio) {
    Object.freeze(this);
  }
}
