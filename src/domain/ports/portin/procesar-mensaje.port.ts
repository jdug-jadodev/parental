import type { ConexionAutenticada } from '../../entities/conexion-autenticada.js';
import type { MensajeRelay } from '../../entities/mensaje-relay.js';

export interface ProcesarMensajeEntrada {
  ejecutar(conexion: ConexionAutenticada, frame: Uint8Array): MensajeRelay;
}
