import { RetoAutenticacion } from '../../domain/entities/reto-autenticacion.js';
import { ConexionAutenticada } from '../../domain/entities/conexion-autenticada.js';
import { FalloAutenticacion } from '../../domain/entities/fallo-autenticacion.js';
import type { IntentoAutenticacion } from '../../domain/entities/intento-autenticacion.js';
import type { AutenticarConexionEntrada } from '../../domain/ports/portin/autenticar-conexion.port.js';
import type { RetosAutenticacionSalida } from '../../domain/ports/portout/retos-autenticacion.port.js';
import type { RelojSalida } from '../../domain/ports/portout/reloj.port.js';
import type { EntropiaSalida } from '../../domain/ports/portout/entropia.port.js';
import type { VerificacionAutenticacionSalida } from '../../domain/ports/portout/verificacion-autenticacion.port.js';
import { validarPrueba } from '../validations/autenticacion.validation.js';

export class AutenticarConexion implements AutenticarConexionEntrada {
  constructor(
    private readonly pareja: string,
    private readonly retos: RetosAutenticacionSalida,
    private readonly reloj: RelojSalida,
    private readonly entropia: EntropiaSalida,
    private readonly verificacion: VerificacionAutenticacionSalida,
  ) {}
  abrir(): RetoAutenticacion {
    const reto = new RetoAutenticacion(this.entropia.identificador(), this.entropia.nonce(), this.reloj.ahora());
    if (!this.retos.guardar(reto)) throw new FalloAutenticacion('RATE_LIMITED');
    return reto;
  }
  autenticar(intento: IntentoAutenticacion): ConexionAutenticada {
    const reto = this.retos.consumir(intento.connectionId);
    if (!reto || this.reloj.ahora() >= reto.venceEn) throw new FalloAutenticacion('STALE_NONCE');
    const prueba = this.verificacion.verificar(intento.bytes());
    validarPrueba(reto, prueba, this.pareja, this.reloj.ahora());
    return new ConexionAutenticada(reto.connectionId, this.pareja, prueba.rol);
  }
  cancelar(connectionId: string): void { this.retos.consumir(connectionId); }
}
