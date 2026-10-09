import { ClaveVerificacion } from './crypto-protocol.js';
import { origenHttps } from './formatos.js';

export const VARIABLES_PUBLICAS = [
  'PUBLIC_ORIGIN', 'ACTIVE_PAIR_ID', 'PARENT_PUBLIC_KEY_B64', 'CHILD_PUBLIC_KEY_B64',
] as const;

export interface Configuracion {
  readonly puerto: number;
  readonly origen: string;
  readonly pareja: string;
  readonly padre: ClaveVerificacion;
  readonly hijo: ClaveVerificacion;
  readonly entorno: 'development' | 'test' | 'production';
  readonly nivelLog: 'error' | 'info';
}

export function leerPuerto(valor: string | undefined): number {
  if (valor === undefined) return 10000;
  if (!/^[1-9][0-9]{0,4}$/.test(valor) || Number(valor) > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535');
  }
  return Number(valor);
}

// Errores sin valores de configuración ni detalles de las claves.
export function leerConfiguracion(env: NodeJS.ProcessEnv): Readonly<Configuracion> {
  const requerida = (nombre: string): string => {
    const valor = env[nombre];
    if (!valor) throw new Error(`Falta ${nombre}`);
    return valor;
  };
  const origen = requerida('PUBLIC_ORIGIN');
  try { origenHttps(origen); } catch { throw new Error('PUBLIC_ORIGIN inválido'); }
  const pareja = requerida('ACTIVE_PAIR_ID');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pareja)) {
    throw new Error('ACTIVE_PAIR_ID debe ser UUID v4');
  }
  const publicaPadre = requerida('PARENT_PUBLIC_KEY_B64');
  const publicaHijo = requerida('CHILD_PUBLIC_KEY_B64');
  const clave = (rol: 'PARENT' | 'CHILD', valor: string): ClaveVerificacion => {
    try { return ClaveVerificacion.desdeSpki(rol, valor); }
    catch { throw new Error(`Clave pública ${rol} inválida`); }
  };
  const padre = clave('PARENT', publicaPadre);
  const hijo = clave('CHILD', publicaHijo);
  if (publicaPadre === publicaHijo) throw new Error('Las claves públicas deben ser distintas');
  const entorno = env.NODE_ENV ?? 'development';
  if (entorno !== 'development' && entorno !== 'test' && entorno !== 'production') {
    throw new Error('NODE_ENV inválido');
  }
  const nivelLog = env.LOG_LEVEL ?? (entorno === 'production' ? 'error' : 'info');
  if ((nivelLog !== 'error' && nivelLog !== 'info') || (entorno === 'production' && nivelLog !== 'error')) {
    throw new Error('LOG_LEVEL inválido; producción requiere error');
  }
  return Object.freeze({ puerto: leerPuerto(env.PORT), origen, pareja, padre, hijo, entorno, nivelLog });
}
