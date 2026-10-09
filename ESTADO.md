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

## R03 — primer bloque local, en curso — 2026-10-09

Implementados MensajeRelay/FalloRelay, ProcesarMensajeEntrada y verificación de
mensajes como puerto de salida. Firma MESSAGE verificada con la clave del rol
autenticado antes de interpretar payload; autorización por pareja/emisor/tipo.
Mapper de borde con entidad de transporte; reenvío de bytes originales, sin cola.
WebSocketAdapter responde PING/PONG (un envío pendiente, duplicado inmediato
ignorado), PEER_STATUS y PEER_UNAVAILABLE; limita todos los frames autenticados
a ráfaga 20 y recarga 10/s. Salida acotada a 64 KiB incluyendo el próximo frame;
receptor lento se cierra y emisor recibe indisponibilidad, nunca ACK de aplicación.
Limpieza de sockets mediante ping de transporte cada 30 s con nonce verificado;
no es keepalive HTTP, no evita suspensión ni demuestra aplicación de órdenes.
Upgrades: cupo global 40/10 por segundo, por IP 20/2 por segundo, tabla máxima
128 entradas con TTL 60 s. Solo remoteAddress; X-Forwarded-For no da autoridad.

Ejecutado pnpm run verificar: instalación congelada/check/build correctos,
86 tests aprobados, 0 fallos/omitidos; 28 ejemplos/13 contraejemplos y 10 vectores/
78 comprobaciones correctos, Node v24.21.0. Nuevas pruebas deterministas cubren
cupo, TTL/límite global, borde 64 KiB, fallo de envío y limpieza de latidos.
Un primer intento detectó dos violaciones de arquitectura: helper técnico con
sufijo de adaptador de salida y mapper importando DTOs de aplicación. Corregidas
sin debilitar los tests. Pruebas R02 ajustadas para presencia y rechazo de AUTH
repetido, no para rechazar PING ya válido. Pendientes pruebas de routing y carga.

Conservados health 503, loopback y bloqueo de producción. No apps, dispositivos,
despliegue, push ni modificaciones de compartido/fixtures.

## R03 — cierre de implementación local — 2026-10-09

Segundo bloque: test/routing.test.ts prueba con clientes Node ambos sentidos y
cuatro tipos permitidos, preservación byte a byte incluso con espacios externos,
presencia, receptor ausente sin cola, reconexión/restart, sustitución de sockets,
impostores, firma/pareja/rol/propósito/versión/campos inválidos, PING/PONG sin
reenvío, duplicado inmediato ignorado y exceso de mensajes. test/backpressure.test.ts
simula bufferedAmount >64 KiB en un socket real para comprobar cierre del receptor
y PEER_UNAVAILABLE al emisor sin notificación duplicada. No es medición de una
red lenta real; el borde exacto y errores de envío se prueban determinísticamente.

Ejecutado pnpm run verificar final: instalación congelada/check/build correctos,
94 tests aprobados, 0 fallos/omitidos; 28 ejemplos aceptados, 13 contraejemplos
rechazados, 10 vectores/78 comprobaciones correctos. Node v24.21.0.
Ejecutado pnpm run test:carga sobre dist compilado, con GC explícito: 70 ciclos
autenticados/desconectados alternando roles, seis lotes medidos y cero conexiones
TCP al final de cada lote. Heap base 13.458.936 bytes, final 13.483.080 (+24.144);
memoria externa base 4.468.676, final 4.451.680; RSS base 86.269.952, final
86.441.984. Heap de los seis lotes: 13.342.088, 13.384.568, 13.403.416,
13.428.448, 13.447.736 y 13.483.080 bytes. Dentro de márgenes locales de 8 MiB
heap/4 MiB externa; no demuestra ausencia de fugas a largo plazo ni capacidad
pública. Script test/soporte/carga-relay.mjs añadido a package.json como test:carga;
requiere compilar antes y no forma parte de la verificación corta.

Preparación documental: documentacion/DESPLIEGUE_RENDER.md y plantilla inactiva
plantillas/render.yaml.example, desde raíz, pnpm fijado, una instancia y solo
variables públicas sin valores reales. No se aplicó plantilla: fallaría con
NODE_ENV=production bloqueado y health 503. README/ARQUITECTURA y encabezado de
AGENTS actualizados para no repetir R02/R03 locales como tareas pendientes.

R03 local implementado y verificado. Despliegue y validación pública pendientes:
requieren autorización, origen/exportación públicos coordinados, revisión TLS,
proxy por IP, readiness y prueba de carga/red real prolongada. Integración móvil
pendiente de que el propietario confirme disponibilidad de apps. No se modificaron
apps, compartido/ ni fixtures; sin dispositivos, despliegue, push o servicios
externos. Loopback, health 503 y bloqueo de producción permanecen.

## Revisión de seguridad y carga prolongada local — 2026-10-09

Revisados admisión/configuración, retos/firma, codec JSON/DER/base64url, routing,
salida, límites y cierre. Endurecimiento de WebSocketAdapter/websocket.config.ts:
autoPong deshabilitado, cupo ping/pong de control conjunto 10/s con ráfaga 20,
incluso antes de AUTH; respuesta manual acotada a 64 KiB. Se fijan maxFragments=64
y maxBufferedChunks=128 mediante opciones públicas existentes de ws/tipos.
Cabeceras originales >32 pares rechazadas antes de admisión como defensa
adicional. Node v24.21.0 ya rechaza exceso de cabeceras con HTTP 431: no se
reprodujo elusión de Origin. Salida incluye además cabecera WS de 2/4/10 bytes
en el margen de 64 KiB; corregido borde exacto de la prueba correspondiente.

test/seguridad-transporte.test.ts cubre cabeceras excesivas/Origin tardío, XFF
variable sin eludir cupo por socket, ping normal sin conceder autenticación,
flood ping y pong pre-AUTH, 64 fragmentos válidos y 65 vacíos rechazados. Prueba
real de heartbeat: padre autenticado sin autoPong envía nonce incorrecto y termina
con 1006 en la segunda revisión; hijo con pong correcto permanece conectado.
ClienteAuth permite desactivar autoPong exclusivamente como opción de prueba.
test/websocket-adapter.test.ts añade defensa rawHeaders y completa su doble de
IncomingMessage. Primer verificar detectó expectativa 400 frente al 431 nativo
y ausencia de rawHeaders en el doble; corregidos, sin relajar admisión real.

Ejecutado pnpm audit --json: 0 vulnerabilidades conocidas (todas las severidades),
40 dependencias según su metadata. No se actualizaron paquetes/lockfile ni se
autorizaron scripts de instalación. Es diagnóstico del registro, no auditoría
independiente ni garantía de seguridad.

Ejecutado pnpm run verificar final tras incluir framing: instalación congelada,
check/build correctos, 101 tests aprobados, 0 fallos/omitidos; 28 ejemplos y
13 contraejemplos correctos, 10 vectores/78 comprobaciones correctos. Node v24.21.0.

Carga ampliada en test/soporte/carga-relay.mjs y script test:carga:prolongada:
perfil largo de 60 lotes, AUTH/PING/PONG en ambos roles, SYNC_REQUEST sin receptor
en ciclos padre, memoria tras GC, P95 PONG local y P99 retraso del bucle. Salida
solo agregados; claves efímeras en RAM. Ejecutado pnpm run build y después
pnpm run test:carga:prolongada: 610 ciclos en 314.490 ms, cero conexiones al final
de cada lote. Heap base 13.548.616, final 13.981.240 (+432.624 bytes); externa base
4.475.497, final 4.449.489; RSS base 86.609.920, final 87.674.880. P95 PONG local
1,197 ms; P99 retraso del bucle 51,544 ms. Durante esta ejecución también hubo
verificaciones locales en otros procesos: no es benchmark aislado. Carga sobre
build con controles/fragmentos endurecidos, anterior al ajuste adicional de framing.

Tras ese ajuste se ejecutaron verificar final y pnpm run test:carga sobre build
final: 70 ciclos en 32.058 ms, seis lotes, cero conexiones entre lotes. Heap base
13.543.080, final 13.597.320 (+54.240 bytes); externa base 4.475.472, final
4.387.214; RSS base 85.639.168, final 85.962.752. P95 PONG 2,524 ms; P99 retraso
46,957 ms. Ambas cargas dentro de márgenes diagnósticos heap <8 MiB/externa <4 MiB.
No demuestran ausencia de fugas a largo plazo, capacidad pública ni latencia móvil.

README/ARQUITECTURA actualizados; documentacion/REVISION_SEGURIDAD.md registra
hallazgos, evidencia y límites. No apps, dispositivos, despliegue, push, CI remoto
ni modificaciones de compartido/fixtures. Sin servicios externos ni autopings HTTP.
Conservados loopback, health 503 y producción bloqueada. Pendientes: TLS/proxy/
readiness públicos autorizados, red lenta real e integración móvil coordinada.

## CI preparado, sin ejecución remota — 2026-10-09

Añadido .github/workflows/verificar.yml para GitHub Actions: push/pull_request/
workflow_dispatch, matriz ubuntu-24.04/windows-2025, Node 24.21.0 desde .node-version
y pnpm desde packageManager (10.0.0). Ejecuta pnpm run verificar, git diff
--exit-code y carga corta; carga prolongada solo por opción manual y en Linux.
Timeout 20 min por job, fail-fast desactivado y cancelación por referencia.
Solo contents:read, checkout sin persistir credenciales, sin secretos, producción,
servicios, cron, artefactos ni caché. No se aprobaron scripts de dependencias.

Acciones fijadas a commits consultados vía API oficial GitHub: checkout v6
d23441a48e516b6c34aea4fa41551a30e30af803, setup-node v6
249970729cb0ef3589644e2896645e5dc5ba9c38 y pnpm/action-setup v4
b906affcce14559ad1aafd4ab0e942779e9f58b1. Para pnpm se resolvió el tag anotado
a commit. Se comprobaron los inputs usados en sus action.yml públicos.
README actualizado y documentacion/CI.md explica activación, permisos y límites.

Ejecutado actionlint v1.7.12 sobre el workflow: salida vacía, código 0. Binario
Windows descargado del release oficial en temporal OpenCode; SHA256 contrastado
con checksums del mismo release: 6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9.
Shellcheck/pyflakes deshabilitados explícitamente; no se usa Python ni se afirma
validación con esas herramientas. No se añadió dependencia al paquete.

Ejecutado pnpm run verificar local en Windows/Node v24.21.0: instalación congelada,
check/build correctos, 101 tests aprobados, 0 fallos/omitidos; 28 ejemplos,
13 contraejemplos y 10 vectores/78 comprobaciones correctos. También ejecutado
pnpm run test:carga: 70 ciclos, seis lotes en 31.608 ms, cero conexiones entre
lotes, crecimiento heap +52.136 bytes, P95 PONG local 0,783 ms y P99 retraso
del bucle 33,341 ms. Carga parcialmente concurrente con la verificación; no es
benchmark aislado. No se repitió carga prolongada, audit ni wrapper PowerShell.
git diff --exit-code -- src test scripts compartido pruebas package.json
pnpm-lock.yaml confirmó que esos archivos versionados permanecen sin cambios.

No se ejecutó GitHub Actions, ni runner Linux, push, configuración remota o
protección de ramas. CI remoto queda preparado, no acreditado como operativo.
Tras publicación autorizada deben pasar ambos jobs antes de exigir sus checks.
Sin cambios a apps, código del relay, contrato, fixtures o dependencias;
sin dispositivos ni despliegue. Loopback, health 503 y producción bloqueada.

## Primera integración local con padre P07 — 2026-10-09

Autorizada lectura del proyecto parental_padre sin modificarlo ni usar ADB.
Leídos instrucciones/estado y red/core pertinentes; HEAD padre 9db290e, estado
P07_IMPLEMENTADO_LOCAL_PARCIAL. git status --porcelain del padre vacío antes y
después. No se ejecutó Gradle ni se alteraron fuentes/build/caché del padre.
Detectada incompatibilidad de transporte de la base local: padre exige WSS y
origen HTTPS, no acepta WS. No se relajó TLS ni se cambió CP/1 unilateralmente.

servidor.config.ts admite HTTPS/WSS local mediante key/cert inyectados en RAM,
TLS mínimo 1.2; mantiene router, límites y cierre. dependencias.ts requiere
configuración pública para TLS y limpia transporte si falla creación HTTPS.
main.ts intacto, sin env privadas ni puerto permanente nuevo. tls-local.test.ts
prueba rechazo sin configuración, producción bloqueada y TLS ausente/inválido.

Añadidos test/soporte/PruebaPadre.java, prueba-padre.mjs y script test:padre.
Driver Java compilado solo en temporal aprobado OpenCode, usando clases/JAR
ya existentes del padre y caché Gradle en lectura. Compara SHA-256 de contrato,
esquema y vectores de ambos repos; comprobación correcta. Usa TransporteOkHttp,
RelayConnection y core-protocol JVM reales ya compilados, firmante JCA efímero
y autoridad de prueba aislada, no Keystore. No se reconstruyó APK ni se acredita
procedencia binaria de esos artefactos solo por mtime. JDK 21 local.

Ejecutado pnpm run build y pnpm run test:padre --ruta-padre
"C:\Users\Usuario\Documents\parental_padre": correcto. Tras añadir limpieza ante
error TLS, ejecutado pnpm run verificar: instalación congelada/check/build correctos,
104 tests aprobados, 0 fallos/omitidos; 28 ejemplos/13 contraejemplos correctos y
10 vectores/78 comprobaciones correctos, Node v24.21.0. Repetido test:padre contra
build final: correcto. No se ejecutó CI remoto, carga o auditoría en este turno.

Cruce real WSS/loopback en puerto efímero: confianza TLS predeterminada del padre
rechaza certificado de test; cliente JVM aislado confía solo en ese certificado
manteniendo hostname, sin trustAll. Hijo Node autentica y padre JVM pasa AUTH y
PONG correlacionado. SYNC_REQUEST JVM → relay → Node; STATE firmado Node → relay
→ JVM; SET_POLICY firmado JVM → relay → Node; ACK firmado de vuelta, verificados
pareja, nonce, boot/sesión y correlación id/seq/hash. ACK simulado exclusivamente
ACCEPTED_PENDING_ENFORCEMENT, nunca evidencia de aplicación real. Segundo plano
invalida sesión del padre. Health HTTPS 503 comprobado; clientes/JVM/relay cerrados.
Privadas TLS/CP/1 y certificado efímeros solo RAM/pipes, sin archivos ni impresión.

README/ARQUITECTURA y documentacion/INTEGRACION_LOCAL_PADRE.md documentan comandos,
alcance y handoff. Pendiente ControlPoliticas/ParentStore reales contra relay,
APK/Keystore/red Android e hijo real. Driver solo prueba red/core: envía a nivel
transporte, no las guardias P05; STATE no afirma Device Owner/Lock Task. No se
promociona PREPARADO ni se habilitan controles de APK. Observación de lectura para
IA padre: programa PING 10 s tras PONG frente a 15 s de tabla CP/1; revisar allí,
sin cambios aquí ni prueba de cadencia larga. 127.0.0.1 del teléfono no apunta
al PC; una prueba APK posterior exige entorno/TLS local autorizado específico.

Sin cambios al padre/hijo, contrato, fixtures o dependencias; sin dispositivos,
ADB, despliegue ni push. Conservados loopback, health 503 y producción bloqueada.

## Coordinación central padre/hijo/relay preparada — 2026-10-09

Propietario designa esta sesión coordinadora. Leídos en sus rutas explícitas
parental_padre/COORDINACION_PROYECTOS.md y parental_hijo/
COORDINACION_PADRE_HIJO_RENDER.md, instrucciones/estados y fuentes pertinentes.
Padre HEAD 8f0aa33, implementación P08-B 77c2b10; hijo HEAD 3f160c4, base de relevo
524ad8b; relay ce59ef6 antes de este cierre documental. Estado de ambos repos
ajenos limpio en consultas git status --porcelain; sin escribir en ellos.

Padre reporta 146 pruebas independientes y una integración JVM opcional contra
relay real, ControlPoliticas/ParentStore, guardias, reintentos y reconciliación.
Cadencia observada anteriormente atendida en P08-A 48e681b: 15 s desde envío y
caducidad 45 s. No se reejecutaron esas pruebas en esta sesión. PREPARADO sigue
sin puerta productiva de acreditación y no habilita órdenes. Hijo reporta 329
resultados JVM y 23 Android anteriores: H05 abierta, sin oferta/aceptación inicial,
cliente WSS ni enforcement completos. No hay integración entre dos APK acreditada.

Ejecutada comparación directa Get-FileHash SHA-256 en los tres repositorios:
contrato deee863f7587736d3e209f5a11a6e972a93004d0700c47eb3a2d136ad8f16a3c;
schema eccf964fbb41869c47d86ddb0bfda6585136430bab297568d3c20b56607372bb;
vectores 626b935f272aa4f7028fcb00c7640dceff2828418966e950a72f5590effe45e3.
También inventario y hashes de los 29 archivos de compartido/ejemplos iguales.
Solo evidencia de archivos congelados iguales, no nuevos tests o cruce móvil.

Añadido COORDINACION_PROYECTOS.md central: fuentes/estados, bloqueos, handoffs
preparados para cada IA, secuencia de puertas, propuesta TLS/red no aplicada,
alcance de permisos y formato de devoluciones. Próxima prioridad hijo HIJO-C01:
delimitar identidad/oferta y dependencia H05, sin saltar H08/H06/H10. Padre
PADRE-C01: diseñar acreditación PREPARADO→VINCULADO sin promoción automática ni
mensajes nuevos. Relay siguiente unidad propuesta: reinicio real y ACK totalmente
perdido en recorrido integrado. Ninguna iniciada, enviada o delegada en este turno.

Permisos físicos no se trasladan: hijo registra autorización histórica A13,
pero padre/Render lo excluyen; esta sesión no usa dispositivos. Cualquier prueba
futura requiere autorización específica y sesión del rol correspondiente; ante
conflicto, consultar al propietario. No se eligió hostname, certificado o puerto,
abrió LAN, instaló CA ni creó servicio/túnel. No trustAll ni credenciales nuevas.

AGENTS/README incorporan coordinación central, sin quitar límites. Actualizado
documentacion/INTEGRACION_LOCAL_PADRE.md con evidencia P08-A/B reportada para
no repetir pendientes ya atendidos; evidencia histórica de ESTADO intacta.
Tarea documental: no pnpm/Gradle/build/tests nuevos, ADB, subagentes, cambios a
apps/contrato/fixtures, push, CI remoto o despliegue. Conservadas barreras locales.

## Disponibilidad de laboratorio actualizada — 2026-10-09

Propietario retira temporalmente A56 por uso personal y permite avanzar con A13.
Registrado en COORDINACION_PROYECTOS.md: A56 fuera de operaciones hasta nueva
disponibilidad/autorización; trabajo JVM del padre independiente del teléfono.
A13 disponible para coordinar trabajo desde proyecto hijo, no para ADB desde
Render ni para inferir reset/aprovisionamiento/borrado/RETIRE/CA/quiosco nuevos.
Preparado handoff a IA hijo: continuar HIJO-C01 respetando H05 y proponer siguiente
prueba acotada de recuperación/emergencia con objetivo, precondiciones, operaciones
y aceptación. Avisar del alcance antes de instalación/cambio físico. No enviado
ni ejecutado: no existe canal automático entre sesiones.

Turno documental: ninguna consulta a teléfonos/ADB, prueba, build, cambio de app,
credencial, contrato, despliegue o push. Límites del relay conservados.

## Fallos de transporte con padre JVM — 2026-10-09

Propietario confirma regreso del A56 y solicita continuar. Actualizada su
disponibilidad en COORDINACION_PROYECTOS.md; no se inicia ADB ni instalación.
Releídos relevos padre/hijo: mantienen P08-B parcial y H05 abierta respectivamente.

Añadido test:padre:fallos con driver propio del relay: hijo Node omite ACK,
cierre WSS 1012 y recreación de instancia en el mismo puerto. RelayConnection
JVM reautentica, obtiene ticket nuevo y rechaza envío con el anterior. Hijo
reautentica con reto nuevo y recibe SYNC_REQUEST nuevo, sin reproducción de la
orden anterior; padre verifica STATE firmado con nonce y sesión nuevos.
No se cambia código productivo, CP/1 ni fixtures. TLS y claves efímeros en RAM.

Ejecutados pnpm run test:padre:fallos --ruta-padre con ruta explícita del padre
y pnpm run test:padre --ruta-padre con la misma ruta: ambos correctos.
pnpm run verificar terminado correctamente: 104 tests aprobados, 28 ejemplos
y 13 contraejemplos correctos; 10 vectores y 78 comprobaciones documentales.
Compilación del driver Java solo en temporal OpenCode, sin Gradle ni cambios
al proyecto padre. Documentados comando, alcance y límites en README y guía.

Recreación de instancia/listener en el mismo proceso Node, NO reinicio de proceso
independiente. ACK omitido por simulador, no pérdida de un ACK emitido. No ejecuta
ControlPoliticas/ParentStore ni agotamiento de sus dos reintentos o reconciliación
duradera. Es avance parcial: RELAY-C01 completo permanece pendiente. No acredita
APK, Keystore, vínculo operativo, Device Owner ni aplicación efectiva de orden.
Sin teléfonos/ADB, cambios a apps, push, despliegue o exposición LAN. Conservados
loopback, health 503 y producción bloqueada.
