import { Configuracion, leerPuerto, type SolicitudConfiguracion } from '../../domain/configuracion.js';
import type { ConfigurarServidorEntrada } from '../ports/input/configurar-servidor.js';
import type { ValidacionPublicaSalida } from '../ports/output/validacion-publica.js';

export class ConfigurarServidor implements ConfigurarServidorEntrada {
  constructor(private readonly validacion: ValidacionPublicaSalida) {}
  ejecutar(solicitud: SolicitudConfiguracion): Configuracion {
    const origen = solicitud.requerida('PUBLIC_ORIGIN');
    this.validacion.validarOrigen(origen);
    const pareja = solicitud.requerida('ACTIVE_PAIR_ID');
    const padre = solicitud.requerida('PARENT_PUBLIC_KEY_B64');
    const hijo = solicitud.requerida('CHILD_PUBLIC_KEY_B64');
    this.validacion.validarClave('PARENT', padre);
    this.validacion.validarClave('CHILD', hijo);
    const entorno = solicitud.valores.NODE_ENV ?? 'development';
    if (entorno !== 'development' && entorno !== 'test' && entorno !== 'production') {
      throw new Error('NODE_ENV inválido');
    }
    const nivel = solicitud.valores.LOG_LEVEL ?? (entorno === 'production' ? 'error' : 'info');
    if ((nivel !== 'error' && nivel !== 'info') || (entorno === 'production' && nivel !== 'error')) {
      throw new Error('LOG_LEVEL inválido; producción requiere error');
    }
    return new Configuracion(leerPuerto(solicitud.valores.PORT), origen, pareja, padre, hijo, entorno, nivel);
  }
}
