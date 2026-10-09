import { pathToFileURL } from 'node:url';
import { crearServidorLocal } from './infrastructure/config/dependencias.js';
import { cerrarServidorHttp } from './infrastructure/config/servidor.config.js';
import { VARIABLES_PUBLICAS } from './infrastructure/config/configuracion-servidor.js';
import { leerPuerto } from './application/validations/configuracion.validation.js';

function iniciar(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El servidor solo permite ejecución local. El relay público requiere autorización y validación.');
  }
  const configurado = VARIABLES_PUBLICAS.some((nombre) => process.env[nombre] !== undefined);
  const servidor = crearServidorLocal(configurado ? process.env : undefined);
  servidor.on('error', () => {
    console.error('No se pudo iniciar el servidor local. Revisa el puerto.');
    process.exitCode = 1;
  });
  servidor.listen(leerPuerto(process.env.PORT), '127.0.0.1', () => {
    console.info('Base local iniciada; /healthz indica que CP/1 todavía no está operativo.');
  });
  const detener = (): void => {
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
