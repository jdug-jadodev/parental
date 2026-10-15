import type { ValidateFunction } from 'ajv/dist/2020.js';
import { canonico, exigir, leerJsonEstricto, utf8Estricto, type ValorJson } from '../json-estricto.js';

export function documentoCp2(bytes: Uint8Array, limite: number, validar: ValidateFunction): Record<string, ValorJson> {
  exigir(bytes.length > 0 && bytes.length <= limite, 'Tamaño CP/2 inválido');
  const texto = utf8Estricto(bytes);
  let nivel = 0;
  let cadena = false;
  let escape = false;
  for (const caracter of texto) {
    if (cadena) {
      if (escape) escape = false;
      else if (caracter === '\\') escape = true;
      else if (caracter === '"') cadena = false;
    } else if (caracter === '"') cadena = true;
    else if (caracter === '{' || caracter === '[') {
      nivel++;
      exigir(nivel <= 6, 'Profundidad CP/2 excedida');
    } else if (caracter === '}' || caracter === ']') nivel--;
  }
  const valor = leerJsonEstricto(texto);
  exigir(valor !== null && typeof valor === 'object' && !Array.isArray(valor), 'Se requiere objeto CP/2');
  exigir(canonico(valor) === texto, 'Documento CP/2 no canónico');
  exigir(validar(valor), 'Documento fuera del esquema CP/2');
  return valor;
}
