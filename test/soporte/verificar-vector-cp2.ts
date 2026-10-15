import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CodecVinculacionCp2 } from '../../src/infrastructure/adapter/protocol/cp2/codec-vinculacion.js';
import { CriptografiaVinculacionCp2 } from '../../src/infrastructure/adapter/protocol/cp2/criptografia-vinculacion.js';
import { CodecAutenticacionCp2 } from '../../src/infrastructure/adapter/protocol/cp2/codec-autenticacion.js';
import { CriptografiaAutenticacionCp2 } from '../../src/infrastructure/adapter/protocol/cp2/criptografia-autenticacion.js';

export function verificarVectorCp2(valor: unknown): { oferta: true; pair: true; firmasAuth: number } {
  const exigir = (condicion: unknown): void => { if (!condicion) throw new Error('Vector público CP2 inválido'); };
  exigir(valor !== null && typeof valor === 'object' && !Array.isArray(valor));
  const vector = valor as Record<string, unknown>;
  const requeridas = ['fixture', 'parentPublicKeyB64', 'childPublicKeyB64', 'childOfferUtf8', 'pairFrameUtf8', 'pairPayloadSha256B64'];
  const opcionales = ['authParentFrameUtf8', 'authChildFrameUtf8'];
  exigir(requeridas.every((clave) => typeof vector[clave] === 'string' && vector[clave].length > 0));
  exigir(Object.keys(vector).every((clave) => [...requeridas, ...opcionales].includes(clave)));
  exigir(vector.fixture === 'CP2_PUBLICO_EFIMERO_SIN_AUTORIDAD');
  const tieneAuth = opcionales.some((clave) => clave in vector);
  if (tieneAuth) exigir(opcionales.every((clave) => typeof vector[clave] === 'string' && vector[clave].length > 0));
  const datos = vector as Record<string, string>;
  const codec = new CodecVinculacionCp2(readFileSync(new URL('../../contrato-cp2/vinculacion.schema.json', import.meta.url)));
  const oferta = codec.leerOferta(Buffer.from(datos.childOfferUtf8!));
  exigir(oferta.childPublicKeyB64 === datos.childPublicKeyB64);
  const pair = new CriptografiaVinculacionCp2(codec).verificarAceptacion(Buffer.from(datos.pairFrameUtf8!), datos.parentPublicKeyB64!);
  exigir(pair.mensaje.childPublicKeyB64 === oferta.childPublicKeyB64 && pair.mensaje.enrollId === oferta.enrollId &&
    pair.mensaje.enrollNonce === oferta.enrollNonce && pair.payloadSha256B64 === datos.pairPayloadSha256B64);
  if (tieneAuth) {
    const auth = new CriptografiaAutenticacionCp2(new CodecAutenticacionCp2(
      readFileSync(new URL('../../contrato-cp2/autenticacion.schema.json', import.meta.url))));
    for (const rol of ['PARENT', 'CHILD'] as const) {
      const frame = datos[rol === 'PARENT' ? 'authParentFrameUtf8' : 'authChildFrameUtf8']!;
      const publica = datos[rol === 'PARENT' ? 'parentPublicKeyB64' : 'childPublicKeyB64']!;
      exigir(auth.verificarPrueba(Buffer.from(frame), publica, rol).mensaje.pairId === pair.mensaje.pairId);
    }
  }
  return { oferta: true, pair: true, firmasAuth: tieneAuth ? 2 : 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ruta = process.argv[2];
  if (!ruta || process.argv.length !== 3 || statSync(ruta).size > 32768) throw new Error('Indica un único vector público de hasta32KiB');
  const resultado = verificarVectorCp2(JSON.parse(readFileSync(ruta, 'utf8')) as unknown);
  console.info(JSON.stringify(resultado));
  console.info('Sólo interoperabilidad criptográfica local; no identidad, ceremonia o uso autorizado.');
}
