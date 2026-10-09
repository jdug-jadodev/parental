import type { Server } from 'node:http';
import { ConfigurarServidor } from '../application/use-cases/configurar-servidor.js';
import { ConsultarServicio } from '../application/use-cases/consultar-servicio.js';
import { EvaluarConexion } from '../application/use-cases/evaluar-conexion.js';
import { EstadoLocalAdapter } from '../infrastructure/adapters/estado-local.js';
import { ValidacionPublicaAdapter } from '../infrastructure/adapters/validacion-publica.js';
import { ConfiguracionController } from '../infrastructure/config/controllers/configuracion.controller.js';
import { ServicioController } from '../infrastructure/http/controllers/servicio.controller.js';
import { ConexionController } from '../infrastructure/websocket/controllers/conexion.controller.js';
import { crearServidorHttp } from '../infrastructure/http/servidor-http.js';

export function crearControladorConfiguracion(): ConfiguracionController {
  return new ConfiguracionController(new ConfigurarServidor(new ValidacionPublicaAdapter()));
}

export function crearServidorLocal(): Server {
  return crearServidorHttp(
    new ServicioController(new ConsultarServicio(new EstadoLocalAdapter())),
    new ConexionController(new EvaluarConexion()),
  );
}
