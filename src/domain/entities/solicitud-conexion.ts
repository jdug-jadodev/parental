export class SolicitudConexion {
  constructor(
    readonly metodo: string,
    readonly ruta: string,
    readonly origen: string | undefined,
    readonly subprotocolo: string | undefined,
  ) { Object.freeze(this); }
}
