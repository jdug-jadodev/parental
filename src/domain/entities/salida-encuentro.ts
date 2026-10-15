export class SalidaEncuentro {
  constructor(readonly conexion: string,
    readonly tipo: 'CHALLENGE' | 'READY' | 'SENT' | 'UNAVAILABLE' | 'CODE' | 'OFFER' | 'CLAIMED' | 'PAIR',
    readonly datos: Readonly<Record<string, string | number>> = {}, readonly cerrar = false) {}
}
