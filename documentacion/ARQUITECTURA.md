# Arquitectura del servidor

## Estructura y dependencias

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
