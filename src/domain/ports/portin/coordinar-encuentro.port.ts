import type { EntradaEncuentro } from '../../entities/entrada-encuentro.js';
import type { SalidaEncuentro } from '../../entities/salida-encuentro.js';

export interface CoordinarEncuentroEntrada {
  abrir(): SalidaEncuentro;
  ejecutar(id: string, entrada: EntradaEncuentro): SalidaEncuentro[];
  cerrar(id: string): SalidaEncuentro[];
  limpiar(): SalidaEncuentro[];
}
