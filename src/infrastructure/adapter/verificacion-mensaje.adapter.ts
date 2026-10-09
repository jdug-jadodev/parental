import type { Configuracion } from '../../domain/entities/configuracion.js';
import type { RolAutenticado } from '../../domain/entities/conexion-autenticada.js';
import type { MensajeRelay } from '../../domain/entities/mensaje-relay.js';
import { FalloRelay } from '../../domain/entities/fallo-relay.js';
import type { VerificacionMensajeSalida } from '../../domain/ports/portout/verificacion-mensaje.port.js';
import { CodecProtocolo } from './protocol/codec-protocolo.js';
import { bytesFirma, ClaveVerificacion, FirmaInvalida } from './protocol/crypto-protocol.js';
import { base64 } from './protocol/formatos.js';
import { RelayMapper } from './mapper/relay.mapper.js';
import { MensajeVerificadoEntity } from './entities/mensaje-verificado.entity.js';

export class VerificacionMensajeAdapter implements VerificacionMensajeSalida {
  private readonly claves: Readonly<Record<RolAutenticado, ClaveVerificacion>>;
  constructor(private readonly codec: CodecProtocolo, configuracion: Configuracion) {
    this.claves = {
      PARENT: ClaveVerificacion.desdeSpki('PARENT', configuracion.publicaPadre),
      CHILD: ClaveVerificacion.desdeSpki('CHILD', configuracion.publicaHijo),
    };
  }
  verificar(frame: Uint8Array, rol: RolAutenticado): MensajeRelay {
    try {
      const sobre = this.codec.leerFrame(frame);
      if (sobre.kind === 'PING') return RelayMapper.latido(sobre.nonce, frame);
      if (sobre.kind !== 'SIGNED' || sobre.purpose !== 'MESSAGE') throw new FalloRelay('BAD_SCHEMA');
      const bytes = this.codec.bytesPayload(sobre);
      this.claves[rol].comprobar(bytesFirma('MESSAGE', bytes), base64(sobre.sigB64, 75));
      const payload = this.codec.leerPayloadSinVerificar(bytes, 'MESSAGE');
      if (payload.kind !== 'SYNC_REQUEST' && payload.kind !== 'SET_POLICY' && payload.kind !== 'STATE' && payload.kind !== 'ACK') {
        throw new FalloRelay('BAD_SCHEMA');
      }
      return RelayMapper.mensaje(new MensajeVerificadoEntity(payload.kind, payload.pairId, payload.sender,
        'commandId' in payload ? payload.commandId : null), frame);
    } catch (error) {
      if (error instanceof FalloRelay) throw error;
      throw new FalloRelay(error instanceof FirmaInvalida ? 'BAD_SIGNATURE' : 'BAD_SCHEMA');
    }
  }
}
