# CI del servidor — preparado, no ejecutado remotamente

`.github/workflows/verificar.yml` prepara GitHub Actions para push, pull_request
y ejecución manual. No se hizo push ni se configuró un repositorio remoto o
protección de ramas. El archivo solo se activará cuando se publique en GitHub
y Actions esté habilitado con autorización del propietario.

## Qué ejecuta

- Matriz Ubuntu 24.04 / Windows 2025 con Node 24.21.0 desde `.node-version`.
- pnpm 10.0.0 desde `packageManager`, sin duplicar versión en el workflow.
- `pnpm run verificar`: instalación congelada, TypeScript, build, tests,
  esquema y vectores. Incluye la prueba real de heartbeat de unos 60 segundos.
- `git diff --exit-code`: falla si la verificación altera archivos versionados.
- `pnpm run test:carga`: 70 ciclos locales sobre el build ya verificado.
- Solo por ejecución manual, opción `carga_prolongada`: 610 ciclos en Linux.

Cada job tiene un límite de 20 minutos. Un cambio nuevo cancela la ejecución
anterior de la misma referencia. Un fallo en una plataforma no cancela la otra.
No hay cron, despliegue, arranque público ni dependencia de las apps.

## Permisos y dependencias

Solo `contents: read`; checkout no conserva credenciales Git. No usa secretos,
variables de pareja, entornos de producción, servicios ni artefactos subidos.
Las privadas de los clientes ficticios se generan en RAM. No usar
pull_request_target para ejecutar código propuesto ni añadir tokens de despliegue.
Se mantienen `onlyBuiltDependencies: []` y `pnpm-lock.yaml`, sin aprobar postinstall.
No se cachea node_modules ni el store inicialmente para simplificar el diagnóstico.

Acciones fijadas a SHA de commit, resueltas desde sus repositorios oficiales:

| Acción | Referencia consultada | Commit |
|---|---|---|
| actions/checkout | v6 | d23441a48e516b6c34aea4fa41551a30e30af803 |
| actions/setup-node | v6 | 249970729cb0ef3589644e2896645e5dc5ba9c38 |
| pnpm/action-setup | v4 | b906affcce14559ad1aafd4ab0e942779e9f58b1 |

La referencia v4 de pnpm es un tag anotado; se fijó su commit, no el objeto tag.
Actualizar acciones requiere revisar y sustituir sus SHA explícitamente.
Los runners alojados deben soportar el runtime de las acciones; no se configura
un runner propio. Node queda fijado al parche de `.node-version`; actualizarlo
requiere verificar de nuevo las pruebas y mantener la familia 24 admitida.

## Evidencia y pendientes

Las verificaciones locales y lint del workflow se registran en ESTADO.md.
Ni la validación estática ni ejecutar los comandos en Windows demuestra que
las acciones descarguen herramientas o pasen en Ubuntu/Windows alojados.
Tras un push autorizado hay que revisar ambos jobs antes de declarar CI operativo
y definir si sus checks serán obligatorios en la rama elegida por el propietario.
Los tests locales mantienen loopback, health 503 y bloqueo de producción.
