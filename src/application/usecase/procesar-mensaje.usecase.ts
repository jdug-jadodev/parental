import type { ConexionAutenticada } from '../../domain/entities/conexion-autenticada.js';
import type { MensajeRelay } from '../../domain/entities/mensaje-relay.js';
import { FalloRelay } from '../../domain/entities/fallo-relay.js';
import type { ProcesarMensajeEntrada } from '../../domain/ports/portin/procesar-mensaje.port.js';
import type { VerificacionMensajeSalida } from '../../domain/ports/portout/verificacion-mensaje.port.js';

export class ProcesarMensaje implements ProcesarMensajeEntrada {
  constructor(private readonly verificacion: VerificacionMensajeSalida) {}
  ejecutar(conexion: ConexionAutenticada, frame: Uint8Array): MensajeRelay {
    const mensaje = this.verificacion.verificar(frame, conexion.rol);
    if (mensaje.tipo === 'PING') return mensaje;
    if (mensaje.pareja !== conexion.pareja) throw new FalloRelay('WRONG_PAIR');
    if (mensaje.emisor !== conexion.rol) throw new FalloRelay('WRONG_ROLE');
    const padre = mensaje.tipo === 'SET_POLICY' || mensaje.tipo === 'SYNC_REQUEST';
    if (padre !== (conexion.rol === 'PARENT')) throw new FalloRelay('WRONG_ROLE');
    return mensaje;
  }
}
