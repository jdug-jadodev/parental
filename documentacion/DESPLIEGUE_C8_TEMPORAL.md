# Preparación del enrolamiento C8 temporal en Render

Estado: código preparado para revisión y pruebas locales. **No publicado ni
habilitado**. Propietario autorizó preparación/prueba cruzada, NO push, despliegue,
instalación o ceremonia. No aplicar esta guía automáticamente.

## Qué permite y qué no

Perfil independiente `RELAY_MODE=c8`: sólo encuentro temporal por `/pair`, WSS
`c8.v1`. Prueba de posesión P256 de identidad provisional antes de publicar o
reclamar; NO autentica familia/adulto ni da acceso a órdenes. Confirmación humana
de huellas LOCALES/origen en ambos teléfonos y autoridad adulta siguen obligatorias.
No cambia claves/PAIR CP2, CP1, permisos locales o emergencia.

`/ws`/`cp.v2` rechazados; no hay relay de control en este perfil. No configurar
claves familiares falsas para arrancar. Tras guardar pareja real, se requiere
exportación pública CP2 y cambio posterior al perfil CP2 autenticado existente.
C8/READY/SENT nunca significan pareja guardada, recuperación o bloqueo aplicado.

## Configuración futura, sólo tras autorización específica

| Variable | Valor/regla |
|---|---|
| NODE_ENV | production |
| LOG_LEVEL | error |
| RELAY_MODE | c8 |
| C8_ENROLLMENT_ENABLED | true sólo al habilitar explícitamente el ensayo |
| C8_ENROLLMENT_WINDOW_MS | entero60000..600000; propuesto600000 (10min) |
| PUBLIC_ORIGIN | https://parental-0j3o.onrender.com |
| RENDER, RENDER_EXTERNAL_URL, PORT | proporcionadas por Render; no simular allí |

Origen exacto igual a URL externa automática de Render, sin credenciales/path/query
ni dominio personalizado distinto en este piloto. Si hay SELF_URL ya configurada,
debe coincidir con PUBLIC_ORIGIN; no activar nuevas autollamadas por esta tarea.
Eliminar ACTIVE_PAIR_ID/PARENT_PUBLIC_KEY_B64/CHILD_PUBLIC_KEY_B64 en este perfil:
la configuración de familia pertenece a CP2 posterior, no al enrolamiento.

Ausencia de modo/flag/ventana válida aborta, sin fallback a endpoint anónimo.
La plantilla `plantillas/render-c8.yaml.example` lleva flagfalse intencionadamente:
copiarla NO produce un servidor de enrolamiento activo y fallará cerrado hasta
habilitación deliberada. No aplicar plantillas como si fueran cambios remotos.

Build: `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm run build`.
Una sola instancia: encuentros y tombstones viven sólo en RAM, sin registro común
entre réplicas. No escalar horizontalmente este piloto.
Start: `corepack pnpm start`. Nunca `corepack enable` en Render.
Health check de plataforma: **`/keepalive`**, respuesta200alive sólo proceso.
**`/healthz` permanece503** porque el relay familiar no está operativo. No ocultar
ese503 o atribuirle disponibilidad de CP2. No se añaden rutas HTTP de negocio.

## Ventana cerrada por defecto y límites

La ventana empieza al componer el proceso y no se renueva por códigos, pings,
reclamos o autollamadas. Al agotarse cierra sockets1012 y rechaza upgrades503;
HTTPkeepalive sigue200, sin ofrecer pareja/control. Cada encuentro se acorta a
esa ventana y al presupuesto original120s del hijo. No ampliarlo para acabar.
Render terminaTLS; Node escucha HTTPinterno0.0.0.0 sólo en este perfil validado.
Guardas de entorno/origen no son una prueba criptográfica del proxy TLS.

**Cada reinicio/despliegue reabre una ventana si flagtrue permanece configurado.**
No hay persistencia que recuerde caducidad a través de restart. Al terminar ensayo,
el propietario debe desarmar explícitamente, no confiar en la ventana como cierre
permanente. No cambiar configuración remota desde esta preparación.

Conserva máximos18sockets/16encuentrosRAM,40CLAIM/min global, cinco fallidos/socket,
cuposframes/upgrades,65536salida y16384frame. No confiar en X-Forwarded-For detrás
de Render. No resuelve DoS de plataforma ni demuestra identidad humana mediante
autenticación provisional. Planfree puede suspender; keepalive no lo garantiza.

## Publicación y vuelta atrás por el propietario

1. Obtener entregas/prueba cruzada locales de tres roles; revisar commits sin datos
   privados. Auto-Deploy estaba activo en la última lectura: revisar/desactivarlo
   ANTES de autorizar push si se desea despliegue manual. No se volvió a consultar
   ni cambiar su estado remoto en esta tarea.
2. Con permiso nuevo, publicar código elegido y configurar perfil C8/ventana/health
   cerrado por defecto; habilitar sólo al estar listos ambos teléfonos actualizados
   con permisos físicos específicos en sus sesiones. No código adulto por chat.
3. Comprobar TLS/origen/subprotocolo y ausencia de acceso previo a prueba/órdenes.
   Semántica real de huellas, UI, Keystore y commitAndroid requiere observación
   presencial; pruebasJVM/Node no la sustituyen.
4. Tras pareja guardada, recoger sólo PAIR_ID/ambas públicas/PUBLIC_ORIGIN del
   exportadorCP2padre. No tomar códigos/QR/recuperación/privadas para configurar relay.
5. Cambiar al perfil CP2 autenticado: quitar C8_ENROLLMENT_ENABLED y
   C8_ENROLLMENT_WINDOW_MS, configurar pareja real y health `/healthz`, desplegar
   manualmente según DESPLIEGUE_CP2_AUTENTICADO.md. No convivencia de perfiles R1.
6. Rollback cerrado: RELAY_MODEbootstrap, quitar variablesC8 y TODAS las variables
   de pareja/PUBLIC_ORIGIN; healthplataforma `/keepalive`. Conservar SELF_URL sólo
   si ya estaba autorizada. BootstraprechazaWebSockets/health503; no borra móviles.

Fallo tras commit padre conservaPENDING; no reentrega/reconexión automática R1 ni
borrados para reintentar. Reconciliación de pendientes fuera de este despliegue.
