import { pathToFileURL } from 'node:url';
import { crearKeepaliveProceso, crearServidorInicialCerrado, crearServidorLocal, crearServidorRelayCp2Render } from './infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from './infrastructure/config/servidor.config.js';
import { VARIABLES_PUBLICAS } from './infrastructure/config/configuracion-servidor.js';
import { leerPuerto } from './application/validations/configuracion.validation.js';

function iniciar(): void {
  const modo = process.env.RELAY_MODE;
  if (modo !== undefined && modo !== 'bootstrap' && modo !== 'cp2') throw new Error('RELAY_MODE inválido; se admite bootstrap o cp2 explícito');
  const inicialCerrado = modo === 'bootstrap';
  const publicoCp2 = modo === 'cp2';
  if (process.env.NODE_ENV === 'production' && !inicialCerrado && !publicoCp2) {
    throw new Error('El servidor solo permite ejecución local. El relay público requiere autorización y validación.');
  }
  const configurado = VARIABLES_PUBLICAS.some((nombre) => process.env[nombre] !== undefined);
  const puerto = leerPuerto(process.env.PORT);
  const keepalive = crearKeepaliveProceso(process.env);
  const servidor = inicialCerrado ? crearServidorInicialCerrado(process.env)
    : publicoCp2 ? crearServidorRelayCp2Render(process.env) : crearServidorLocal(configurado ? process.env : undefined);
  servidor.on('error', () => {
    keepalive?.detener();
    console.error('No se pudo iniciar el servidor. Revisa el puerto.');
    process.exitCode = 1;
  });
  servidor.listen(puerto, inicialCerrado || publicoCp2 ? '0.0.0.0' : '127.0.0.1', () => {
    keepalive?.iniciar();
    console.info(inicialCerrado ? 'Arranque inicial cerrado: HTTP disponible, relay deshabilitado y WebSockets rechazados.'
      : publicoCp2 ? 'Relay CP/2 configurado: autenticación obligatoria; salud no acredita aplicación de órdenes.'
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
