import type { ConfiguracionRequestDto } from '../../application/dtos/configuracion.dto.js';
import { origenHttps } from '../adapter/protocol/formatos.js';

export interface ConfiguracionKeepalive {
  readonly url: string;
  readonly intervaloMs: number;
}

export function leerKeepalive(valores: ConfiguracionRequestDto): ConfiguracionKeepalive | undefined {
  if (valores.SELF_URL === undefined) {
    if (valores.KEEP_ALIVE_INTERVAL_MS !== undefined) throw new Error('KEEP_ALIVE_INTERVAL_MS requiere SELF_URL');
    return undefined;
  }
  origenHttps(valores.SELF_URL);
  const origen = new URL(valores.SELF_URL);
  if (origen.hostname === 'localhost' || /^\d+(?:\.\d+){3}$/.test(origen.hostname)) {
    throw new Error('SELF_URL requiere un origen HTTPS público propio');
  }
  const intervalo = valores.KEEP_ALIVE_INTERVAL_MS ?? '600000';
  if (!/^[1-9][0-9]{4,6}$/.test(intervalo) || Number(intervalo) < 60000 || Number(intervalo) > 3600000) {
    throw new Error('KEEP_ALIVE_INTERVAL_MS debe estar entre 60000 y 3600000');
  }
  return Object.freeze({ url: `${valores.SELF_URL}/keepalive`, intervaloMs: Number(intervalo) });
}
