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
    const controlador = nombre.startsWith('infrastructure/controller/');
    const entrada = controlador || ['infrastructure/adapter/websocket.adapter.ts',
      'infrastructure/adapter/websocket-auth-cp2.adapter.ts'].includes(nombre);
    const casoDeUso = nombre.startsWith('application/usecase/');
    const salida = /^infrastructure\/adapter\/[^/]+\.adapter\.ts$/.test(nombre) && !entrada;
    if (!entrada && !casoDeUso && !salida) continue;
    visitar(ast, (nodo) => {
      if (ts.isClassDeclaration(nodo)) {
        if (casoDeUso || salida) {
          const implementa = nodo.heritageClauses?.find((clausula) => clausula.token === ts.SyntaxKind.ImplementsKeyword);
          const contrato = casoDeUso ? /Entrada$/ : /Salida$/;
          assert.ok(implementa?.types.some((tipo) => contrato.test(tipo.expression.getText(ast))), nombre);
        }
        if (entrada) {
          const constructor = nodo.members.find(ts.isConstructorDeclaration);
          assert.ok(constructor?.parameters.some((parametro) => /Entrada$/.test(parametro.type?.getText(ast) ?? '')), nombre);
        }
      }
      if (ts.isImportDeclaration(nodo) && ts.isStringLiteral(nodo.moduleSpecifier)) {
        assert.doesNotMatch(nodo.moduleSpecifier.text, /(?:usecase\/|dependencias\.js)/, nombre);
        if (controlador) assert.doesNotMatch(nodo.moduleSpecifier.text, /\/(?:adapter|config|routers)\//, nombre);
      }
    });
  }
});

test('arquitectura: solo existe la estructura acordada y los DTOs viven en aplicación', () => {
  const carpetas = readdirSync(raiz, { withFileTypes: true }).filter((entrada) => entrada.isDirectory()).map((entrada) => entrada.name).sort();
  assert.deepEqual(carpetas, ['application', 'domain', 'infrastructure']);
  for (const { nombre } of fuentes) {
    assert.match(nombre, /^(?:main\.ts|application\/(?:mapper|dtos|usecase|validations)\/.+|domain\/(?:entities|ports\/(?:portin|portout))\/.+|infrastructure\/(?:controller|routers|adapter|config)\/.+)$/, nombre);
    if (nombre.endsWith('.dto.ts')) assert.ok(nombre.startsWith('application/dtos/'), nombre);
    if (nombre.endsWith('.mapper.ts')) assert.match(nombre, /^(?:application\/mapper|infrastructure\/adapter\/mapper)\//, nombre);
  }
});

test('arquitectura: cada entidad de dominio tiene su archivo y los puertos no conocen DTOs', () => {
  for (const { nombre, ast } of fuentes) {
    if (nombre.startsWith('domain/entities/')) {
      assert.equal(ast.statements.filter(ts.isClassDeclaration).length, 1, nombre);
    }
    if (!nombre.startsWith('domain/ports/')) continue;
    assert.equal(ast.statements.filter(ts.isInterfaceDeclaration).length, 1, nombre);
    visitar(ast, (nodo) => {
      if (ts.isIdentifier(nodo)) assert.doesNotMatch(nodo.text, /Dto$/, nombre);
      if (ts.isImportDeclaration(nodo) && ts.isStringLiteral(nodo.moduleSpecifier)) {
        assert.match(nodo.moduleSpecifier.text, /^\.\.\/\.\.\/entities\//, nombre);
      }
    });
  }
});

test('arquitectura: composición solo en config y controller solo tiene health/keepalive', () => {
  const controllers = fuentes.filter((fuente) => fuente.nombre.startsWith('infrastructure/controller/'));
  assert.equal(controllers.length, 1);
  const controller = controllers[0]!;
  const metodos: string[] = [];
  visitar(controller.ast, (nodo) => {
    if (ts.isMethodDeclaration(nodo) && !nodo.modifiers?.some((modificador) => modificador.kind === ts.SyntaxKind.PrivateKeyword)) {
      metodos.push(nodo.name.getText(controller.ast));
    }
  });
  assert.deepEqual(metodos.sort(), ['health', 'keepalive']);
  for (const { ruta, nombre, ast } of fuentes.filter((fuente) => fuente.nombre.startsWith('infrastructure/'))) {
    visitar(ast, (nodo) => {
      if (!ts.isImportDeclaration(nodo) || !ts.isStringLiteral(nodo.moduleSpecifier)) return;
      const destino = relative(raiz, resolve(dirname(ruta), nodo.moduleSpecifier.text)).replaceAll('\\', '/');
      if (destino.startsWith('application/usecase/')) assert.equal(nombre, 'infrastructure/config/dependencias.ts');
      if (nombre.startsWith('infrastructure/adapter/mapper/')) assert.doesNotMatch(destino, /^application\//, nombre);
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
