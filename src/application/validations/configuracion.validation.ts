import type { Entorno, NivelLog } from '../../domain/entities/configuracion.js';
import type { SolicitudConfiguracion } from '../../domain/entities/solicitud-configuracion.js';

export function requerida(solicitud: SolicitudConfiguracion, nombre: string): string {
  const valor = solicitud.valores[nombre];
  if (!valor) throw new Error(`Falta ${nombre}`);
  return valor;
}

export function leerPuerto(valor: string | undefined): number {
  if (valor === undefined) return 10000;
  if (!/^[1-9][0-9]{0,4}$/.test(valor) || Number(valor) > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535');
  }
  return Number(valor);
}

export function validarEntorno(valor: string | undefined): Entorno {
  const entorno = valor ?? 'development';
  if (entorno !== 'development' && entorno !== 'test' && entorno !== 'production') {
    throw new Error('NODE_ENV inválido');
  }
  return entorno;
}

export function validarNivelLog(valor: string | undefined, entorno: Entorno): NivelLog {
  const nivel = valor ?? (entorno === 'production' ? 'error' : 'info');
  if ((nivel !== 'error' && nivel !== 'info') || (entorno === 'production' && nivel !== 'error')) {
    throw new Error('LOG_LEVEL inválido; producción requiere error');
  }
  return nivel;
}
