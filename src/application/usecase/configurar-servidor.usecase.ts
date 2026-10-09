import { Configuracion } from '../../domain/entities/configuracion.js';
import type { SolicitudConfiguracion } from '../../domain/entities/solicitud-configuracion.js';
import type { ConfigurarServidorEntrada } from '../../domain/ports/portin/configurar-servidor.port.js';
import type { ValidacionPublicaSalida } from '../../domain/ports/portout/validacion-publica.port.js';
import { leerPuerto, requerida, validarEntorno, validarNivelLog } from '../validations/configuracion.validation.js';

export class ConfigurarServidor implements ConfigurarServidorEntrada {
  constructor(private readonly validacion: ValidacionPublicaSalida) {}
  ejecutar(solicitud: SolicitudConfiguracion): Configuracion {
    const origen = requerida(solicitud, 'PUBLIC_ORIGIN');
    this.validacion.validarOrigen(origen);
    const pareja = requerida(solicitud, 'ACTIVE_PAIR_ID');
    const padre = requerida(solicitud, 'PARENT_PUBLIC_KEY_B64');
    const hijo = requerida(solicitud, 'CHILD_PUBLIC_KEY_B64');
    this.validacion.validarClave('PARENT', padre);
    this.validacion.validarClave('CHILD', hijo);
    const entorno = validarEntorno(solicitud.valores.NODE_ENV);
    const nivel = validarNivelLog(solicitud.valores.LOG_LEVEL, entorno);
    return new Configuracion(leerPuerto(solicitud.valores.PORT), origen, pareja, padre, hijo, entorno, nivel);
  }
}
