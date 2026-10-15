import type { IdentidadEncuentro } from '../../entities/identidad-encuentro.js';
import type { OfertaEncuentro } from '../../entities/oferta-encuentro.js';

export interface VerificacionEncuentroSalida {
  prueba(payloadB64: string, sigB64: string, connectionId: string, nonce: string, origen: string): IdentidadEncuentro;
  oferta(offerB64: string, publica: string): OfertaEncuentro;
  aceptacion(pairB64: string, padre: string, oferta: OfertaEncuentro, origen: string): void;
}
