import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';

const raiz = new URL('../', import.meta.url);
const leer = (ruta) => JSON.parse(readFileSync(new URL(ruta, raiz), 'utf8'));
const ajv = new Ajv2020({ strict: true, coerceTypes: false, removeAdditional: false });
const validar = ajv.compile(leer('compartido/protocolo.schema.json'));
const archivos = readdirSync(new URL('compartido/ejemplos/', raiz)).filter((nombre) => nombre.endsWith('.json')).sort();
for (const nombre of archivos) assert.ok(validar(leer(`compartido/ejemplos/${nombre}`)), `Ejemplo inválido: ${nombre}`);
const comando = leer('compartido/ejemplos/04_lock_for.payload.json');
const invalidos = [];
for (const [campo, valor] of [
  ['durationSec', null], ['durationSec', 59], ['durationSec', 604801],
  ['seq', '0'], ['seq', '07'], ['sender', 'CHILD'], ['bootId', 'no-uuid'],
  ['commandNonce', 'ABC'], ['v', 2], ['unknownField', true], ['action', 'LOCK'],
]) invalidos.push({ ...structuredClone(comando), [campo]: valor });
const estado = leer('compartido/ejemplos/10_state_inicial.payload.json');
invalidos.push({ ...estado, lastResult: 'APPLIED' }, { ...estado, lastAcceptedSeq: '7' });
for (const [indice, valor] of invalidos.entries()) assert.equal(validar(valor), false, `Contraejemplo ${indice + 1} aceptado`);
console.info(`OK: esquema válido; ${archivos.length} ejemplos aceptados y ${invalidos.length} contraejemplos rechazados.`);
console.info('Validación estructural; no demuestra autorización ni funcionamiento de las apps.');
