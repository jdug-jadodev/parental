import type { Server } from 'node:http';
import { ConfigurarServidor } from '../../application/usecase/configurar-servidor.usecase.js';
import { ConsultarServicio } from '../../application/usecase/consultar-servicio.usecase.js';
import { EvaluarConexion } from '../../application/usecase/evaluar-conexion.usecase.js';
import { EstadoLocalAdapter } from '../adapter/estado-local.adapter.js';
import { ValidacionPublicaAdapter } from '../adapter/validacion-publica.adapter.js';
import { WebSocketAdapter } from '../adapter/websocket.adapter.js';
import { ServicioController } from '../controller/servicio.controller.js';
import { ServicioRouter } from '../routers/servicio.router.js';
import { ConfiguracionServidor } from './configuracion-servidor.js';
import { crearServidorHttp } from './servidor.config.js';

export function crearConfiguracionServidor(): ConfiguracionServidor {
  return new ConfiguracionServidor(new ConfigurarServidor(new ValidacionPublicaAdapter()));
}

export function crearServidorLocal(): Server {
  const servicio = new ServicioController(new ConsultarServicio(new EstadoLocalAdapter()));
  const websocket = new WebSocketAdapter(new EvaluarConexion());
  return crearServidorHttp(new ServicioRouter(servicio), websocket);
}
