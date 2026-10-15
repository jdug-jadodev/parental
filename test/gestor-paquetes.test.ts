import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const verificar = fileURLToPath(new URL('../scripts/verificar.mjs', import.meta.url));
test('plantilla inicial usa corepack pnpm directo sin habilitar enlaces globales en Render', () => {
  const plantilla = readFileSync(new URL('../plantillas/render-inicial.yaml.example', import.meta.url), 'utf8');
  assert.match(plantilla, /buildCommand: corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm run build/);
  assert.match(plantilla, /startCommand: corepack pnpm start/);
  assert.doesNotMatch(plantilla, /corepack enable/);
  assert.match(plantilla, /autoDeployTrigger: "off"/);
  assert.match(plantilla, /healthCheckPath: \/keepalive/);
});
for (const gestor of [undefined, 'npm/11.0.0']) {
  test(`verificador exige pnpm cuando el gestor es ${gestor ?? 'ausente'}`, () => {
    const env = { ...process.env };
    if (gestor === undefined) {
      delete env.npm_execpath;
      delete env.npm_config_user_agent;
    } else {
      env.npm_execpath = 'cli-no-ejecutable-de-doble.js';
      env.npm_config_user_agent = gestor;
    }
    const resultado = spawnSync(process.execPath, [verificar], { env, encoding: 'utf8', timeout: 5000 });
    assert.equal(resultado.error, undefined);
    assert.equal(resultado.status, 1);
    assert.equal(resultado.stdout, '');
    assert.match(resultado.stderr, /Ejecuta desde la raíz: pnpm run verificar/);
  });
}
