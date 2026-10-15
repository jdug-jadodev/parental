import type { Configuracion } from '../../domain/entities/configuracion.js';
import type { RolAutenticado } from '../../domain/entities/conexion-autenticada.js';
import type { MensajeRelay } from '../../domain/entities/mensaje-relay.js';
import { FalloRelay } from '../../domain/entities/fallo-relay.js';
import type { VerificacionMensajeSalida } from '../../domain/ports/portout/verificacion-mensaje.port.js';
import { MensajeVerificadoEntity } from './entities/mensaje-verificado.entity.js';
import { RelayMapper } from './mapper/relay.mapper.js';
import { base64 } from './protocol/formatos.js';
import { exigir, leerJsonEstricto, utf8Estricto } from './protocol/json-estricto.js';
import { CriptografiaOrdenesCp2 } from './protocol/cp2/criptografia-ordenes.js';
import { CriptografiaAckCp2 } from './protocol/cp2/criptografia-ack.js';
import { CriptografiaStateCp2 } from './protocol/cp2/criptografia-state.js';
import { CodecAckCp2 } from './protocol/cp2/codec-ack.js';

export class VerificacionMensajeCp2Adapter implements VerificacionMensajeSalida {
  constructor(private readonly configuracion: Configuracion,
    private readonly ordenes: CriptografiaOrdenesCp2,
    private readonly ack: CriptografiaAckCp2,
    private readonly state: CriptografiaStateCp2,
    private readonly codecSobre: CodecAckCp2) {}

  verificar(frame: Uint8Array, rol: RolAutenticado): MensajeRelay {
    try {
      if (rol === 'PARENT') {
        const mensaje = this.ordenes.verificar(frame, this.configuracion.publicaPadre).mensaje;
        return RelayMapper.mensaje(new MensajeVerificadoEntity(mensaje.kind, mensaje.pairId, mensaje.sender,
          mensaje.kind === 'SET_POLICY' ? mensaje.commandId : null), frame);
      }
      const sobre = this.codecSobre.leerSobre(frame);
      const payload = leerJsonEstricto(utf8Estricto(base64(sobre.payloadB64, 8192)));
      exigir(payload !== null && typeof payload === 'object' && !Array.isArray(payload), 'Payload CHILD inválido');
      exigir(payload.kind === 'ACK' || payload.kind === 'STATE', 'Tipo CHILD inválido');
      const mensaje = payload.kind === 'ACK' ? this.ack.verificar(frame, this.configuracion.publicaHijo).mensaje
        : this.state.verificar(frame, this.configuracion.publicaHijo).mensaje;
      return RelayMapper.mensaje(new MensajeVerificadoEntity(mensaje.kind, mensaje.pairId, mensaje.sender,
        mensaje.kind === 'ACK' ? mensaje.commandId : null), frame);
    } catch { throw new FalloRelay('BAD_SCHEMA'); }
  }
}
