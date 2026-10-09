import type { PruebaAutenticacion } from '../../entities/prueba-autenticacion.js';

export interface VerificacionAutenticacionSalida {
  verificar(frame: Uint8Array): PruebaAutenticacion;
}
