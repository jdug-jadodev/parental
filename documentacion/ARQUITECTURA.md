# Arquitectura del servidor

## C8-P01/X01 — perfil público preparado y arnés de cruce

PerfilC8Render separado del local, compuesto en config/dependencias.ts tras validar
modoC8/opt-in/ventana/producción/Render/origen automático y ausencia de pareja.
Sin convivencia con cp.v2. CLI sólo lo selecciona explícitamente, no por defecto;
variables de habilitación fuera de ese perfil abortan. Adaptador recibe alcance
RENDER y deadline monotónico finito, no confianza en cabeceras de proxy. Deadline
global acorta códigos/socket y cierra1012; keepalive200/health503 permanecen, no
se usa EstadoRelayCp2Adapter para aparentar relay familiar disponible.

Prueba de posesión provisional acredita clave declarada, no familia/adulto. La
ventana es por proceso; restart con flagtrue la rearma, no hay cierre durable.
Guía documentacion/DESPLIEGUE_C8_TEMPORAL.md y plantilla desactivada por defecto.
Ningún perfil nuevo desplegado o configurado remotamente por esta preparación.

Arnés test/soporte/interop-c8.mjs usa dist real y contraparteNode efímera con
WSS/TLS local estricto. Contrato de pipes en documentacion/ENSAYO_C8_NODE_JVM.md.
Certificado/privadaTLS sólo RAMviaPIPE de tests; no logs/archivos con privadas.
Cada JVM prueba contra Node, no se presenta como dos apps/dispositivos físicos.

## C8-I01 — transporte de encuentro local separado

Contrato C8/1 en contrato-c8/CONTRATO_C8_1.md conserva documentos/firma CP2 internos
y CP1 congelado. DTOs de transporte en application/dtos/encuentro-c8.dto.ts.
CoordinarEncuentroC8 es máquina RAM de encuentro, no política Android: constructor
inyecta reloj, entropía y verificación por puertos. Sin Node en aplicación/dominio.
Tombstones conservan sólo código/deadline/estado tras purgar oferta y participantes.

Codec/PoP y verificación de oferta/PAIR en adapters; prueba C8v1/PROOF separada de
AUTH familiar. La pública declarada sólo es identidad provisional; las apps deben
cotejar anclas humanas locales independientes. Ningún mensaje de control por C8.
El adaptador WebSocket acepta únicamente loopback127.0.0.1, ruta/prefijo separados,
limpia plazos cada100ms y limita entrada/salida/upgrades. Composición sólo en
config/dependencias.ts mediante crearServidorEncuentroC8Local, que exige modo
c8-local y rechaza producción. No CLI/público ni modificación de bootstrap/cp.v2.

Node ancla deadline a emisión de CHALLENGE más presupuesto que hijo mide DESPUÉS
de recibirlo. Así descuenta demora sin comparar relojes; las apps siguen obligadas
a invalidar por marco original/fondo/contexto. READY/SENT no prueban aprobación
adulta, identidad humana, commit, recuperación o efecto Android.

## Unidad CP/2 separada, sin composición productiva

CP2-V01: DTOs QR en `application/dtos/vinculacion-cp2.dto.ts`, codec y verificación
criptográfica en `infrastructure/adapter/protocol/cp2/`, schema parcial en
`contrato-cp2/`. Constructor recibe schema, sin lectura de archivos desde dominio/
aplicación. Reutiliza primitivas técnicas JSON/base64/SPKI/DER/origen sin cambiar
CP/1. Dominio de firma CPv2/PAIR separado; sólo bytes originales, clave esperada
desde llamador. Sin wiring en config/dependencias.ts, WSS, casos de uso móviles,
estado de ceremonia/consumos o rutas públicas. Ver alcance/límites en README CP2.

CP2-A01 añade DTOs AUTH, schema parcial separado, codec y verificación AUTH en
los mismos bordes. Parser canónico CP/2 compartido en documento-cp2.ts y DER
genérico firmaDerCp2; sin cambiar formatos de vinculación o CP/1. No composición
de autenticación CP/2 ni estado de retos/conexiones añadido por esta unidad.

CP2-A02: VerificacionAutenticacionCp2Adapter implementa el puerto existente y
reutiliza AutenticarConexion/RetosAutenticacionAdapter en pruebas de contexto CP2
aislado. Mapper específico usa FrameAutenticacionEntity existente sin dependencia
de aplicación ni DTO de conexión nuevo. No cambia dominio/aplicación CP1 ni
dependencias.ts; futura composición debe separar almacenes de retos por perfil y
entregar connectionId desde el socket, no desde el frame firmado.

CP2-T01 compone ese contexto en crearServidorAutenticacionCp2Local de dependencias.ts.
EvaluarConexionCp2 es caso de uso del puerto existente; WebSocketAuthCp2Adapter es
entrada separada AUTH-only con mapper/codec/puerto de autenticación inyectados.
Sin casos de uso construidos en adaptadores ni cambios de flujo CP1. El creador HTTP
comparte únicamente la superficie upgrade/detener/maximoConexiones y conserva
controladores health/keepalive. Tests de arquitectura incluyen la nueva entrada.

CP2-O01 mantiene DTOs de órdenes en aplicación y codec/criptografía MESSAGE en
el borde protocol/cp2, schema parcial aparte. Sólo valida representaciones/firmas,
no decide permisos ni llama al enforcer, writer o almacenamiento del hijo. Sin
composición nueva o cambios al transporte AUTH-only por esta unidad.

CP2-K01 mantiene ACK en DTO propio y borde protocol/cp2 de codec/firma CHILD.
Reutiliza dominioMESSAGE y DTO de sobre existente, sin duplicar conexión o estado
actual. No correlación de intenciones/autoridad de aplicación en infraestructura
relay ni composición adicional; ACK no se genera por recepción/transporte.

## Estructura y dependencias

E2E01 añade CodecStateCp2/CriptografiaStateCp2 y coherencia semántica en el borde;
DTO propio sin Node en aplicación. VerificacionMensajeCp2Adapter implementa el
puerto existente y mapea DTO verificado a MensajeVerificadoEntity/RelayMapper.
ProcesarMensaje sigue comprobando pareja/rol sin conocer CP1/CP2 o sockets.
Composición explícita crearServidorRelayCp2Local inyecta ese caso de uso al mismo
adaptador CP2; creador AUTH-only no recibe procesador y conserva su rechazo.
El transporte sólo retransmite bytes inmutables a socket vigente y acota salida;
no persiste políticas ni decide aplicación, no crea ACKCHILD. Peer ausente usa
mapperCP2 separado; HTTP no incorpora rutas operativas. Sin cambio CLI pública.

- `application/mapper`: DTO request → entidad de dominio; resultado → DTO response.
- `application/dtos`: configuración, respuestas de servicio y contrato CP/1.
- `application/usecase`: implementaciones de puertos de entrada.
- `application/validations`: reglas de entrada/configuración y admisión del handshake.
- `domain/entities`: una clase de entidad por archivo, inmutable y sin Node.js.
- `domain/ports/portin` y `portout`: contratos que usan entidades de dominio,
  no DTOs, sockets ni objetos criptográficos de infraestructura.
- `infrastructure/controller`: únicamente health y keepalive.
- `infrastructure/routers`: selección de rutas HTTP exactas y respuestas de error.
- `infrastructure/adapter`: WebSocket de entrada y adaptadores de salida;
  entidades, mapper específico y componentes técnicos del protocolo dentro.
- `infrastructure/config`: configuración de HTTP/WebSocket, lectura del entorno
  y raíz de composición en `dependencias.ts`.

Dominio solo importa dominio. Aplicación importa dominio y aplicación, nunca
infraestructura ni librerías Node. Infraestructura depende hacia dentro.
La inyección pertenece al arranque: `config/dependencias.ts` puede construir
adaptadores y casos de uso sin introducir esa responsabilidad en el dominio.
No hay contenedor DI, decoradores, service locator ni carpeta bootstrap paralela.

## Flujos, sin conversiones duplicadas

HTTP:

```text
Node → ServicioRouter → ServicioController (health/keepalive)
     → ServicioMapper → ConsultarServicioEntrada → ConsultarServicio
     → EstadoServicioSalida → EstadoLocalAdapter
     ← ResultadoConsulta ← response DTO ← JSON HTTP
```

El dominio conoce el tipo de consulta, no rutas HTTP ni códigos de estado.
El router rechaza rutas y métodos no admitidos antes de invocar el controlador.

WebSocket:

```text
upgrade Node → WebSocketAdapter → UpgradeEntity → UpgradeMapper.aDominio
             → EvaluarConexionEntrada → EvaluarConexion
              ← DecisionConexion → UpgradeMapper.aRechazo → HTTP de rechazo
              o admisión local → AutenticarConexionEntrada → AutenticarConexion
              → retos/reloj/entropía/verificación (puertos de salida)
              ← RetoAutenticacion/ConexionAutenticada → AutenticacionMapper → frame
mensaje autenticado → ProcesarMensajeEntrada → ProcesarMensaje
                    → VerificacionMensajeSalida → VerificacionMensajeAdapter
                    ← MensajeRelay → destinatario o PEER_UNAVAILABLE/PONG
```

No existe ConexionController ni DTO de conexión intermedio. El mapper específico
convierte dominio ↔ UpgradeEntity y DecisionConexion ↔ RechazoUpgradeEntity.
Un rechazo 500 de transporte no se interpreta como una decisión de dominio.
WebSocketAdapter es un adaptador de entrada: inyecta un puerto de entrada,
no necesita fingir que implementa un puerto de salida. EstadoLocalAdapter y
ValidacionPublicaAdapter sí implementan los puertos de salida correspondientes.

Configuración:

```text
entorno → ConfiguracionServidor → ConfiguracionMapper → ConfigurarServidorEntrada
        → ConfigurarServidor → ValidacionPublicaSalida → ValidacionPublicaAdapter
        ← Configuracion ← response DTO interno
```

La lectura del entorno no es un controller ni una ruta pública. El mapper filtra
las variables admitidas antes de entrar al dominio. Validaciones de aplicación
comprueban campos requeridos, puerto, entorno y nivel de log; la entidad mantiene
invariantes de pareja y claves distintas. El adaptador encapsula validación HTTPS
e importación criptográfica SPKI P-256.

## HTTP, liveness y seguridad

CP2-P01 compone crearServidorRelayCp2Render sólo desde modo cp2 explícito con
entorno/origenRender validados y ConfigurarServidor con pareja/públicas completas.
El alcance RENDER es inyectado al adaptador; LOCAL permanece por defecto y conserva
guardia127.0.0.1. No se usan headers de proxy como autoridad o selector de perfil.
EstadoRelayCp2Adapter recibe disponibilidad del transporte por constructor;
EstadoServicio permite protocolo2 sin cambiar default1, health local/bootstrap o
CP1. Health refleja disponibilidad del adaptador, no autorización/aplicación móvil.
LatidosTransporte se reutiliza en CP2 para ping30s/pong correlacionado/limpieza,
con timer cancelado en detener. Root config es el único punto de composición.

Arranque inicial cerrado autorizado: `crearServidorInicialCerrado` compone los
mismos controller/router/EstadoLocalAdapter y WebSocketAdapter sin autenticador,
transporte WebSocket ni procesador. Exige RELAY_MODE=bootstrap y ausencia de las
cuatro variables de pareja/origen; nunca cambia a operativo por añadir claves.
Sólo esa rama explícita en main escucha HTTP en0.0.0.0 incluso en producción;
perfiles de relay y modo por defecto conservan las barreras anteriores. Render
usa keepalive como health de proceso durante bootstrap, no disponibilidad CP.

Autollamada opcional: config/keepalive.config.ts valida SELF_URL/intervalo y la
raíz dependencias.ts inyecta fetch y aviso genérico a KeepaliveProceso, componente
técnico de infraestructura sin acceso a permisos/pareja/mensajes. main inicia
el timer sólo después de escuchar y lo cancela en señal/error. No afecta controller,
EstadoServicio o respuesta health; un GET propio exitoso no acredita relay listo.

- `GET /healthz`: 503 con `{ok:false,protocol:1}`; fase pública no autorizada/validada.
- `GET /keepalive`: 200 con `{alive:true}`, sin claves, pareja ni presencia.
- Otras rutas/métodos y query strings: 404. No hay endpoints HTTP de negocio.
- Upgrade inválido: 400; CP/1 sin configuración o durante cierre: 503.
- Con configuración válida solo se autentican sockets de 127.0.0.1; otros: 403.
- Máximo 16 retos pendientes y 18 sockets de transporte; saturación: 429.
- Fallos inesperados HTTP/upgrade: 500 genérico, sin detalles internos.
- Respuestas JSON con no-store; `main.ts` conserva loopback y bloqueo de producción.

Keepalive es una respuesta de actividad del proceso, no disponibilidad funcional,
autenticación ni prueba de entrega. No instala cron, autopings ni servicios externos,
y no garantiza que Render no suspenda una instancia. Para uso habitual permanece
la recomendación de la SPEC de una instancia que no se suspenda por inactividad.
Se añade esta ruta por solicitud del propietario; la SPEC copiada conserva su
tabla HTTP anterior como referencia histórica, sin cambiar CP/1.

El transporte ws se enlaza a HTTP solo con configuración pública válida, con
noServer, maxPayload 16384 y compresión deshabilitada. Codec y criptografía
permanecen en adapter/protocol.
Los tipos CP/1 son DTOs, no entidades de dominio. Nunca se reserializan payloads
firmados para verificar o reenviar. R02 verifica los bytes originales antes de
interpretar AUTH_PROOF. R03 verifica MESSAGE con la clave del socket autenticado
antes de interpretar payload, y el caso de uso exige pareja, emisor y tipo autorizado.

El caso de uso consume el reto antes de verificar la firma, comprueba socket,
nonce y pareja, y revisa expiración antes y después de verificar. RelojAdapter
usa performance.now; EntropiaAdapter usa UUID v4 y 32 bytes aleatorios. Los retos
permanecen en RAM acotada y se eliminan por uso, expiración o desconexión.
VerificacionAutenticacionAdapter solo utiliza las claves P-256 configuradas:
el rol declarado debe corresponder a la clave firmante. No acepta claves propuestas.

WebSocketAdapter mantiene una conexión autenticada por rol y sustituye la antigua
solo después de autenticar. El cierre antiguo no borra la nueva del mapa.
Después de AUTH_OK solo PING y los cuatro tipos MESSAGE autorizados se admiten.
No hay eco, persistencia ni cola de órdenes. cerrarServidorHttp detiene upgrades y cierra pendientes/autenticados
con 1012, con terminación forzada del socket tras un segundo si no coopera.

## Routing, límites y latidos locales

WebSocketAdapter conserva el mapa de sockets, envía PEER_STATUS y selecciona
destinatario según el rol autenticado, no según una dirección recibida en JSON.
MensajeRelay conserva una copia de los bytes del frame y devuelve copias; el
mapper solo extrae metadatos verificados, nunca reconstruye el contenedor firmado.
El receptor sigue siendo responsable de secuencias, hash de ACK, desafíos y
decisión de aplicar. El relay no conserva la orden para verificar su resultado.

Si el receptor está ausente/cerrando, se informa PEER_UNAVAILABLE; si su salida
superaría 64 KiB, se cierra y también se informa indisponibilidad. enviarAcotado
comprueba tamaño UTF-8 y bufferedAmount; falla cerrado ante error de envío.
No se reintenta ni almacena el mensaje. El límite incluye el próximo frame para
no sobrepasar el margen por una última escritura.
Se incluye la cabecera del frame sin máscara (2/4/10 bytes), además del payload.

Cupo usa tiempo monotónico: 10 frames/s, ráfaga 20 por socket, incluyendo PING
y entradas inválidas antes de verificar firmas. Un PONG de aplicación pendiente
por socket; un duplicado inmediato de nonce se ignora. LimiteUpgradesAdapter
es un helper de transporte, no un puerto de salida de negocio: tabla acotada,
TTL y límites por IP/global, inyectado desde dependencias.ts. En local la IP
es remoteAddress. Un proxy público requiere revisión específica antes de abrir.

LatidosTransporte envía nonce aleatorio en ping de control cada 30 s y solo un
pong idéntico despeja el pendiente. En la siguiente revisión termina los sockets
que no respondieron; borra sus entradas al cerrar. No certifica canal saludable
de aplicación ni aplicación de órdenes, y no llama a /keepalive.

El transporte no responde automáticamente a ping de control. WebSocketAdapter
aplica a ping y pong entrantes un cupo conjunto separado (10/s, ráfaga 20), aun
sin autenticar; solo responde si la salida sigue acotada. Así los controles no
pueden generar salida ilimitada esquivando el cupo de mensajes de aplicación.
El receptor ws permite hasta 64 fragmentos/mensaje y 128 chunks pendientes, además
del límite de 16 KiB. Exceder partes vacías también cierra: maxPayload por sí solo
no limita el número de fragmentos. La configuración HTTP limita a 32 cabeceras;
el adaptador además rechaza rawHeaders con más de 32 pares antes de admisión,
sin confiar únicamente en un objeto de cabeceras que pudiera estar truncado.

## Herramientas y compatibilidad

pnpm fijado en packageManager, pnpm-lock.yaml y Node 24 en la raíz.
Verificar con `pnpm run verificar`; instalación `pnpm install --frozen-lockfile`.
Sin autorización de scripts de dependencias. dist/node_modules ignorados.
compartido/ y fixtures conservan bytes congelados; las evidencias anteriores
mantienen rutas y comandos históricos. Las apps no se modifican desde aquí.

Render dispone de una plantilla inactiva en plantillas/render.yaml.example y
un checklist en documentacion/DESPLIEGUE_RENDER.md. Comandos previstos desde la
raíz: pnpm install --frozen-lockfile --prod=false, pnpm run build y pnpm start.
No se aplicó configuración de despliegue; producción permanece bloqueada.
La herramienta local de interoperabilidad sigue en test/soporte/interoperabilidad.mjs;
los consumidores Android deben ajustarse coordinadamente en otra tarea.

Para integración JVM, la composición admite TLS local inyectado con key/cert solo
en RAM. servidor.config.ts conserva el mismo router, límites HTTP y adaptador
WebSocket sobre HTTPS; minVersion TLSv1.2. No hay nuevos endpoints/env privadas.
Sin configuración pública no se permite TLS local y producción sigue bloqueada.
Si crear HTTPS falla, dependencias.ts detiene el transporte para liberar timers.
main.ts no cambia: sigue WS loopback por defecto. El harness opcional test:padre
crea y cierra su WSS efímero; no es un modo de despliegue ni un servidor permanente.
