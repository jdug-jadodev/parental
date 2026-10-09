export type Entorno = 'development' | 'test' | 'production';
export type NivelLog = 'error' | 'info';
export type ValoresConfiguracion = Readonly<Record<string, string | undefined>>;

export const VARIABLES_PUBLICAS = [
  'PUBLIC_ORIGIN', 'ACTIVE_PAIR_ID', 'PARENT_PUBLIC_KEY_B64', 'CHILD_PUBLIC_KEY_B64',
] as const;

export function leerPuerto(valor: string | undefined): number {
  if (valor === undefined) return 10000;
  if (!/^[1-9][0-9]{0,4}$/.test(valor) || Number(valor) > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535');
  }
  return Number(valor);
}

export class SolicitudConfiguracion {
  readonly valores: ValoresConfiguracion;
  constructor(valores: ValoresConfiguracion) {
    this.valores = Object.freeze({ ...valores });
    Object.freeze(this);
  }
  requerida(nombre: string): string {
    const valor = this.valores[nombre];
    if (!valor) throw new Error(`Falta ${nombre}`);
    return valor;
  }
}

export class Configuracion {
  constructor(
    readonly puerto: number,
    readonly origen: string,
    readonly pareja: string,
    readonly publicaPadre: string,
    readonly publicaHijo: string,
    readonly entorno: Entorno,
    readonly nivelLog: NivelLog,
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pareja)) {
      throw new Error('ACTIVE_PAIR_ID debe ser UUID v4');
    }
    if (publicaPadre === publicaHijo) throw new Error('Las claves públicas deben ser distintas');
    Object.freeze(this);
  }
}
