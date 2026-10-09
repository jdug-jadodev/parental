# Revisión de seguridad y carga local

Alcance: servidor Node/TypeScript, transporte ws y clientes Node simulados en
127.0.0.1. No es una auditoría independiente ni validación de Android o Render.
Health 503, bloqueo de producción y contrato CP/1 congelado permanecen.
Resultados realmente ejecutados y métricas se registran en ESTADO.md.

## Hallazgos y correcciones

1. **Controles fuera del cupo de aplicación.** ws respondía automáticamente a
   cualquier ping, también antes de AUTH. El cupo de `message` no limita ping/pong
   de control. Se desactiva autoPong y se aplica un cupo conjunto de controles de
   10/s, ráfaga 20, más límite de salida antes de responder. Exceso: ERROR
   RATE_LIMITED y cierre 1008. Controles válidos conservan bytes, sin autenticar
   al cliente ni sustituir PING/PONG de aplicación.
2. **Número de fragmentos independiente del tamaño.** maxPayload no basta para
   limitar partes vacías o muy pequeñas. Se fijan maxFragments=64 y
   maxBufferedChunks=128, usando opciones públicas de ws y sus tipos instalados.
   Se prueba aceptación de 64 partes y cierre 1008 con 65 partes vacías.
3. **Cabeceras originales, defensa en profundidad.** El adaptador comprueba
   rawHeaders antes de usar las normalizadas. En Node v24.21.0, el HTTP nativo
   ya rechaza más de 32 cabeceras con 431. No se reprodujo una elusión de Origin;
   no se presenta esta defensa adicional como vulnerabilidad explotada.
4. **Margen de salida con framing.** La comprobación de 64 KiB ahora incluye
   también los 2/4/10 bytes de cabecera WebSocket del frame de salida sin máscara,
   no solo su payload UTF-8. El borde exacto se prueba determinísticamente.

## Controles revisados y evidencia

| Control | Evidencia local |
|---|---|
| Reto de un uso, socket/nonce/plazo, firma y rol fijados | autenticacion.test.ts, auth-websocket.test.ts |
| Routing por pareja/rol/tipo, bytes intactos, sin cola | routing.test.ts |
| Reemplazo solo autenticado, cierre antiguo no borra nuevo | auth-websocket.test.ts, routing.test.ts |
| Tamaño, UTF-8, JSON ambiguo, DER, base64url y canonicalización | pruebas de protocolo, límites y vectores congelados |
| Salida 64 KiB, fallo de escritura y receptor cerrado | limites-relay.test.ts, backpressure.test.ts |
| Cupo de controles pre-AUTH y fragmentos vacíos | seguridad-transporte.test.ts |
| X-Forwarded-For no elude cupo de dirección del socket | seguridad-transporte.test.ts |
| Nonce de pong de control y limpieza | limites-relay.test.ts y socket real en seguridad-transporte.test.ts |
| Cierre 1012, restart, autenticación nueva sin cola | auth-websocket.test.ts, routing.test.ts |
| Dependencias conocidas | pnpm audit --json; diagnóstico, no garantía de seguridad |

## Carga reproducible

Tras `pnpm run build`, `pnpm run test:carga:prolongada` ejecuta 610 ciclos alternando
roles: AUTH, PING/PONG y SYNC_REQUEST sin receptor en ciclos del padre. Se mide
memoria tras GC en 60 lotes, cero conexiones TCP entre lotes, P95 del PONG local
y P99 de retraso del bucle. Márgenes diagnósticos: crecimiento final <8 MiB de
heap y <4 MiB externo. Las privadas de pruebas solo viven en RAM; la salida
contiene métricas agregadas, no claves, parejas, cuerpos ni nonces.

Esta carga se mantiene dentro del cupo de upgrades y no representa clientes
simultáneos masivos. No mide latencia de aplicar órdenes ni demuestra ausencia
de fugas a largo plazo. El backpressure se simula sobre sockets reales; todavía
no se midió un receptor que deje de leer en una red pública real.

## Pendientes antes de publicación

TLS/WSS real, proxy confiable y rate limit público por IP, readiness durante
inicio/cierre, carga más prolongada y red lenta real. Requieren fase pública
autorizada; no deben resolverse abriendo temporalmente sockets sin autenticación.
La integración móvil y aplicación de políticas se validarán en los proyectos de
las apps cuando estén disponibles. Sin cron, anti-suspensión ni servicios externos.
