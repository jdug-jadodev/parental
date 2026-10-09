# Control parental — servidor Render independiente

Servidor Node.js 24 / TypeScript con `src/` y paquete pnpm en la raíz. Las apps padre e hijo no forman
parte de este proyecto y no se modifican desde aquí. CP/1 en `compartido/`
y los fixtures permanecen congelados.

## Estado: R01 y R02, autenticación local

Validación de configuración pública, claves SPKI P-256 distintas, HTTP y
límites iniciales. Transporte WebSocket conectado sin compresión y con máximo
de 16 KiB únicamente con configuración pública válida y clientes loopback.
R02 implementa CHALLENGE → firma AUTH → AUTH_OK: reto de un solo uso ligado
al socket, nonce de 32 bytes y expiración monotónica de 10 segundos.

**No operativo públicamente:** escucha solo en `127.0.0.1`, `/healthz` devuelve
503 y arranque en producción bloqueado. Sin configuración se rechazan upgrades;
con configuración válida solo se permite autenticación local, no reenvío de
mensajes. No se anuncia CP/1 listo hasta completar R03.

HTTP expone únicamente `GET /healthz` (disponibilidad del relay) y
`GET /keepalive` (200 `{"alive":true}`: el proceso responde). Keepalive no
acredita autenticación, entrega de órdenes ni evita por sí solo la suspensión
de Render. No se configuraron pings periódicos, cron ni servicios externos.

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
Los mensajes posteriores a AUTH_OK se rechazan mientras R03 esté pendiente.

## Próximas etapas, una por turno

- R02 completado localmente con fixtures y clientes Node simulados.
- R03: retransmisión autenticada, latidos, límites operativos y preparación
  de Render. Probar primero con dos clientes Node locales, sin tocar las apps.
- Integración posterior con las apps y despliegue: requieren coordinación y
  autorización; no se han realizado aquí. ACK de relay no significa orden aplicada.

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
Autenticación implementada en R02; mensajes operativos pendientes de R03.
Ver detalles en `documentacion/ARQUITECTURA.md`. El código de `src/` no contiene
comentarios; la explicación vive en documentación.
