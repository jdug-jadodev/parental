import { FalloAutenticacion } from '../../domain/entities/fallo-autenticacion.js';
import type { RetoAutenticacion } from '../../domain/entities/reto-autenticacion.js';
import type { PruebaAutenticacion } from '../../domain/entities/prueba-autenticacion.js';

export function validarPrueba(reto: RetoAutenticacion, prueba: PruebaAutenticacion, pareja: string, ahora: number): void {
  if (ahora >= reto.venceEn || prueba.connectionId !== reto.connectionId || prueba.nonce !== reto.nonce) {
    throw new FalloAutenticacion('STALE_NONCE');
  }
  if (prueba.pareja !== pareja) throw new FalloAutenticacion('WRONG_PAIR');
}
