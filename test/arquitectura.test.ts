import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const raiz = fileURLToPath(new URL('../src/', import.meta.url));
function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = resolve(carpeta, entrada.name);
    return entrada.isDirectory() ? archivos(ruta) : ruta.endsWith('.ts') ? [ruta] : [];
  });
}
function visitar(nodo: ts.Node, accion: (nodo: ts.Node) => void): void {
  accion(nodo);
  ts.forEachChild(nodo, (hijo) => visitar(hijo, accion));
}
const fuentes = archivos(raiz).map((ruta) => ({
  ruta,
  nombre: relative(raiz, ruta).replaceAll('\\', '/'),
  ast: ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true),
}));

test('arquitectura: dominio y aplicación solo dependen hacia dentro', () => {
  for (const { ruta, nombre, ast } of fuentes.filter((fuente) => /^(domain|application)\//.test(fuente.nombre))) {
    visitar(ast, (nodo) => {
      if ((ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) && nodo.moduleSpecifier) {
        assert.ok(ts.isStringLiteral(nodo.moduleSpecifier));
        const modulo = nodo.moduleSpecifier.text;
        assert.ok(modulo.startsWith('.'), `${nombre} importa dependencia externa ${modulo}`);
        const destino = relative(raiz, resolve(dirname(ruta), modulo)).replaceAll('\\', '/');
        const permitido = nombre.startsWith('domain/') ? /^domain\// : /^(domain|application)\//;
        assert.match(destino, permitido, `${nombre} depende de ${destino}`);
      }
      if (ts.isIdentifier(nodo)) assert.ok(!['Buffer', 'process', 'NodeJS', 'require'].includes(nodo.text), `${nombre}: ${nodo.text}`);
      if (ts.isCallExpression(nodo)) assert.notEqual(nodo.expression.kind, ts.SyntaxKind.ImportKeyword, `${nombre}: import dinámico`);
    });
  }
});

test('arquitectura: controladores reciben puertos de entrada, casos de uso y adaptadores implementan sus contratos', () => {
  for (const { nombre, ast } of fuentes) {
    const controlador = nombre.includes('/controllers/');
    const implementacion = nombre.startsWith('application/use-cases/') || nombre.startsWith('infrastructure/adapters/');
    if (!controlador && !implementacion) continue;
    visitar(ast, (nodo) => {
      if (ts.isClassDeclaration(nodo)) {
        if (implementacion) {
          const implementa = nodo.heritageClauses?.find((clausula) => clausula.token === ts.SyntaxKind.ImplementsKeyword);
          assert.ok(implementa?.types.some((tipo) => /(?:Entrada|Salida)$/.test(tipo.expression.getText(ast))), nombre);
        }
        if (controlador) {
          const constructor = nodo.members.find(ts.isConstructorDeclaration);
          assert.ok(constructor?.parameters.some((parametro) => /Entrada$/.test(parametro.type?.getText(ast) ?? '')), nombre);
        }
      }
      if (ts.isImportDeclaration(nodo) && ts.isStringLiteral(nodo.moduleSpecifier)) {
        assert.doesNotMatch(nodo.moduleSpecifier.text, /(?:bootstrap|use-cases|adapters)\//, nombre);
      }
    });
  }
});

test('arquitectura: src no contiene comentarios', () => {
  for (const { nombre, ast } of fuentes) {
    const literales = new Map<number, number>();
    visitar(ast, (nodo) => {
      if (ts.isStringLiteralLike(nodo) || nodo.kind === ts.SyntaxKind.RegularExpressionLiteral || ts.isTemplateExpression(nodo)) {
        literales.set(nodo.getStart(ast), nodo.end);
      }
    });
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, ast.text);
    let token: ts.SyntaxKind;
    while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
      const finalLiteral = literales.get(scanner.getTokenPos());
      if (finalLiteral !== undefined) { scanner.setTextPos(finalLiteral); continue; }
      assert.ok(token !== ts.SyntaxKind.SingleLineCommentTrivia && token !== ts.SyntaxKind.MultiLineCommentTrivia, nombre);
    }
  }
});
