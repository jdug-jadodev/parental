# Preparación de Render — no desplegado

R03 se prueba exclusivamente en loopback con clientes Node. La plantilla
`plantillas/render.yaml.example` es inactiva: no copiarla a `render.yaml` ni
aplicarla todavía. El arranque en producción permanece bloqueado y health
devuelve 503 incluso con configuración válida. **La plantilla fallaría hoy**;
no representa un servicio listo ni autoriza publicación.

## Requisitos antes de autorizar publicación

- Confirmar compatibilidad de ambos clientes, origen definitivo y exportación
  pública de la pareja. No copiar privadas, códigos de recuperación ni historial.
- Autorizar explícitamente publicación, repositorio remoto y servicio Render.
- Revisar TLS/WSS real, cadena de proxy documentada y límites por IP. Actualmente
  solo se usa remoteAddress; nunca X-Forwarded-For enviado por el cliente. El límite
  global y la tabla acotada protegen aun sin una IP individual fiable, pero no se
  ha validado el proxy de Render ni se permite tráfico fuera de loopback.
- Cambiar de forma coordinada las barreras locales, bind y estado de readiness,
  sin abrir un modo sin autenticación. Probar health durante inicio/cierre y fallos.
- Confirmar Node 24 y pnpm 10.0.0 en el entorno de build. `packageManager` y
  `pnpm-lock.yaml` fijan gestor/dependencias; no usar npm ni autorizar postinstall.
- Una sola instancia, sin autoscaling: retos, presencia y sockets viven en RAM.
  Elegir conscientemente un plan que no se suspenda para uso habitual, revisando
  condiciones vigentes; no se contrata ningún plan desde este proyecto.

## Comandos previstos desde la raíz

Build: `pnpm install --frozen-lockfile --prod=false` y `pnpm run build`.
Start: `pnpm start`. Render proporciona PORT; no fijarlo manualmente en la plantilla.
Health futuro: `/healthz`; `/keepalive` es solo actividad del proceso y nunca
se debe usar para aparentar disponibilidad CP/1 o prometer evitar suspensión.

PUBLIC_ORIGIN debe ser un origen HTTPS exacto, sin path/query/fragment.
ACTIVE_PAIR_ID es UUID v4; las dos públicas son SPKI DER P-256 base64url distintas.
NODE_ENV=production y LOG_LEVEL=error. Ningún valor real está incluido.

## Comprobaciones pendientes en el entorno público

Con clientes Node autorizados: WSS y certificado, autenticación de ambos roles,
bytes intactos, rol/pareja/firma inválidos, receptor ausente, backpressure real,
límites por IP detrás del proxy, SIGTERM/restart y reconexión sin cola. Revisar
memoria durante carga prolongada. No publicar cuerpos ni identidades en logs.
Después, integrar las apps desde sus proyectos cuando el propietario lo confirme.

La firma y el reenvío no significan que el hijo haya aplicado una orden. Solo
el ACK firmado del hijo informa su resultado; presencia/PONG no lo sustituyen.
