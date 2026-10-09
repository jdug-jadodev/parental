import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigurarServidor } from '../src/application/usecase/configurar-servidor.usecase.js';
import { ConsultarServicio } from '../src/application/usecase/consultar-servicio.usecase.js';
import { EvaluarConexion } from '../src/application/usecase/evaluar-conexion.usecase.js';
import { SolicitudConfiguracion } from '../src/domain/entities/solicitud-configuracion.js';
import { DecisionConexion } from '../src/domain/entities/decision-conexion.js';
import { SolicitudConexion } from '../src/domain/entities/solicitud-conexion.js';
import { ConsultaServicio } from '../src/domain/entities/consulta-servicio.js';
import { EstadoServicio } from '../src/domain/entities/estado-servicio.js';
import { ResultadoConsulta } from '../src/domain/entities/resultado-consulta.js';
import { ConfiguracionServidor } from '../src/infrastructure/config/configuracion-servidor.js';
import { ConfiguracionMapper } from '../src/application/mapper/configuracion.mapper.js';
import { ServicioController } from '../src/infrastructure/controller/servicio.controller.js';
import { ServicioMapper } from '../src/application/mapper/servicio.mapper.js';
import { UpgradeEntity } from '../src/infrastructure/adapter/entities/upgrade.entity.js';
import { UpgradeMapper } from '../src/infrastructure/adapter/mapper/upgrade.mapper.js';
import { esSolicitudConexionValida } from '../src/application/validations/conexion.validation.js';

test('hexagonal: caso de uso consulta un puerto de salida sustituible', () => {
  let llamadas = 0;
  const caso = new ConsultarServicio({ obtener: () => { llamadas++; return new EstadoServicio(false); } });
  const resultado = caso.ejecutar(new ConsultaServicio('SALUD'));
  assert.equal(llamadas, 1);
  assert.ok(resultado instanceof ResultadoConsulta);
  assert.equal(resultado.tipo, 'SALUD');
  assert.equal(resultado.estado.operativo, false);
});

test('hexagonal: controller HTTP inyecta puerto de entrada y mapea request/response', () => {
  const controller = new ServicioController({ ejecutar: (consulta) => {
    assert.ok(consulta instanceof ConsultaServicio);
    assert.equal(consulta.tipo, 'SALUD');
    return new ResultadoConsulta('SALUD', new EstadoServicio(false));
  } });
  assert.deepEqual(controller.health(), { status: 503, body: { ok: false, protocol: 1 } });
  assert.deepEqual(ServicioMapper.aResponse(new ResultadoConsulta('KEEPALIVE', new EstadoServicio(false))), {
    status: 200, body: { alive: true },
  });
});

test('hexagonal: DTO HTTP y dominio no comparten identidad', () => {
  const dto: { tipo: 'SALUD' | 'KEEPALIVE' } = { tipo: 'SALUD' };
  const dominio = ServicioMapper.aDominio(dto);
  dto.tipo = 'KEEPALIVE';
  assert.equal(dominio.tipo, 'SALUD');
  assert.ok(Object.isFrozen(dominio));
});

test('hexagonal: caso de configuración delega validación pública en puerto de salida', () => {
  const llamadas: string[] = [];
  const caso = new ConfigurarServidor({
    validarOrigen: (origen) => llamadas.push(origen),
    validarClave: (rol, publica) => llamadas.push(`${rol}:${publica}`),
  });
  const configuracion = new ConfiguracionServidor(caso);
  const resultado = configuracion.leer({
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
  }
  const duplicados = new UpgradeEntity('GET', '/ws', { 'sec-websocket-protocol': ['cp.v1', 'otro'] });
  assert.equal(esSolicitudConexionValida(UpgradeMapper.aDominio(duplicados)), false);
});

test('hexagonal: mapper WebSocket convierte decisiones sin pasar por DTOs duplicados', () => {
  for (const motivo of ['SOLICITUD_INVALIDA', 'NO_DISPONIBLE'] as const) {
    const decision = new DecisionConexion(motivo);
    assert.deepEqual(UpgradeMapper.deRechazo(UpgradeMapper.aRechazo(decision)), decision);
    assert.match(UpgradeMapper.aRechazo(decision).serializar(), new RegExp(`^HTTP/1.1 ${motivo === 'SOLICITUD_INVALIDA' ? 400 : 503}`));
  }
});

test('hexagonal: una solicitud válida nunca abre un socket en R01', () => {
  const caso = new EvaluarConexion();
  assert.equal(caso.ejecutar(new SolicitudConexion('GET', '/ws', undefined, 'cp.v1')).motivo, 'NO_DISPONIBLE');
  assert.equal(caso.ejecutar(new SolicitudConexion('GET', '/ws', '', 'cp.v1')).motivo, 'SOLICITUD_INVALIDA');
});
