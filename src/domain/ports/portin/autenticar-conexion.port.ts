import type { RetoAutenticacion } from '../../entities/reto-autenticacion.js';
import type { IntentoAutenticacion } from '../../entities/intento-autenticacion.js';
import type { ConexionAutenticada } from '../../entities/conexion-autenticada.js';

export interface AutenticarConexionEntrada {
  abrir(): RetoAutenticacion;
  autenticar(intento: IntentoAutenticacion): ConexionAutenticada;
  cancelar(connectionId: string): void;
}
