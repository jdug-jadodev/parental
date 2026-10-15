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
import { ConfiguracionServidor, VARIABLES_PUBLICAS } from './configuracion-servidor.js';
import { validarEntorno, validarNivelLog } from '../../application/validations/configuracion.validation.js';
import { crearServidorHttp, type TlsLocal } from './servidor.config.js';
import { crearTransporteWebSocket } from './websocket.config.js';
import { CodecProtocolo } from '../adapter/protocol/codec-protocolo.js';
import { VerificacionAutenticacionAdapter } from '../adapter/verificacion-autenticacion.adapter.js';
import { RetosAutenticacionAdapter } from '../adapter/retos-autenticacion.adapter.js';
import { RelojAdapter } from '../adapter/reloj.adapter.js';
import { EntropiaAdapter } from '../adapter/entropia.adapter.js';
import { ProcesarMensaje } from '../../application/usecase/procesar-mensaje.usecase.js';
import { VerificacionMensajeAdapter } from '../adapter/verificacion-mensaje.adapter.js';
import { LimiteUpgradesAdapter } from '../adapter/limite-upgrades.js';
import { EvaluarConexionCp2 } from '../../application/usecase/evaluar-conexion-cp2.usecase.js';
import { CodecAutenticacionCp2 } from '../adapter/protocol/cp2/codec-autenticacion.js';
import { VerificacionAutenticacionCp2Adapter } from '../adapter/verificacion-autenticacion-cp2.adapter.js';
import { WebSocketAuthCp2Adapter } from '../adapter/websocket-auth-cp2.adapter.js';
import { crearTransporteWebSocketCp2 } from './websocket-cp2.config.js';
import { VerificacionMensajeCp2Adapter } from '../adapter/verificacion-mensaje-cp2.adapter.js';
import { CodecOrdenesCp2 } from '../adapter/protocol/cp2/codec-ordenes.js';
import { CodecAckCp2 } from '../adapter/protocol/cp2/codec-ack.js';
import { CodecStateCp2 } from '../adapter/protocol/cp2/codec-state.js';
import { CriptografiaOrdenesCp2 } from '../adapter/protocol/cp2/criptografia-ordenes.js';
import { CriptografiaAckCp2 } from '../adapter/protocol/cp2/criptografia-ack.js';
import { CriptografiaStateCp2 } from '../adapter/protocol/cp2/criptografia-state.js';
import { KeepaliveProceso } from '../adapter/keepalive-proceso.js';
import { leerKeepalive } from './keepalive.config.js';
import { validarPerfilRender } from './perfil-render.config.js';
import { EstadoRelayCp2Adapter } from '../adapter/estado-relay-cp2.adapter.js';
import { WebSocketServer } from 'ws';
import { CoordinarEncuentroC8 } from '../../application/usecase/coordinar-encuentro-c8.usecase.js';
import { CodecEncuentroC8 } from '../adapter/protocol/c8/codec-encuentro.js';
import { CodecVinculacionCp2 } from '../adapter/protocol/cp2/codec-vinculacion.js';
import { CriptografiaVinculacionCp2 } from '../adapter/protocol/cp2/criptografia-vinculacion.js';
import { VerificacionEncuentroAdapter } from '../adapter/verificacion-encuentro.adapter.js';
import { EntropiaEncuentroAdapter } from '../adapter/entropia-encuentro.adapter.js';
import { WebSocketEncuentroC8Adapter } from '../adapter/websocket-encuentro-c8.adapter.js';
import { origenHttps } from '../adapter/protocol/formatos.js';
import { validarPerfilEncuentroRender } from './perfil-encuentro-render.config.js';

export function crearServidorEncuentroC8Local(valores: ConfiguracionRequestDto, tls?: TlsLocal): Server {
  if (valores.RELAY_MODE !== 'c8-local' || validarEntorno(valores.NODE_ENV) === 'production') {
    throw new Error('C8 sólo permite el perfil local explícito');
  }
  const origen = valores.PUBLIC_ORIGIN ?? '';
  origenHttps(origen);
  return componerEncuentroC8(origen, tls);
}

export function crearServidorEncuentroC8Render(valores: ConfiguracionRequestDto): Server {
  const ventana = validarPerfilEncuentroRender(valores);
  return componerEncuentroC8(valores.PUBLIC_ORIGIN!, undefined, 'RENDER', ventana);
}

function componerEncuentroC8(origen: string, tls?: TlsLocal, alcance: 'LOCAL' | 'RENDER' = 'LOCAL', ventana?: number): Server {
  const raiz = existsSync(new URL('../../../package.json', import.meta.url)) ? '../../../' : '../../../../';
  const pairCodec = new CodecVinculacionCp2(readFileSync(new URL(`${raiz}contrato-cp2/vinculacion.schema.json`, import.meta.url)));
  const codec = new CodecEncuentroC8();
  const reloj = new RelojAdapter();
  const limite = ventana === undefined ? undefined : reloj.ahora() + ventana;
  const coordinar = new CoordinarEncuentroC8(reloj, new EntropiaEncuentroAdapter(),
    new VerificacionEncuentroAdapter(codec, pairCodec, new CriptografiaVinculacionCp2(pairCodec)), origen, limite);
  const transporte = new WebSocketServer({ noServer: true, maxPayload: 16384, perMessageDeflate: false,
    autoPong: false, maxFragments: 64, maxBufferedChunks: 128,
    handleProtocols: (protocolos) => protocolos.size === 1 && protocolos.has('c8.v1') ? 'c8.v1' : false });
  const websocket = new WebSocketEncuentroC8Adapter(coordinar, codec, transporte, new LimiteUpgradesAdapter(reloj.ahora()), alcance, limite);
  const servicio = new ServicioController(new ConsultarServicio(new EstadoLocalAdapter()));
  try { return crearServidorHttp(new ServicioRouter(servicio), websocket, tls); }
  catch (error) { websocket.detener(); throw error; }
}

export function crearKeepaliveProceso(valores: ConfiguracionRequestDto): KeepaliveProceso | undefined {
  const configuracion = leerKeepalive(valores);
  return configuracion ? new KeepaliveProceso(configuracion.url, configuracion.intervaloMs, fetch,
    () => console.error('Keepalive: la solicitud no pudo completarse correctamente.')) : undefined;
}

export function crearConfiguracionServidor(): ConfiguracionServidor {
  return new ConfiguracionServidor(new ConfigurarServidor(new ValidacionPublicaAdapter()));
}

export function crearServidorInicialCerrado(valores: ConfiguracionRequestDto): Server {
  if (valores.RELAY_MODE !== 'bootstrap') throw new Error('El arranque cerrado requiere RELAY_MODE=bootstrap');
  validarNivelLog(valores.LOG_LEVEL, validarEntorno(valores.NODE_ENV));
  if (VARIABLES_PUBLICAS.some((nombre) => valores[nombre] !== undefined)) {
    throw new Error('El arranque cerrado no admite configuración de pareja ni PUBLIC_ORIGIN');
  }
  const servicio = new ServicioController(new ConsultarServicio(new EstadoLocalAdapter()));
  const websocket = new WebSocketAdapter(new EvaluarConexion(false), undefined, undefined, undefined,
    new LimiteUpgradesAdapter(new RelojAdapter().ahora()));
  try { return crearServidorHttp(new ServicioRouter(servicio), websocket); }
  catch (error) { websocket.detener(); throw error; }
}

export function crearServidorLocal(valores?: ConfiguracionRequestDto, tls?: TlsLocal): Server {
  if (tls && !valores) throw new Error('WSS local requiere configuración pública autenticada');
  const servicio = new ServicioController(new ConsultarServicio(new EstadoLocalAdapter()));
  let autenticacion: AutenticarConexion | undefined;
  let procesar: ProcesarMensaje | undefined;
  if (valores) {
    const configuracion = new ConfigurarServidor(new ValidacionPublicaAdapter()).ejecutar(ConfiguracionMapper.aDominio(valores));
    if (configuracion.entorno === 'production') throw new Error('El servidor solo permite ejecución local; fase pública pendiente');
    const raiz = existsSync(new URL('../../../package.json', import.meta.url)) ? '../../../' : '../../../../';
    const esquema = readFileSync(new URL(`${raiz}compartido/protocolo.schema.json`, import.meta.url));
    const codec = new CodecProtocolo(esquema);
    autenticacion = new AutenticarConexion(configuracion.pareja, new RetosAutenticacionAdapter(), new RelojAdapter(),
      new EntropiaAdapter(), new VerificacionAutenticacionAdapter(codec, configuracion));
    procesar = new ProcesarMensaje(new VerificacionMensajeAdapter(codec, configuracion));
  }
  const websocket = new WebSocketAdapter(new EvaluarConexion(Boolean(autenticacion)), autenticacion,
    autenticacion ? crearTransporteWebSocket() : undefined, procesar, new LimiteUpgradesAdapter(new RelojAdapter().ahora()));
  try { return crearServidorHttp(new ServicioRouter(servicio), websocket, tls); }
  catch (error) { websocket.detener(); throw error; }
}

export function crearServidorAutenticacionCp2Local(valores: ConfiguracionRequestDto): Server {
  return componerCp2(valores, false);
}

export function crearServidorRelayCp2Local(valores: ConfiguracionRequestDto, tls?: TlsLocal): Server {
  return componerCp2(valores, true, tls);
}

export function crearServidorRelayCp2Render(valores: ConfiguracionRequestDto): Server {
  validarPerfilRender(valores);
  return componerCp2(valores, true, undefined, 'RENDER');
}

function componerCp2(valores: ConfiguracionRequestDto, routing: boolean, tls?: TlsLocal, alcance: 'LOCAL' | 'RENDER' = 'LOCAL'): Server {
  const configuracion = new ConfigurarServidor(new ValidacionPublicaAdapter()).ejecutar(ConfiguracionMapper.aDominio(valores));
  if (configuracion.entorno === 'production' && alcance === 'LOCAL') throw new Error('CP/2 sólo admite laboratorio local');
  const raiz = existsSync(new URL('../../../package.json', import.meta.url)) ? '../../../' : '../../../../';
  const codec = new CodecAutenticacionCp2(readFileSync(new URL(`${raiz}contrato-cp2/autenticacion.schema.json`, import.meta.url)));
  const autenticacion = new AutenticarConexion(configuracion.pareja, new RetosAutenticacionAdapter(), new RelojAdapter(),
    new EntropiaAdapter(), new VerificacionAutenticacionCp2Adapter(codec, configuracion));
  let procesar: ProcesarMensaje | undefined;
  if (routing) {
    const cargar = (nombre: string): Buffer => readFileSync(new URL(`${raiz}contrato-cp2/${nombre}.schema.json`, import.meta.url));
    const ack = new CodecAckCp2(cargar('ack'));
    procesar = new ProcesarMensaje(new VerificacionMensajeCp2Adapter(configuracion,
      new CriptografiaOrdenesCp2(new CodecOrdenesCp2(cargar('ordenes'))), new CriptografiaAckCp2(ack),
      new CriptografiaStateCp2(new CodecStateCp2(cargar('state-piloto'))), ack));
  }
  const websocket = new WebSocketAuthCp2Adapter(new EvaluarConexionCp2(), autenticacion, crearTransporteWebSocketCp2(),
    codec, new LimiteUpgradesAdapter(new RelojAdapter().ahora()), procesar, alcance);
  const estado = alcance === 'RENDER' ? new EstadoRelayCp2Adapter(() => websocket.disponible) : new EstadoLocalAdapter();
  const servicio = new ServicioController(new ConsultarServicio(estado));
  try { return crearServidorHttp(new ServicioRouter(servicio), websocket, tls); }
  catch (error) { websocket.detener(); throw error; }
}
