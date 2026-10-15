import type { ConfiguracionRequestDto } from '../../application/dtos/configuracion.dto.js';
import { origenHttps } from '../adapter/protocol/formatos.js';

export function validarPerfilRender(valores: ConfiguracionRequestDto): void {
  if (valores.RELAY_MODE !== 'cp2' || valores.NODE_ENV !== 'production' || valores.RENDER !== 'true') {
    throw new Error('El relay público requiere RELAY_MODE=cp2, NODE_ENV=production y entorno Render');
  }
  const externo = valores.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  if (!externo || !valores.PUBLIC_ORIGIN) throw new Error('Falta origen HTTPS público de Render o PUBLIC_ORIGIN');
  origenHttps(externo);
  origenHttps(valores.PUBLIC_ORIGIN);
  if (externo !== valores.PUBLIC_ORIGIN) throw new Error('PUBLIC_ORIGIN no coincide con la URL externa de Render');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(valores.ACTIVE_PAIR_ID ?? '')) {
    throw new Error('ACTIVE_PAIR_ID debe ser UUID v4 canónico en minúsculas para CP2');
  }
  if (valores.SELF_URL !== undefined && valores.SELF_URL !== valores.PUBLIC_ORIGIN) {
    throw new Error('SELF_URL debe coincidir con PUBLIC_ORIGIN en el perfil CP2 público');
  }
}
