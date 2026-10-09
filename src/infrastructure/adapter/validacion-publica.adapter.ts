import type { ValidacionPublicaSalida } from '../../domain/ports/portout/validacion-publica.port.js';
import { ClaveVerificacion } from './protocol/crypto-protocol.js';
import { origenHttps } from './protocol/formatos.js';

export class ValidacionPublicaAdapter implements ValidacionPublicaSalida {
  validarOrigen(origen: string): void {
    try { origenHttps(origen); } catch { throw new Error('PUBLIC_ORIGIN inválido'); }
  }
  validarClave(rol: 'PARENT' | 'CHILD', publica: string): void {
    try { ClaveVerificacion.desdeSpki(rol, publica); }
    catch { throw new Error(`Clave pública ${rol} inválida`); }
  }
}
