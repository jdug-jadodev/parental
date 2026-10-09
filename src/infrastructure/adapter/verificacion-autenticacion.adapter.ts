import type { Configuracion } from '../../domain/entities/configuracion.js';
import type { PruebaAutenticacion } from '../../domain/entities/prueba-autenticacion.js';
import { FalloAutenticacion } from '../../domain/entities/fallo-autenticacion.js';
import type { VerificacionAutenticacionSalida } from '../../domain/ports/portout/verificacion-autenticacion.port.js';
import { PruebaAutenticacionEntity } from './entities/prueba-autenticacion.entity.js';
import { AutenticacionMapper } from './mapper/autenticacion.mapper.js';
import { CodecProtocolo } from './protocol/codec-protocolo.js';
import { bytesFirma, ClaveVerificacion, FirmaInvalida } from './protocol/crypto-protocol.js';
import { base64 } from './protocol/formatos.js';

export class VerificacionAutenticacionAdapter implements VerificacionAutenticacionSalida {
  private readonly claves: readonly ClaveVerificacion[];
  constructor(private readonly codec: CodecProtocolo, configuracion: Configuracion) {
    this.claves = [
      ClaveVerificacion.desdeSpki('PARENT', configuracion.publicaPadre),
      ClaveVerificacion.desdeSpki('CHILD', configuracion.publicaHijo),
    ];
  }
  verificar(frame: Uint8Array): PruebaAutenticacion {
    try {
      const sobre = this.codec.leerFrame(frame);
      if (sobre.kind !== 'SIGNED' || sobre.purpose !== 'AUTH') throw new FalloAutenticacion('BAD_SCHEMA');
      const payload = this.codec.bytesPayload(sobre);
      const firma = base64(sobre.sigB64, 75);
      for (const clave of this.claves) {
        try { clave.comprobar(bytesFirma('AUTH', payload), firma); }
        catch (error) { if (error instanceof FirmaInvalida) continue; throw error; }
        const prueba = this.codec.leerPayloadSinVerificar(payload, 'AUTH');
        if (prueba.kind !== 'AUTH_PROOF') throw new FalloAutenticacion('BAD_SCHEMA');
        if (prueba.role !== clave.rol) throw new FalloAutenticacion('WRONG_ROLE');
        return AutenticacionMapper.aDominio(new PruebaAutenticacionEntity(
          prueba.connectionId, prueba.nonce, prueba.pairId, prueba.role,
        ));
      }
      throw new FalloAutenticacion('BAD_SIGNATURE');
    } catch (error) {
      if (error instanceof FalloAutenticacion) throw error;
      throw new FalloAutenticacion('BAD_SCHEMA');
    }
  }
}
