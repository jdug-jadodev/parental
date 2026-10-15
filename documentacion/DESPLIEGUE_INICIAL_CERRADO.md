# Primer despliegue Render: obtener URL sin habilitar el relay

Preparación autorizada por el propietario. El despliegue lo realiza el propietario;
no se ha ejecutado desde este proyecto. No requiere claves, pareja ni origen previo.

## Configuración en el servicio Web de Render

- Repositorio: servidor `parental`, rama `main`, directorio raíz vacío.
- Runtime: Node24, fijado también en `.node-version` y `package.json`.
- Build: `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm run build`.
- Start: `pnpm start`.
- Health Check Path: `/keepalive`, sólo para este arranque cerrado.
- Variables: `NODE_ENV=production`, `LOG_LEVEL=error`, `RELAY_MODE=bootstrap`.
- `PORT` lo asigna Render; no fijarlo manualmente.
- No configurar aún `PUBLIC_ORIGIN`, `ACTIVE_PAIR_ID`, `PARENT_PUBLIC_KEY_B64`
  ni `CHILD_PUBLIC_KEY_B64`: incluso presentes vacías impiden este arranque.
- Desactivar despliegues automáticos para no publicar cambios posteriores sin revisión.

`plantillas/render-inicial.yaml.example` expresa este perfil por separado. No
usar la plantilla antigua con health `/healthz`: devuelve503 intencionalmente.
El código debe estar subido antes de desplegar: un commit local no llega a Render.

## Qué debe observarse después del despliegue

El propietario comunica la URL HTTPS real asignada, sin códigos ni datos privados.
En esa URL:

- `GET /keepalive`:200 `{"alive":true}`.
- `GET /healthz`:503 `{"ok":false,"protocol":1}`. No se anuncia CP2 disponible.
- `/ws`: no acepta ningún upgrade, sea CP1, CP2 o sin subprotocolo.
- Resto de rutas/métodos/query strings:404.

Render puede marcar este despliegue como saludable porque `/keepalive` responde:
eso sólo acredita proceso HTTP, NO disponibilidad de relay, orden aplicada ni
garantía contra suspensión. No hay cron, autopings ni servicios externos nuevos.

## Barreras conservadas

Sólo el modo explícito `bootstrap` escucha HTTP en `0.0.0.0`. No construye servidor
WebSocket, autenticador ni enrutador de órdenes y rechaza toda configuración de
pareja. Un valor desconocido de RELAY_MODE falla; quitarlo en producción vuelve a
la barrera anterior que aborta el proceso. Los creadores CP1/CP2 operativos siguen
siendo locales y rechazan producción. No existe paso automático de bootstrap a relay.

Con la URL real se coordina la ceremonia móvil y se obtiene la exportación pública.
La habilitación posterior del relay CP2 autenticado requiere otro bloque verificado
y autorización; añadir claves a este modo no lo activa. Este despliegue inicial no
autoriza teléfonos, instalación ni pruebas de bloqueo.
