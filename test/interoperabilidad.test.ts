import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { CodecProtocolo } from '../src/infrastructure/protocol/codec-protocolo.js';
import { ClaveVerificacion, CriptografiaProtocolo } from '../src/infrastructure/protocol/crypto-protocol.js';
import type { Rol, SobreFirmado } from '../src/infrastructure/protocol/dtos/protocolo.dto.js';

const fixture = JSON.parse(readFileSync(new URL('../pruebas/vectores_crypto.json', import.meta.url), 'utf8')) as {
  publicKeys: Record<Rol, string>;
  vectors: { signerRole: Rol; payloadSha256B64: string; envelope: SobreFirmado }[];
};
const codec = new CodecProtocolo(readFileSync(new URL('../compartido/protocolo.schema.json', import.meta.url)));
const herramienta = fileURLToPath(new URL('./soporte/interoperabilidad.mjs', import.meta.url));
function ejecutar(peticion: object): string {
  const resultado = spawnSync(process.execPath, ['--import', 'tsx', herramienta], {
    input: JSON.stringify(peticion), encoding: 'utf8', timeout: 5000,
    cwd: fileURLToPath(new URL('../src/', import.meta.url)),
  });
  assert.equal(resultado.error, undefined);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(resultado.stderr, '');
  return resultado.stdout;
}

test('interoperabilidad: herramienta trasladada verifica un fixture desde otra carpeta', () => {
  const vector = fixture.vectors[0]!;
  const salida = ejecutar({
    accion: 'verificar', rol: vector.signerRole, publicaB64: fixture.publicKeys[vector.signerRole],
    sobre: vector.envelope, proposito: vector.envelope.purpose,
  });
  assert.deepEqual(JSON.parse(salida), { ok: true, hash: vector.payloadSha256B64 });
});

test('interoperabilidad: herramienta firma con clave efímera sin devolver privadas', () => {
  const vector = fixture.vectors[2]!;
  const salida = ejecutar({
    accion: 'firmar', rol: vector.signerRole, payloadB64: vector.envelope.payloadB64, proposito: vector.envelope.purpose,
  });
  const respuesta = JSON.parse(salida) as { publicaB64: string; sobre: SobreFirmado };
  assert.deepEqual(Object.keys(respuesta).sort(), ['publicaB64', 'sobre']);
  const documento = new CriptografiaProtocolo(codec).verificarSobre(
    codec.codificarFrame(respuesta.sobre), ClaveVerificacion.desdeSpki(vector.signerRole, respuesta.publicaB64), vector.envelope.purpose,
  );
  assert.equal(documento.payloadSha256B64, vector.payloadSha256B64);
});
