export type Entorno = 'development' | 'test' | 'production';
export type NivelLog = 'error' | 'info';

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
