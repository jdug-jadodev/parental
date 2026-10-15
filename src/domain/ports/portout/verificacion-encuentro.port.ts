export interface IdentidadEncuentro {
  readonly rol: 'CHILD' | 'PARENT';
  readonly publica: string;
}

export interface OfertaEncuentro {
  readonly publica: string;
  readonly enrollId: string;
  readonly enrollNonce: string;
}

export interface VerificacionEncuentroSalida {
  prueba(payloadB64: string, sigB64: string, connectionId: string, nonce: string, origen: string): IdentidadEncuentro;
  oferta(offerB64: string, publica: string): OfertaEncuentro;
  aceptacion(pairB64: string, padre: string, oferta: OfertaEncuentro, origen: string): void;
}
