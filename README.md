# Control parental — servidor Render independiente

Servidor Node.js 24 / TypeScript con `src/` y paquete pnpm en la raíz. Las apps padre e hijo no forman
parte de este proyecto y no se modifican desde aquí. CP/1 en `compartido/`
y los fixtures permanecen congelados.

## Estado: R01–R03 locales, sin despliegue

Validación de configuración pública, claves SPKI P-256 distintas, HTTP y
límites iniciales. Transporte WebSocket conectado sin compresión y con máximo
de 16 KiB únicamente con configuración pública válida y clientes loopback.
R02 implementa CHALLENGE → firma AUTH → AUTH_OK: reto de un solo uso ligado
al socket, nonce de 32 bytes y expiración monotónica de 10 segundos.
R03 reenvía SYNC_REQUEST/SET_POLICY del padre y STATE/ACK del hijo tras validar
firma, pareja y rol. Mantiene intactos los bytes originales y no guarda órdenes.

**No operativo públicamente:** escucha solo en `127.0.0.1`, `/healthz` devuelve
503 y arranque en producción bloqueado. Sin configuración se rechazan upgrades;
con configuración válida se permite autenticación y reenvío exclusivamente local.
Health 503 se conserva como barrera hasta autorizar y validar la fase pública.

HTTP expone únicamente `GET /healthz` (disponibilidad del relay) y
`GET /keepalive` (200 `{"alive":true}`: el proceso responde). Keepalive no
acredita autenticación, entrega de órdenes ni evita por sí solo la suspensión
de Render. No se configuraron autopings HTTP, cron ni servicios externos.

## Verificación con Node.js, sin Python

Desde la raíz del proyecto:

```sh
pnpm run verificar
```

Requiere Node 24 y pnpm 10.0.0 (fijado en `packageManager`). Instala con
`pnpm install --frozen-lockfile`, chequea TypeScript, compila, ejecuta tests, valida ejemplos
contra el esquema y verifica vectores criptográficos. Como alternativa Windows
se conserva `powershell -File scripts/verificar.ps1` desde la raíz.
Para arrancar la base local: `pnpm run build` y `pnpm start`.

El único lockfile activo es `pnpm-lock.yaml`, importado del anterior lockfile npm
sin actualizar dependencias. `.npmrc` también configura pnpm. Los scripts de
instalación de dependencias no están autorizados (`onlyBuiltDependencies: []`);
no se aprobó el postinstall de esbuild. Sus binarios opcionales permiten las
pruebas locales verificadas; no se afirma compatibilidad con plataformas no probadas.

Sin variables públicas se permite la base local no operativa. Si se proporciona
alguna de `PUBLIC_ORIGIN`, `ACTIVE_PAIR_ID`, `PARENT_PUBLIC_KEY_B64` o
`CHILD_PUBLIC_KEY_B64`, se exige el conjunto completo y válido. Solo públicas;
nunca claves privadas, códigos de recuperación ni historial.
Una clave propuesta por el cliente no concede autoridad: solo las dos públicas
configuradas autorizan padre/hijo. Se admiten hasta 16 retos pendientes y una
conexión autenticada por rol; solo un cliente autenticado sustituye al anterior.
Desconectar o fallar elimina el reto. El cierre controlado usa código 1012.
Tras AUTH_OK, PING recibe PONG con su nonce; no se reenvía al otro cliente.
PEER_STATUS informa presencia y PEER_UNAVAILABLE descarta mensajes sin receptor.
Presencia, PONG y reenvío no significan orden aplicada. Los tipos o propósitos
no autorizados cierran la conexión; no se ofrece un eco abierto.

Límites locales: 10 frames/s con ráfaga 20, salida máxima 64 KiB (incluido el
próximo frame), upgrades por IP 2/s con ráfaga 20 y global 10/s con ráfaga 40.
Tabla por IP limitada a 128 entradas/TTL 60 s; solo dirección del socket, no
X-Forwarded-For. Ping de transporte cada 30 s limpia sockets sin respuesta;
es distinto del heartbeat de aplicación y no es un servicio anti-suspensión.
Ping/pong de control entrantes tienen cupo separado de 10/s con ráfaga 20,
también antes de autenticar. Pong automático deshabilitado: el adaptador responde
solo dentro del cupo y del límite de salida. Máximo 64 fragmentos por mensaje y
128 chunks pendientes en el receptor ws; máximo 32 cabeceras HTTP de entrada.

Prueba de memoria local, después de compilar:

```sh
pnpm run build
pnpm run test:carga
pnpm run test:carga:prolongada
```

La carga corta ejecuta 70 ciclos y seis lotes; la prolongada, 610 ciclos y 60
lotes durante unos cinco minutos. Alterna roles, verifica PONG de aplicación y
descarte de SYNC_REQUEST sin receptor, y mide memoria con GC explícito, latencia
PONG local y retraso del bucle. Comprueba cero sockets entre lotes y márgenes de memoria;
es una prueba acotada, no una garantía de ausencia de fugas a largo plazo.
`pnpm run verificar` incluye una prueba real de limpieza por heartbeat de unos
60 segundos; no requiere servicios externos. Ver alcance y límites de la revisión
en `documentacion/REVISION_SEGURIDAD.md`.

## Próximas etapas, una por turno

CI preparado en `.github/workflows/verificar.yml`: Node 24 y pnpm fijado,
verificación y carga corta en Ubuntu/Windows. Carga prolongada opcional manual.
Sin push ni ejecución remota comprobada; ver `documentacion/CI.md`.

Primera integración JVM del padre con relay WSS local preparada en
`pnpm run test:padre --ruta-padre RUTA` después de compilar. Reutiliza sus clases
ya compiladas sin modificar el repo ni usar dispositivos; requiere JDK/caché
Gradle y no forma parte de CI. Ver `documentacion/INTEGRACION_LOCAL_PADRE.md`:
no equivale a probar la APK, Keystore o políticas reales.

- R02 completado localmente con fixtures y clientes Node simulados.
- R03 implementado y probado localmente con clientes Node; fase pública pendiente.
- Preparación de Render: `documentacion/DESPLIEGUE_RENDER.md` y plantilla inactiva
  `plantillas/render.yaml.example`. No aplicarla: producción todavía está bloqueada.
- Integración de APK/hijo real y despliegue: requieren coordinación y autorización;
  pendientes. El cruce local JVM no los sustituye. ACK de relay no significa orden aplicada.

Referencias: `documentacion/SPEC_RELAY_RENDER.md` y R01–R03 de
`documentacion/PLAN_ORIGEN_PADRE.md` (histórico, no ejecutar tareas Android).
La mención al antiguo verificador Python en documentación congelada/histórica
no es una dependencia: su reemplazo es `pnpm run test:esquema` desde la raíz.

La herramienta Node de interoperabilidad está en `test/soporte/interoperabilidad.mjs`.
Una integración Kotlin futura debe apuntar a la raíz de `parental_render` y
coordinarse desde el proyecto del padre; no se modificaron sus rutas ni código.
No hace falta Android para verificar este servidor.

## Arquitectura hexagonal

```text
src/
  application/
    mapper/                     request DTO → dominio → response DTO
    dtos/                       contratos de entrada/salida y DTOs CP/1
    usecase/                    implementaciones de puertos de entrada
    validations/                validaciones de aplicación
  domain/
    entities/                   una entidad por archivo, sin Node.js
    ports/portin/               contratos de entrada con entidades de dominio
    ports/portout/              contratos de salida con entidades de dominio
  infrastructure/
    controller/                 solo health y keepalive
    routers/                    rutas HTTP exactas y respuestas de error
    adapter/                    WebSocket y adaptadores de puertos de salida
      entities/                 entidades del transporte WebSocket
      mapper/                   dominio ↔ entidades de este adaptador
      protocol/                 codec y criptografía técnica CP/1
    config/                     servidor, WebSocket, entorno y dependencias
  main.ts                       arranque local y cierre
test/                           pruebas unitarias, arquitectura, HTTP y WS local
```

El router llama al controlador HTTP, que recibe un puerto de entrada.
El adaptador WebSocket recibe directamente su puerto de entrada: no pasa por
controladores HTTP ni DTOs intermedios de conexión. Los casos de uso reciben
puertos de salida; `infrastructure/config/dependencias.ts` hace la composición
por constructor. Los mappers de aplicación y del adaptador tienen responsabilidades
distintas, sin cadenas de conversiones de ida y vuelta. No hay ORM ni base de datos.

Los tipos del contrato CP/1 son DTOs de transporte, no entidades de dominio.
Los bytes firmados siguen intactos: no pasan por mappers que reserialicen JSON.
Autenticación y routing implementados en R02/R03; validación pública pendiente.
Ver detalles en `documentacion/ARQUITECTURA.md`. El código de `src/` no contiene
comentarios; la explicación vive en documentación.
