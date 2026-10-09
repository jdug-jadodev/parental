# Estado del servidor separado

Origen: parental_padre, commit previo a extracción 308c2b1.
Estado: R01_IMPLEMENTADO_Y_VERIFICADO_LOCAL — R02/R03 pendientes; no servicio público operativo.

Los 18 archivos propios de relay/ se trasladaron sin cambios y se compararon
por SHA-256 con el origen. Se conservaron dependencias/resultados existentes
(no versionados). Contrato/ejemplos/fixtures copiados sin modificaciones.
SPEC del relay y plan original copiados a documentacion/ como referencias.
Evidencias C01/C02 copiadas son historia anterior de ambos componentes,
no nuevas pruebas ni certificación del servidor en Render.

Pruebas tras separación: scripts/verificar.ps1 correcto, npm ci/check/build y
30 tests Node aprobados, cero omitidos/fallos. Diez vectores/78 comprobaciones
documentales correctas. Interoperabilidad opcional desde el padre con rutaRelay
al codec de este proyecto: un test aprobado, 20 cruces de firmas nuevas. No
demuestra autenticación, WSS público, Render real ni políticas del hijo.
Contrato/ejemplos/fixture se comparan por SHA-256 con el padre al cerrar extracción.
node_modules/dist ignorados; npm informó cero vulnerabilidades y aviso de script
esbuild sin aprobación añadida. No hubo funciones nuevas ni cambios en relay/src.
Ningún ADB ni despliegue durante la extracción. El registro anterior describe
únicamente esa etapa; el desarrollo autorizado posterior se detalla abajo.

## R01 — 2026-10-09

Solicitud: iniciar el servidor separado, sin afectar apps padre/hijo y sin Python.
Se trabajó solo en parental_render, sin ejecutar operaciones en otros repositorios.

Archivos: relay/src/config.ts (env, UUID v4, origen HTTPS, SPKI P-256 canónico,
claves distintas, errores sin valores); relay/src/transporte.ts (ws noServer,
cp.v1, maxPayload 16384, compresión deshabilitada, filtro de ruta/Origin);
relay/src/server.ts (validación previa de configuración parcial, límites HTTP
y conexiones, rechazo seguro de upgrades). Tests config/transporte y ampliación
de arranque/server. No se conecta handleUpgrade ni se aceptan sockets operativos.
Health sigue 503, escucha 127.0.0.1 y production sigue bloqueado, incluso con
configuración válida: R01 no afirma autenticación ni disponibilidad CP/1.

Eliminado pruebas/verificar_esquema.py; reemplazo Node/Ajv en
relay/scripts/verificar-esquema.mjs conserva 28 ejemplos y 13 contraejemplos.
Nuevo scripts/verificar.mjs y comandos npm verificar/test:esquema; el wrapper
PowerShell opcional también ejecuta esquema. README actualizado y normalizado
a UTF-8 (tenía un fragmento UTF-16 mezclado). No se modificó compartido/ ni
fixtures. Referencias históricas al Python se conservan como historia, no requisito.

Ejecutado desde relay/: npm run verificar. Primer intento falló en check por
tipo Duplex sin setTimeout; corregido con temporizador limpiado al cerrar.
Segundo intento: npm ci correcto (0 vulnerabilidades), check/build correctos,
35 tests aprobados (0 fallos/omitidos), esquema: 28 ejemplos aceptados y 13
contraejemplos rechazados; vectores: 10 firmas y 78 comprobaciones correctas.
Runtime Node v24.21.0. npm mantiene aviso de postinstall esbuild sin aprobación;
no se aprobó un script adicional. No se ejecutó el wrapper PowerShell esta vez.

Pendiente R02: retos, autenticación y rechazo de binarios al enlazar transporte.
Pendiente R03: routing, heartbeat, backpressure, límites por IP/globales de
upgrades/mensajes, cierre de sockets 1012, pruebas completas de frames grandes,
memoria y preparación/despliegue Render. El test R-LIMIT-01 de R01 verifica
opciones y rechazos HTTP, no el comportamiento de frames de sockets autenticados.
Integración móvil posterior coordinada: primero clientes Node autenticados;
las apps no se compilaron ni modificaron. Sin dispositivos, ADB ni despliegue.

## Refactorización hexagonal — 2026-10-09

Solicitud posterior: estructura tradicional con src/ en la raíz, puertos,
casos de uso, controladores, adaptadores, DTOs, entidades y mappers; sin
comentarios en código. No se avanzó R02/R03 durante esta tarea.

Primer bloque: paquete npm/configuración de herramientas trasladados a raíz;
src/domain, src/application/ports/{input,output}, src/application/use-cases,
src/infrastructure/{adapters,config,http,websocket,protocol}, src/bootstrap y
src/main.ts. Inyección por constructor desde composición, dominio/aplicación
sin dependencias Node ni infraestructura. Configuración, health y rechazo de
upgrades usan controladores → puertos de entrada → casos de uso; estos usan
puertos de salida para estado local y validación pública.

Request/response DTOs y mappers separados; SolicitudConexion ↔ UpgradeEntity
y DecisionConexion → RechazoUpgradeEntity. Errores HTTP inesperados devuelven
500 genérico; configuración solo mapea variables permitidas. DTOs CP/1, codec
y criptografía técnica aislados en infraestructura, sin alterar contrato ni
bytes firmados. Tests y herramienta de interoperabilidad trasladados a test/.
README y documentacion/ARQUITECTURA.md describen las rutas nuevas; referencias
relay/ históricas se conservan. No se modificaron las apps consumidoras.

Ejecutado dos veces npm run verificar desde la raíz: ci/check/build correctos,
35 tests aprobados, esquema 28 ejemplos/13 contraejemplos y vectores 10/78.
Node v24.21.0, 0 vulnerabilidades; aviso esbuild sin aprobación adicional.
La antigua carpeta relay/ solo conservaba artefactos locales y carpetas vacías;
se trasladó íntegra, sin borrar, a la carpeta aprobada de temporales OpenCode:
parental_render-relay-heredado-20261009-hexagonal. Los artefactos nuevos se
generan en node_modules/ y dist/ de la raíz.

Este bloque conserva loopback, health 503, upgrades rechazados, bloqueo de
producción y límites R01. Commit del primer bloque: c986288.

### Cierre de refactorización

Añadidos test/arquitectura.test.ts, test/hexagonal.test.ts,
test/respuestas.test.ts y test/interoperabilidad.test.ts. Comprueban aislamiento
de imports de dominio/aplicación, ausencia de comentarios en src, contratos
inyectados, sustitución de puertos con dobles, DTOs independientes, filtrado del
entorno, roundtrip dominio/entidad WebSocket, interrupción ante fallo del puerto,
500 genérico HTTP/upgrade y ejecución de la herramienta Node desde otra carpeta.
Firma efímera solo en RAM en prueba local; no se escriben ni devuelven privadas.

Ejecutado npm run verificar tras añadir pruebas: primero 48 tests aprobados;
tras añadir comprobaciones de herramienta, verificación final con 50 tests
aprobados, 0 fallos/omitidos, ci/check/build correctos, 28 ejemplos aceptados,
13 contraejemplos rechazados y 10 vectores/78 comprobaciones correctas.
0 vulnerabilidades, mismo aviso esbuild sin aprobación. No se ejecutó el wrapper
PowerShell ni integración JVM/Android; los dos tests de herramienta son Node local.

Refactorización terminada; servidor sigue en R01. Próxima función: R02.
No se modificó compartido/ ni los fixtures; no se ejecutaron comandos en las
apps padre/hijo. No dispositivos, ADB, despliegue ni habilitación de WSS público.

## Migración a pnpm — 2026-10-09

Migración limitada a este servidor. Se fija pnpm@10.0.0 en packageManager,
usando la versión local instalada, sin instalar/actualizar herramientas globales.
pnpm-lock.yaml importado mediante pnpm import desde package-lock.json; comprobación
Node antes de retirar el lockfile anterior: los 39 paquetes conservan versión
e integridad. No se actualizaron dependencias directas ni transitivas.

Eliminado package-lock.json tras comprobar la importación. .npmrc mantiene
save-exact/engine-strict y exige la versión fijada del gestor. package.json
declara onlyBuiltDependencies vacío: no se autoriza ningún script de instalación
de dependencias. pnpm informó postinstall esbuild ignorado; los binarios opcionales
permitieron compilar/probar en Windows sin aprobarlo.

scripts/verificar.mjs exige invocación mediante pnpm e instala con
pnpm install --frozen-lockfile; admite CLI JavaScript y ejecutable nativo Windows.
scripts/verificar.ps1 delega al mismo verificador para evitar duplicar pasos.
README, ARQUITECTURA y AGENTS actualizados; evidencias/SPEC copiada conservan
comandos npm históricos, no instrucciones vigentes de instalación.
Añadido test/gestor-paquetes.test.ts: rechazo antes de instalar si no se usa pnpm.

Ejecutado: pnpm --version (10.0.0), node --version (v24.21.0), pnpm import,
pnpm run check (correcto), comparación Node de los 39 paquetes, pnpm audit
(sin vulnerabilidades conocidas) y pnpm run verificar (50 tests aprobados).
Tras añadir dos tests del gestor y eliminar el lockfile npm, ejecutado
powershell -NoProfile -File scripts/verificar.ps1: invoca pnpm run verificar;
install --frozen-lockfile/check/build correctos, 52 tests aprobados,
0 fallos/omitidos, 28 ejemplos aceptados y 13 contraejemplos rechazados,
10 vectores firmados/78 comprobaciones documentales correctas.

No se modificó src/, compartido/ ni fixtures, ni se operó sobre las apps.
Siguen loopback, health 503, upgrades rechazados y producción bloqueada.
Sin dispositivos, despliegue, autenticación nueva ni cambios de R02/R03.

## Simplificación de arquitectura solicitada — 2026-10-09

Primer bloque: application/{mapper,dtos,usecase,validations}; domain/entities
(una clase por archivo) y domain/ports/{portin,portout}; infrastructure/
{controller,routers,adapter,config}. Composición en config/dependencias.ts,
sin bootstrap paralelo. DTOs/mappers de aplicación fuera de infraestructura.
Protocolo técnico, entidades y mapper WebSocket dentro de adapter/.

Eliminados ConexionController y DTO/mapper de conexión duplicados; WebSocketAdapter
inyecta EvaluarConexionEntrada y convierte directamente entidad → dominio →
decisión → rechazo de transporte. ConfiguracionServidor reemplaza al controller
de configuración sin exponer ruta HTTP. ServicioController solo health/keepalive;
ServicioRouter resuelve rutas/métodos y errores; configuración HTTP solo cablea
router y adaptador. Puerto/entorno/log y admisión de handshake en validations.

Añadido GET /keepalive, 200 {alive:true}, distinto de health 503. Solo actividad
del proceso: no disponibilidad CP/1 ni garantía contra suspensión de Render.
Sin cron, autopings o integración externa. La SPEC copiada conserva HTTP antiguo
como referencia; la ampliación solicitada se documenta en ARQUITECTURA/README.

Ejecutado pnpm run verificar: instalación congelada/check/build correctos,
52 tests aprobados (0 fallos/omitidos), 28 ejemplos y 13 contraejemplos correctos,
10 vectores/78 comprobaciones. Contrato/fixtures intactos, R02/R03 pendientes.
Primer bloque guardado en commit 0389173.

### Cierre de simplificación

Pruebas de arquitectura reforzadas: estructura exacta, DTOs solo en aplicación,
una clase por archivo de entidad de dominio, puertos sin DTOs, inyección por
constructor, composición restringida a config/dependencias y solo dos métodos
públicos HTTP en controller. El adaptador de entrada WebSocket se distingue de
adaptadores de salida. Mapper de infraestructura no importa DTO/mappers de aplicación.
Entidades WebSocket copian/congelan cabeceras y arrays; pruebas de roundtrip y
rechazo de interpretar 500 de transporte como decisión de dominio.

Añadidos test/keepalive.test.ts y test/websocket-adapter.test.ts; comprueban
keepalive 200 sin afirmar CP/1, health todavía 503, rechazo de otras rutas,
métodos/query y que el adaptador entrega una entidad de dominio a su puerto,
no DTOs ni socket. Fallos HTTP de ambos endpoints siguen devolviendo 500 genérico.
Router registra las rutas una sola vez, sin repetir la lista para validarlas.

dist anterior trasladado sin borrar a la carpeta temporal aprobada OpenCode:
parental_render-dist-anterior-simplificacion-20261009. Eliminadas solo carpetas
vacías de src dejadas por los movimientos, mediante borrado no recursivo.
Ejecutado pnpm run verificar con build desde dist limpio: 59 tests aprobados,
0 fallos/omitidos; instalación congelada/check/build correctos, 28 ejemplos,
13 contraejemplos, 10 vectores y 78 comprobaciones correctos. Node v24.21.0.

Sin modificaciones a apps, compartido/ o fixtures; sin dispositivos, despliegue
ni sockets habilitados. Loopback, health 503 y production bloqueado conservados.
R02/R03 siguen pendientes. No se ejecutó el wrapper PowerShell en esta tarea.

## R02 — autenticación local, desarrollo en curso — 2026-10-09

Primer bloque: entidades de reto/intento/prueba/conexión autenticada y fallo;
puerto de entrada AutenticarConexionEntrada y puertos de salida para reloj,
entropía, retos y verificación. Caso de uso consume el reto antes de verificar,
comprueba vínculo con socket/nonce/pareja y expiración monotónica exacta de 10 s,
también tras completar la firma. Cancelación idempotente al desconectar.
Adaptadores de salida: memoria acotada a 16 retos, UUID v4/nonce32 aleatorios,
performance.now y verificación P-256 con claves públicas fijadas al arrancar.
Se comprueba firma sobre bytes originales antes de interpretar el payload;
ninguna clave recibida del cliente decide autoridad. Mappers específicos en adapter.

Ejecutado pnpm run verificar: instalación congelada/check/build correctos,
71 tests aprobados, 0 fallos/omitidos. Nuevas pruebas contra ambos fixtures AUTH:
consumo único, otro socket, límite/limpieza, expiración exacta y durante firma,
firma inválida, rol/nonce/pareja erróneos, propósito incompatible, clave propuesta
y copias de bytes independientes. Esquema 28 ejemplos/13 contraejemplos correcto;
10 vectores/78 comprobaciones correctos. Node v24.21.0.

Este bloque aún no enlaza autenticación al transporte: upgrades siguen bloqueados.
Siguiente bloque de R02: conexión del handshake local y pruebas con clientes Node.
No apps, dispositivos, despliegue ni modificaciones al contrato/fixtures.

## R02 — cierre local — 2026-10-09

Segundo bloque: EvaluarConexion/DecisionConexion admiten exclusivamente la fase
de autenticación cuando la composición recibe configuración pública completa.
dependencias.ts inyecta retos, reloj, entropía, codec/verificación y transporte.
WebSocketAdapter valida loopback, enlaza handleUpgrade con sus bytes head,
envía CHALLENGE/AUTH_OK/ERROR y cancela retos al cerrar, vencer o fallar.
Mantiene una conexión autenticada por rol, reemplazándola solo tras firma válida
y sin permitir que el cierre antiguo elimine al nuevo. Máximo 16 retos pendientes,
18 sockets totales; binarios y frames >16 KiB rechazados. servidor.config.ts y
main.ts coordinan cierre 1012 y terminación forzada. README/ARQUITECTURA actualizados.

Ejecutado pnpm run verificar: instalación congelada, check y build correctos;
81 tests aprobados, 0 fallos/omitidos; 28 ejemplos aceptados, 13 contraejemplos
rechazados, 10 vectores/78 comprobaciones correctos. Node v24.21.0.
test/auth-websocket.test.ts y test/soporte/cliente-auth.ts usan clientes Node locales
y privadas efímeras solo en RAM: ambos roles, copia entre sockets, impostor,
rol/pareja/nonce inválidos, sustitución repetida, repetición de AUTH, aplicación
prohibida, binarios/JSON ambiguo/límite, rechazo de Origin/query/ruta/subprotocolo,
saturación de 16 retos y liberación, cierre real tras 10 s y cierre 1012.
Durante el desarrollo se corrigieron un error TypeScript de RawData y una
comparación de prototipos JSON en el cliente de pruebas antes de verificar.

También ejecutado smoke Node por stdin sobre dist/src con públicas ficticias:
composición compilada, escucha en puerto efímero loopback, health 503 y cierre
correctos. Un primer intento node -e falló por comillas PowerShell; no era fallo
del servidor y se repitió por stdin. No se ejecutó el wrapper PowerShell.

R02 completado localmente; R03 pendiente (routing, latidos, límites operativos,
rate limit de upgrades por IP y preparación Render). No se reenvían órdenes;
después de AUTH_OK cualquier frame de aplicación se rechaza. Sin configuración
continúan upgrades rechazados; health 503, loopback y producción bloqueada.
Sin apps, dispositivos, despliegue, push ni cambios al contrato/fixtures.
