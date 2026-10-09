export class SolicitudConexion {
  constructor(
    readonly metodo: string,
    readonly ruta: string,
    readonly origen: string | undefined,
    readonly subprotocolo: string | undefined,
  ) { Object.freeze(this); }

  esValida(): boolean {
    return this.metodo === 'GET' && this.ruta === '/ws' &&
      this.origen === undefined && this.subprotocolo === 'cp.v1';
  }
}

export class DecisionConexion {
  constructor(readonly motivo: 'SOLICITUD_INVALIDA' | 'NO_DISPONIBLE') { Object.freeze(this); }
}
