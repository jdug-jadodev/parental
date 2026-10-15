import type { ConfiguracionRequestDto } from '../../application/dtos/configuracion.dto.js';
import { validarNivelLog } from '../../application/validations/configuracion.validation.js';
import { origenHttps } from '../adapter/protocol/formatos.js';

export function validarPerfilEncuentroRender(valores: ConfiguracionRequestDto): number {
  if (valores.RELAY_MODE !== 'c8' || valores.C8_ENROLLMENT_ENABLED !== 'true' ||
    valores.NODE_ENV !== 'production' || valores.RENDER !== 'true') {
    throw new Error('C8 público requiere modo c8, habilitación explícita, producción y entorno Render');
  }
  validarNivelLog(valores.LOG_LEVEL, 'production');
  const externo = valores.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  const origen = valores.PUBLIC_ORIGIN;
  if (!externo || !origen) throw new Error('C8 requiere origen público y URL automática de Render');
  origenHttps(externo);
  origenHttps(origen);
  if (externo !== origen) throw new Error('El origen C8 no coincide con Render');
  if (['ACTIVE_PAIR_ID', 'PARENT_PUBLIC_KEY_B64', 'CHILD_PUBLIC_KEY_B64'].some((k) => valores[k] !== undefined)) {
    throw new Error('El perfil C8 no admite configuración de pareja ni sustituye el relay CP2');
  }
  if (valores.SELF_URL !== undefined && valores.SELF_URL !== origen) throw new Error('SELF_URL debe coincidir con el origen C8');
  const ventana = valores.C8_ENROLLMENT_WINDOW_MS ?? '';
  if (!/^[1-9][0-9]{4,5}$/.test(ventana) || Number(ventana) < 60000 || Number(ventana) > 600000) {
    throw new Error('C8_ENROLLMENT_WINDOW_MS debe estar entre 60000 y 600000');
  }
  return Number(ventana);
}
