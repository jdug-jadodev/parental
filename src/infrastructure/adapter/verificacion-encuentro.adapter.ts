import type { IdentidadEncuentro, OfertaEncuentro, VerificacionEncuentroSalida } from '../../domain/ports/portout/verificacion-encuentro.port.js';
import { CodecEncuentroC8 } from './protocol/c8/codec-encuentro.js';
import { CodecVinculacionCp2 } from './protocol/cp2/codec-vinculacion.js';
import { CriptografiaVinculacionCp2 } from './protocol/cp2/criptografia-vinculacion.js';
import { base64 } from './protocol/formatos.js';
import { exigir } from './protocol/json-estricto.js';

export class VerificacionEncuentroAdapter implements VerificacionEncuentroSalida {
  constructor(private readonly codec: CodecEncuentroC8, private readonly pairCodec: CodecVinculacionCp2,
    private readonly criptografia: CriptografiaVinculacionCp2) {}

  prueba(payload: string, firma: string, id: string, nonce: string, origen: string): IdentidadEncuentro {
    return this.codec.verificar(payload, firma, id, nonce, origen);
  }

  oferta(offerB64: string, publica: string): OfertaEncuentro {
    const oferta = this.pairCodec.leerOferta(base64(offerB64, 8192));
    exigir(oferta.childPublicKeyB64 === publica, 'Oferta de otra identidad');
    return { publica, enrollId: oferta.enrollId, enrollNonce: oferta.enrollNonce };
  }

  aceptacion(pairB64: string, padre: string, oferta: OfertaEncuentro, origen: string): void {
    const pair = this.criptografia.verificarAceptacion(base64(pairB64, 8192), padre).mensaje;
    exigir(pair.parentPublicKeyB64 === padre && pair.childPublicKeyB64 === oferta.publica &&
      pair.enrollId === oferta.enrollId && pair.enrollNonce === oferta.enrollNonce && pair.relayOrigin === origen,
    'Aceptación de otro encuentro');
  }
}
