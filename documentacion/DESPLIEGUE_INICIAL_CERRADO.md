# Primer despliegue Render: obtener URL sin habilitar el relay

Preparación autorizada por el propietario. El despliegue lo realiza el propietario;
no se ha ejecutado desde este proyecto. No requiere claves, pareja ni origen previo.

## Configuración en el servicio Web de Render

- Repositorio: servidor `parental`, rama `main`, directorio raíz vacío.
- Runtime: Node24, fijado también en `.node-version` y `package.json`.
- Build: `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm run build`.
- Start: `corepack pnpm start`.
- Health Check Path: `/keepalive`, sólo para este arranque cerrado.
- Variables: `NODE_ENV=production`, `LOG_LEVEL=error`, `RELAY_MODE=bootstrap`.
- `PORT` lo asigna Render; no fijarlo manualmente.
- No configurar aún `PUBLIC_ORIGIN`, `ACTIVE_PAIR_ID`, `PARENT_PUBLIC_KEY_B64`
  ni `CHILD_PUBLIC_KEY_B64`: incluso presentes vacías impiden este arranque.
- Desactivar despliegues automáticos para no publicar cambios posteriores sin revisión.

`plantillas/render-inicial.yaml.example` expresa este perfil por separado. No
usar la plantilla antigua con health `/healthz`: devuelve503 intencionalmente.
El código debe estar subido antes de desplegar: un commit local no llega a Render.

Corrección del primer fallo observado: no ejecutar `corepack enable` en Render.
Intentó reemplazar `/usr/bin/pnpm` y falló con EROFS (sistema de archivos de sólo
lectura), antes de instalar o compilar. Invocar `corepack pnpm` directamente usa
el pnpm10.0.0 fijado en packageManager sin crear enlaces en `/usr/bin`.
El MCP observó despliegue automático por commit activado en el servicio real:
desactivarlo en el Dashboard antes de subir cambios si se quiere mantener revisión
manual. No confundir la plantilla con ajustes ya aplicados en Render.

## Qué debe observarse después del despliegue

El propietario comunica la URL HTTPS real asignada, sin códigos ni datos privados.
En esa URL:

- `GET /keepalive`:200 `{"alive":true}`.
- `GET /healthz`:503 `{"ok":false,"protocol":1}`. No se anuncia CP2 disponible.
- `/ws`: no acepta ningún upgrade, sea CP1, CP2 o sin subprotocolo.
- Resto de rutas/métodos/query strings:404.

Render puede marcar este despliegue como saludable porque `/keepalive` responde:
eso sólo acredita proceso HTTP, NO disponibilidad de relay, orden aplicada ni
garantía contra suspensión. No hay cron ni servicios externos nuevos.

## Autollamada opcional solicitada por el propietario

Basada en el mecanismo inspeccionado de `back-elevation`: una vez conocida la URL
real, configurar `SELF_URL=https://tu-servicio.onrender.com` (sin barra final) y,
opcionalmente, `KEEP_ALIVE_INTERVAL_MS=600000`. No hace falta PUBLIC_ORIGIN para
esto; bootstrap sigue rechazando las cuatro variables de pareja/origen del relay.
La autollamada apunta sólo a `/keepalive`, no a `/healthz` que sigue devolviendo503.
No añadir SELF_URL antes de conocer el origen real ni usar un origen ficticio.

Sin SELF_URL está desactivada. Intervalo permitido:60000..3600000ms, por defecto
600000ms. Primer GET tras el intervalo; timeout10s, sin redirecciones/cuerpo/
credenciales, una petición como máximo en vuelo y cancelación al apagar el proceso.
Fallos sólo emiten un aviso genérico, sin URL/respuesta ni cambio de estado del relay.

Es una medida de mejor esfuerzo mientras el proceso está activo. Una instancia
suspendida no ejecuta timers: no garantiza impedir suspensión ni sustituye un
plan sin suspensión o disponibilidad validada. No se han configurado llamadas
externas, cron ni servicios de monitorización y no se probó contra Render real.

## Barreras conservadas

El modo explícito `bootstrap` escucha HTTP en `0.0.0.0`. No construye servidor
WebSocket, autenticador ni enrutador de órdenes y rechaza toda configuración de
pareja. Un valor desconocido de RELAY_MODE falla; quitarlo en producción vuelve a
la barrera anterior que aborta el proceso. Los creadores locales CP1/CP2 siguen
rechazando producción. No existe paso automático de bootstrap a relay. El perfil
público CP2 posterior es explícito y exige configuración real completa; ver
[habilitación autenticada](DESPLIEGUE_CP2_AUTENTICADO.md).

Con la URL real se coordina la ceremonia móvil y se obtiene la exportación pública.
La habilitación posterior del relay CP2 autenticado requiere otro bloque verificado
y autorización; añadir claves a este modo no lo activa. Este despliegue inicial no
autoriza teléfonos, instalación ni pruebas de bloqueo.
