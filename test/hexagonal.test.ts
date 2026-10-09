import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigurarServidor } from '../src/application/use-cases/configurar-servidor.js';
import { ConsultarServicio } from '../src/application/use-cases/consultar-servicio.js';
import { EvaluarConexion } from '../src/application/use-cases/evaluar-conexion.js';
import { SolicitudConfiguracion } from '../src/domain/configuracion.js';
import { DecisionConexion, SolicitudConexion } from '../src/domain/conexion.js';
import { ConsultaServicio, EstadoServicio, ResultadoConsulta } from '../src/domain/servicio.js';
import { ConfiguracionController } from '../src/infrastructure/config/controllers/configuracion.controller.js';
import { ConfiguracionMapper } from '../src/infrastructure/config/mappers/configuracion.mapper.js';
import { ServicioController } from '../src/infrastructure/http/controllers/servicio.controller.js';
import { ServicioMapper } from '../src/infrastructure/http/mappers/servicio.mapper.js';
import { ConexionController } from '../src/infrastructure/websocket/controllers/conexion.controller.js';
import { UpgradeEntity } from '../src/infrastructure/websocket/entities/upgrade.entity.js';
import { ConexionMapper } from '../src/infrastructure/websocket/mappers/conexion.mapper.js';
import { UpgradeMapper } from '../src/infrastructure/websocket/mappers/upgrade.mapper.js';

test('hexagonal: caso de uso consulta un puerto de salida sustituible', () => {
  let llamadas = 0;
  const caso = new ConsultarServicio({ obtener: () => { llamadas++; return new EstadoServicio(false); } });
  const resultado = caso.ejecutar(new ConsultaServicio('GET', '/healthz'));
  assert.equal(llamadas, 1);
  assert.ok(resultado instanceof ResultadoConsulta);
  assert.equal(resultado.tipo, 'SALUD');
  assert.equal(resultado.estado.operativo, false);
});

test('hexagonal: controller HTTP inyecta puerto de entrada y mapea request/response', () => {
  const controller = new ServicioController({ ejecutar: (consulta) => {
    assert.ok(consulta instanceof ConsultaServicio);
    assert.equal(consulta.ruta, '/healthz');
    return new ResultadoConsulta('SALUD', new EstadoServicio(false));
  } });
  assert.deepEqual(controller.manejar({ metodo: 'GET', ruta: '/healthz' }), { status: 503, body: { ok: false, protocol: 1 } });
  assert.deepEqual(ServicioMapper.aResponse(new ResultadoConsulta('NO_ENCONTRADO', new EstadoServicio(false))), {
    status: 404, body: { error: 'Ruta no disponible' },
  });
});

test('hexagonal: DTO HTTP y dominio no comparten identidad', () => {
  const dto = { metodo: 'GET', ruta: '/healthz' };
  const dominio = ServicioMapper.aDominio(dto);
  dto.ruta = '/otra';
  assert.equal(dominio.ruta, '/healthz');
  assert.ok(Object.isFrozen(dominio));
});

test('hexagonal: caso de configuración delega validación pública en puerto de salida', () => {
  const llamadas: string[] = [];
  const caso = new ConfigurarServidor({
    validarOrigen: (origen) => llamadas.push(origen),
    validarClave: (rol, publica) => llamadas.push(`${rol}:${publica}`),
  });
  const controller = new ConfiguracionController(caso);
  const resultado = controller.manejar({
    PUBLIC_ORIGIN: 'https://relay.example.com', ACTIVE_PAIR_ID: '12345678-1234-4123-8123-123456789abc',
    PARENT_PUBLIC_KEY_B64: 'publica-padre-de-doble', CHILD_PUBLIC_KEY_B64: 'publica-hijo-de-doble', NODE_ENV: 'test',
  });
  assert.deepEqual(llamadas, ['https://relay.example.com', 'PARENT:publica-padre-de-doble', 'CHILD:publica-hijo-de-doble']);
  assert.equal(resultado.puerto, 10000);
  assert.ok(Object.isFrozen(resultado));
  assert.notEqual(Object.getPrototypeOf(resultado).constructor, SolicitudConfiguracion);
});

test('hexagonal: mapper de configuración filtra el entorno y copia valores', () => {
  const dto = { PUBLIC_ORIGIN: 'https://relay.example.com', VARIABLE_NO_ADMITIDA: 'dato-de-doble' };
  const solicitud = ConfiguracionMapper.aDominio(dto);
  dto.PUBLIC_ORIGIN = 'https://otra.example.com';
  assert.equal(solicitud.valores.VARIABLE_NO_ADMITIDA, undefined);
  assert.equal(solicitud.valores.PUBLIC_ORIGIN, 'https://relay.example.com');
  assert.ok(Object.isFrozen(solicitud.valores));
});

test('hexagonal: un fallo del adaptador de validación interrumpe el caso de uso', () => {
  let claves = 0;
  const caso = new ConfigurarServidor({
    validarOrigen: () => { throw new Error('Fallo de doble'); },
    validarClave: () => { claves++; },
  });
  assert.throws(() => caso.ejecutar(new SolicitudConfiguracion({ PUBLIC_ORIGIN: 'origen-de-doble' })), /Fallo de doble/);
  assert.equal(claves, 0);
});

test('hexagonal: entidad WebSocket y dominio hacen roundtrip sin introducir ws', () => {
  for (const origen of [undefined, 'https://navegador.example.com']) {
    const solicitud = new SolicitudConexion('GET', '/ws', origen, 'cp.v1');
    const entidad = UpgradeMapper.aEntidad(solicitud);
    assert.ok(entidad instanceof UpgradeEntity);
    assert.deepEqual(UpgradeMapper.aDominio(entidad), solicitud);
    assert.deepEqual(ConexionMapper.aDominio(ConexionMapper.aRequest(solicitud)), solicitud);
  }
  const duplicados = new UpgradeEntity('GET', '/ws', { 'sec-websocket-protocol': ['cp.v1', 'otro'] });
  assert.equal(UpgradeMapper.aDominio(duplicados).esValida(), false);
});

test('hexagonal: controller WebSocket recibe dominio y transforma decisión en response DTO', () => {
  const controller = new ConexionController({ ejecutar: (solicitud) => {
    assert.ok(solicitud instanceof SolicitudConexion);
    assert.equal(solicitud.subprotocolo, 'cp.v1');
    return new DecisionConexion('NO_DISPONIBLE');
  } });
  assert.deepEqual(controller.manejar({ metodo: 'GET', ruta: '/ws', origen: undefined, subprotocolo: 'cp.v1' }), { status: 503 });
  for (const motivo of ['SOLICITUD_INVALIDA', 'NO_DISPONIBLE'] as const) {
    const decision = new DecisionConexion(motivo);
    assert.deepEqual(ConexionMapper.deResponse(ConexionMapper.aResponse(decision)), decision);
    assert.match(UpgradeMapper.aRechazo(decision).serializar(), new RegExp(`^HTTP/1.1 ${motivo === 'SOLICITUD_INVALIDA' ? 400 : 503}`));
  }
});

test('hexagonal: una solicitud válida nunca abre un socket en R01', () => {
  const caso = new EvaluarConexion();
  assert.equal(caso.ejecutar(new SolicitudConexion('GET', '/ws', undefined, 'cp.v1')).motivo, 'NO_DISPONIBLE');
  assert.equal(caso.ejecutar(new SolicitudConexion('GET', '/ws', '', 'cp.v1')).motivo, 'SOLICITUD_INVALIDA');
});
