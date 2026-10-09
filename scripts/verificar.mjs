import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../', import.meta.url);
function ejecutar(programa, argumentos, cwd) {
  const resultado = spawnSync(programa, argumentos, { cwd, stdio: 'inherit' });
  if (resultado.error || resultado.status !== 0) throw new Error(`Falló ${programa}: ${resultado.error?.message ?? resultado.status}`);
}
const pnpm = process.env.npm_execpath;
if (!pnpm || !process.env.npm_config_user_agent?.startsWith('pnpm/')) {
  throw new Error('Ejecuta desde la raíz: pnpm run verificar');
}
for (const argumentos of [['install', '--frozen-lockfile'], ['run', 'check'], ['run', 'build'], ['test'], ['run', 'test:esquema']]) {
  const nativo = pnpm.toLowerCase().endsWith('.exe');
  ejecutar(nativo ? pnpm : process.execPath, nativo ? argumentos : [pnpm, ...argumentos], fileURLToPath(raiz));
}
ejecutar(process.execPath, [fileURLToPath(new URL('pruebas/verificar_vectores.mjs', raiz))], fileURLToPath(raiz));
console.info('Verificación local terminada. Sin despliegue ni dispositivos.');
