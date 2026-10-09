import type { RolAutenticado } from '../../entities/conexion-autenticada.js';
import type { MensajeRelay } from '../../entities/mensaje-relay.js';

export interface VerificacionMensajeSalida {
  verificar(frame: Uint8Array, rol: RolAutenticado): MensajeRelay;
}
