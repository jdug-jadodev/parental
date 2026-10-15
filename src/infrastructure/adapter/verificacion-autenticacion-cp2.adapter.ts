import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import type { Configuracion } from '../../domain/entities/configuracion.js';
import { FalloAutenticacion } from '../../domain/entities/fallo-autenticacion.js';
import type { PruebaAutenticacion } from '../../domain/entities/prueba-autenticacion.js';
import type { VerificacionAutenticacionSalida } from '../../domain/ports/portout/verificacion-autenticacion.port.js';
import { PruebaAutenticacionEntity } from './entities/prueba-autenticacion.entity.js';
import { AutenticacionMapper } from './mapper/autenticacion.mapper.js';
import { CodecAutenticacionCp2 } from './protocol/cp2/codec-autenticacion.js';
import { bytesFirmaAuthCp2 } from './protocol/cp2/criptografia-autenticacion.js';
import { MAX_PAYLOAD_CP2 } from './protocol/cp2/codec-vinculacion.js';
import { base64, publicaP256 } from './protocol/formatos.js';

export class VerificacionAutenticacionCp2Adapter implements VerificacionAutenticacionSalida {
  private readonly claves: readonly { readonly rol: 'PARENT' | 'CHILD'; readonly publica: KeyObject }[];

  constructor(private readonly codec: CodecAutenticacionCp2, configuracion: Configuracion) {
    this.claves = (['PARENT', 'CHILD'] as const).map((rol) => {
      const spki = base64(rol === 'PARENT' ? configuracion.publicaPadre : configuracion.publicaHijo, 150);
      publicaP256(spki);
      return Object.freeze({ rol, publica: createPublicKey({ key: spki, format: 'der', type: 'spki' }) });
    });
  }

  verificar(frame: Uint8Array): PruebaAutenticacion {
    try {
      const sobre = this.codec.leerFrame(frame);
      if (sobre.kind !== 'SIGNED') throw new FalloAutenticacion('BAD_SCHEMA');
      const payload = base64(sobre.payloadB64, MAX_PAYLOAD_CP2);
      const firma = base64(sobre.sigB64, 72);
      for (const clave of this.claves) {
        if (!verify('sha256', bytesFirmaAuthCp2(payload), { key: clave.publica, dsaEncoding: 'der' }, firma)) continue;
        const prueba = this.codec.leerPruebaSinVerificar(payload);
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
