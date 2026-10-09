import type { Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { ConfigurarServidor } from '../../application/usecase/configurar-servidor.usecase.js';
import { ConsultarServicio } from '../../application/usecase/consultar-servicio.usecase.js';
import { EvaluarConexion } from '../../application/usecase/evaluar-conexion.usecase.js';
import { AutenticarConexion } from '../../application/usecase/autenticar-conexion.usecase.js';
import type { ConfiguracionRequestDto } from '../../application/dtos/configuracion.dto.js';
import { ConfiguracionMapper } from '../../application/mapper/configuracion.mapper.js';
import { EstadoLocalAdapter } from '../adapter/estado-local.adapter.js';
import { ValidacionPublicaAdapter } from '../adapter/validacion-publica.adapter.js';
import { WebSocketAdapter } from '../adapter/websocket.adapter.js';
import { ServicioController } from '../controller/servicio.controller.js';
import { ServicioRouter } from '../routers/servicio.router.js';
import { ConfiguracionServidor } from './configuracion-servidor.js';
import { crearServidorHttp } from './servidor.config.js';
import { crearTransporteWebSocket } from './websocket.config.js';
import { CodecProtocolo } from '../adapter/protocol/codec-protocolo.js';
import { VerificacionAutenticacionAdapter } from '../adapter/verificacion-autenticacion.adapter.js';
import { RetosAutenticacionAdapter } from '../adapter/retos-autenticacion.adapter.js';
import { RelojAdapter } from '../adapter/reloj.adapter.js';
import { EntropiaAdapter } from '../adapter/entropia.adapter.js';
import { ProcesarMensaje } from '../../application/usecase/procesar-mensaje.usecase.js';
import { VerificacionMensajeAdapter } from '../adapter/verificacion-mensaje.adapter.js';
import { LimiteUpgradesAdapter } from '../adapter/limite-upgrades.js';

export function crearConfiguracionServidor(): ConfiguracionServidor {
  return new ConfiguracionServidor(new ConfigurarServidor(new ValidacionPublicaAdapter()));
}

export function crearServidorLocal(valores?: ConfiguracionRequestDto): Server {
  const servicio = new ServicioController(new ConsultarServicio(new EstadoLocalAdapter()));
  let autenticacion: AutenticarConexion | undefined;
  let procesar: ProcesarMensaje | undefined;
  if (valores) {
    const configuracion = new ConfigurarServidor(new ValidacionPublicaAdapter()).ejecutar(ConfiguracionMapper.aDominio(valores));
    if (configuracion.entorno === 'production') throw new Error('El servidor solo permite ejecución local; R03 pendiente');
    const raiz = existsSync(new URL('../../../package.json', import.meta.url)) ? '../../../' : '../../../../';
    const esquema = readFileSync(new URL(`${raiz}compartido/protocolo.schema.json`, import.meta.url));
    const codec = new CodecProtocolo(esquema);
    autenticacion = new AutenticarConexion(configuracion.pareja, new RetosAutenticacionAdapter(), new RelojAdapter(),
      new EntropiaAdapter(), new VerificacionAutenticacionAdapter(codec, configuracion));
    procesar = new ProcesarMensaje(new VerificacionMensajeAdapter(codec, configuracion));
  }
  const websocket = new WebSocketAdapter(new EvaluarConexion(Boolean(autenticacion)), autenticacion,
    autenticacion ? crearTransporteWebSocket() : undefined, procesar, new LimiteUpgradesAdapter(new RelojAdapter().ahora()));
  return crearServidorHttp(new ServicioRouter(servicio), websocket);
}
