import { pathToFileURL } from 'node:url';
import { crearConfiguracionServidor, crearServidorLocal } from './infrastructure/config/dependencias.js';
import { VARIABLES_PUBLICAS } from './infrastructure/config/configuracion-servidor.js';
import { leerPuerto } from './application/validations/configuracion.validation.js';

function iniciar(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El servidor solo permite ejecución local. El relay público requiere R02–R03.');
  }
  if (VARIABLES_PUBLICAS.some((nombre) => process.env[nombre] !== undefined)) {
    crearConfiguracionServidor().leer(process.env);
  }
  const servidor = crearServidorLocal();
  servidor.on('error', () => {
    console.error('No se pudo iniciar el servidor local. Revisa el puerto.');
    process.exitCode = 1;
  });
  servidor.listen(leerPuerto(process.env.PORT), '127.0.0.1', () => {
    console.info('Base local iniciada; /healthz indica que CP/1 todavía no está operativo.');
  });
  const detener = (): void => {
    const limite = setTimeout(() => servidor.closeAllConnections(), 3000);
    limite.unref();
    servidor.close(() => clearTimeout(limite));
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
