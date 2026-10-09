import type { RetoAutenticacion } from '../../entities/reto-autenticacion.js';

export interface RetosAutenticacionSalida {
  guardar(reto: RetoAutenticacion): boolean;
  consumir(connectionId: string): RetoAutenticacion | undefined;
}
