# Relay público CP/2: perfil autenticado autorizado

Preparado por autorización explícita del propietario. No desplegado por este
bloque: el servicio real sigue en bootstrap con el commit aa2bfbb. No hay alta de
claves por red, socket de pruebas abierto ni fallback CP1. Sin configuración válida,
el nuevo perfil aborta antes de escuchar. No genera una pareja ni claves familiares.

## Antes de habilitarlo

1. Mantener bootstrap mientras se actualizan/vinculan las APK por procedimiento
   autorizado aparte. La ceremonia QR local no requiere un relay operativo.
2. Usar el origen real `https://parental-0j3o.onrender.com`, sin barra final,
   exactamente igual en ambos teléfonos, aceptación firmada y servidor.
3. Del resumen/exportación pública del padre CP2 obtener pairId y ambas públicas
   SPKI DER/base64url. La exportación de VincularCp2 usa `PAIR_ID`: trasladar ese
   valor exacto a la variable de Render `ACTIVE_PAIR_ID`. No usar el exportador CP1
   ni códigos de recuperación, PIN, oferta efímera o datos de un vínculo anterior.
4. Confirmar que el hijo guardó esa misma aceptación antes de esperar AUTH. El padre
   seguirá pendiente hasta STATE CHILD firmado correlacionado; AUTH_OK no lo activa.
5. No borrar identidades ni saltar guardas de legado para hacer avanzar la prueba.

## Variables y comandos del servicio existente

Obligatorias, todas públicas salvo la configuración operativa habitual:

| Variable | Valor |
|---|---|
| NODE_ENV | production |
| LOG_LEVEL | error |
| RELAY_MODE | cp2 |
| PUBLIC_ORIGIN | https://parental-0j3o.onrender.com |
| ACTIVE_PAIR_ID | UUIDv4 minúsculo de ESA aceptación real |
| PARENT_PUBLIC_KEY_B64 | pública padre de ESA aceptación |
| CHILD_PUBLIC_KEY_B64 | pública hijo de ESA aceptación, distinta de la anterior |

`RENDER=true`, `RENDER_EXTERNAL_URL` y `PORT` los proporciona Render: no inventarlos
ni configurarlos manualmente. La URL externa y PUBLIC_ORIGIN deben coincidir (se
permite barra final sólo en el valor automático RENDER_EXTERNAL_URL). El perfil
no admite de momento un dominio personalizado distinto del origen automático.

- Build: `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm run build`.
- Start: `corepack pnpm start`.
- Health Check Path: `/healthz`, sólo cuando se pasa al perfil CP2 configurado.
- Desactivar Auto-Deploy en el Dashboard antes de publicar commits si se quiere
  despliegue exclusivamente manual: el último estado leído por MCP lo tenía activo.
- Subir código revisado y después desplegar manualmente con esas variables reales.
- Para volver cerrado: RELAY_MODE=bootstrap, retirar las cuatro variables de
  pareja/origen, health check /keepalive y volver a desplegar. No borrar los móviles.

Opcional tras publicar el código de keepalive: `SELF_URL` igual a PUBLIC_ORIGIN y
`KEEP_ALIVE_INTERVAL_MS=600000`. No es autenticación ni garantía antisuspensión.

## Seguridad y significado de las respuestas

Render termina HTTPS/WSS con certificado/hostname normal. El proceso Node escucha
HTTP interno en0.0.0.0; el perfil comprueba entorno Render y origen configurado,
pero las variables de entorno NO constituyen prueba criptográfica del proxy/TLS.
No exponer ese listener directamente sin TLS en otro alojamiento. No se instala
una CA ni se desactiva validación TLS de los clientes. No se confía en headers
X-Forwarded-For/Origin para autenticar ni seleccionar una pareja.

`GET /healthz`:200 `{"ok":true,"protocol":2}` significa proceso configurado y
adaptador disponible, incluso sin móviles conectados. No prueba efecto de órdenes,
pareja móvil confirmada, recuperación, disponibilidad constante o enforcer Android.
Al detener el adaptador deja de declararse disponible. `GET /keepalive`:200alive,
siempre sólo proceso. CP1 local/bootstrap conservan sus propias respuestas previas.

`/ws` exige cp.v2 único, sin Origin/query, texto≤16384, sin compresión. Tras upgrade
sólo CHALLENGE→AUTH firmado con clave esperada y contexto/socket≤10s habilita mensajes.
Una conexión sin firma no puede consultar STATE, retransmitir o sustituir a un rol.
Sólo SYNC_REQUEST/SET_POLICY padre y STATE/ACK hijo verificados; PAIR no viaja por WS.
No claves recibidas del frame, persistencia, colas de órdenes o ACK generado por relay.

Cupos existentes:16retos,18sockets,10frames/s ráfaga20, salida64KiB, upgrades globales
y por dirección real del socket (en Render puede ser IP compartida del proxy; se
mantiene límite conservador, no se acepta IP reenviada arbitraria). Un socket por
rol, sustituido sólo tras AUTH. Ping transporte30s con nonce/pong y limpieza al
siguiente ciclo si no respondió; no es keepaliveHTTP ni validación Android de red.

## Verificación antes y después de desplegar

Pruebas locales usan claves efímeras sólo RAM y entorno Render SIMULADO, nunca
configuración familiar. Cubren CLI sin claves, claves erróneas/roles, origen, CP1,
retos, routing y bytes originales. La prueba local no acredita TLS público.
El siguiente ensayo público debe coordinarse una vez configuradas las claves
reales; no insertar claves de fixtures temporalmente en el servicio familiar.
Instalación y ceremonia requieren permiso físico específico y selectores A56/A13
en sus proyectos, sin acceso a dispositivos desde el servidor. Primer piloto
foreground del hijo está limitado a su sesión adulta120s; no promete canal con app
cerrada, Doze o uso cotidiano ni cancelar la necesidad de probarlo.
