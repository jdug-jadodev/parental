import type { RolAutenticado } from './conexion-autenticada.js';

export class PruebaAutenticacion {
  constructor(
    readonly connectionId: string,
    readonly nonce: string,
    readonly pareja: string,
    readonly rol: RolAutenticado,
  ) { Object.freeze(this); }
}
