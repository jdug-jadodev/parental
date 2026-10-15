import { EntradaEncuentro } from '../../domain/entities/entrada-encuentro.js';
import type { SalidaEncuentro } from '../../domain/entities/salida-encuentro.js';
import type { MensajeClienteC8, MensajeServidorC8, SalidaEncuentroC8 } from '../dtos/encuentro-c8.dto.js';

export class EncuentroC8Mapper {
  static aDominio(mensaje: MensajeClienteC8): EntradaEncuentro {
    switch (mensaje.kind) {
      case 'AUTH': return new EntradaEncuentro('AUTH', mensaje.payloadB64, mensaje.sigB64);
      case 'PUBLISH': return new EntradaEncuentro('PUBLISH', mensaje.offerB64, undefined, mensaje.ttlMs);
      case 'CLAIM': return new EntradaEncuentro('CLAIM', undefined, undefined, undefined, mensaje.code);
      case 'SEND_PAIR': return new EntradaEncuentro('SEND_PAIR', mensaje.pairB64);
      case 'CANCEL': return new EntradaEncuentro('CANCEL');
    }
  }

  static aDto(salida: SalidaEncuentro): SalidaEncuentroC8 {
    return { connectionId: salida.conexion, mensaje: { v: 1, kind: salida.tipo, ...salida.datos } as MensajeServidorC8,
      cerrar: salida.cerrar };
  }
}
