import { pathToFileURL } from 'node:url';
import { crearKeepaliveProceso, crearServidorInicialCerrado, crearServidorLocal, crearServidorRelayCp2Render,
  crearServidorEncuentroC8Render } from './infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from './infrastructure/config/servidor.config.js';
import { VARIABLES_PUBLICAS } from './infrastructure/config/configuracion-servidor.js';
import { leerPuerto } from './application/validations/configuracion.validation.js';

function iniciar(): void {
  const modo = process.env.RELAY_MODE;
  if (modo !== undefined && modo !== 'bootstrap' && modo !== 'cp2' && modo !== 'c8') throw new Error('RELAY_MODE inválido; se admite bootstrap, cp2 o c8 explícito');
  const inicialCerrado = modo === 'bootstrap';
  const publicoCp2 = modo === 'cp2';
  const encuentroC8 = modo === 'c8';
  if (!encuentroC8 && (process.env.C8_ENROLLMENT_ENABLED !== undefined || process.env.C8_ENROLLMENT_WINDOW_MS !== undefined)) {
    throw new Error('Las variables de enrolamiento C8 requieren RELAY_MODE=c8');
  }
  if (process.env.NODE_ENV === 'production' && !inicialCerrado && !publicoCp2 && !encuentroC8) {
    throw new Error('El servidor solo permite ejecución local. El relay público requiere autorización y validación.');
  }
  const configurado = VARIABLES_PUBLICAS.some((nombre) => process.env[nombre] !== undefined);
  const puerto = leerPuerto(process.env.PORT);
  const keepalive = crearKeepaliveProceso(process.env);
  const servidor = inicialCerrado ? crearServidorInicialCerrado(process.env)
    : publicoCp2 ? crearServidorRelayCp2Render(process.env)
      : encuentroC8 ? crearServidorEncuentroC8Render(process.env) : crearServidorLocal(configurado ? process.env : undefined);
  servidor.on('error', () => {
    keepalive?.detener();
    console.error('No se pudo iniciar el servidor. Revisa el puerto.');
    process.exitCode = 1;
  });
  servidor.listen(puerto, inicialCerrado || publicoCp2 || encuentroC8 ? '0.0.0.0' : '127.0.0.1', () => {
    keepalive?.iniciar();
    console.info(inicialCerrado ? 'Arranque inicial cerrado: HTTP disponible, relay deshabilitado y WebSockets rechazados.'
      : publicoCp2 ? 'Relay CP/2 configurado: autenticación obligatoria; salud no acredita aplicación de órdenes.'
        : encuentroC8 ? 'Enrolamiento C8 temporal: prueba de posesión provisional, relay deshabilitado y health503.'
          : 'Base local iniciada; /healthz indica que CP/1 todavía no está operativo.');
  });
  const detener = (): void => {
    keepalive?.detener();
    cerrarServidorHttp(servidor);
  };
  process.once('SIGTERM', detener);
  process.once('SIGINT', detener);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { iniciar(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : 'No se pudo iniciar el servidor');
    process.exitCode = 1;
  }
}
