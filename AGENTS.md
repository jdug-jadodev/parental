# Instrucciones — proyecto servidor Render

Proyecto independiente: solo servidor Node/TypeScript del relay WSS. No desarrollar
ni modificar las apps en parental_padre ni el repositorio del hijo.

Proyecto extraído sin despliegue; R01–R03 implementados y probados localmente.
Arquitectura hexagonal: src/ y paquete pnpm en raíz; leer documentacion/ARQUITECTURA.md.
Leer README.md, ESTADO.md y documentacion/SPEC_RELAY_RENDER.md antes de continuar.
Fase pública e integración móvil pendientes de autorización/coordinación.
Una tarea por turno, respetar dependencias.

- Español claro en comunicación/documentación/comentarios/commits.
- Código sin comentarios; explicar decisiones en documentación. Dominio/aplicación
  aislados de Node e infraestructura, inyección por constructor y mappers en bordes.
- Estructura: application/{mapper,dtos,usecase,validations}, domain/entities (una
  entidad por archivo) y ports/{portin,portout}; infrastructure/{controller,routers,
  adapter,config}. Composición solo en config/dependencias.ts. Controller HTTP
  solo health/keepalive; WebSocket entra por adapter, sin DTOs de conexión duplicados.
- Keepalive solo confirma actividad del proceso; no disponibilidad CP/1 ni garantía
  contra suspensión de Render. No añadir autopings, cron o servicios externos sin solicitud.
- CP/1 y fixtures en compartido/ son copia congelada: no cambiar esquema,
  firmas ni semántica unilateralmente. Acordar nueva versión antes de sincronizar.
- No privadas, códigos reales, credenciales ni historial; solo configuración pública.
- ACK de relay nunca significa orden aplicada por el hijo.
- No desplegar públicamente ni habilitar sockets sin autenticación y permiso.
- No usar dispositivos en este proyecto. A13 excluido; cualquier operación A56
  necesita aviso/autorización y selector explícito, nunca pruebas contra todos.
- Código heredado local: 127.0.0.1, health 503, upgrades rechazados y producción
  bloqueada. No quitar estas barreras para aparentar servicio listo.
- Compilar/probar localmente, registrar solo lo ejecutado en ESTADO.md.
- Usar pnpm fijado en packageManager y pnpm-lock.yaml; verificar con pnpm run verificar.
- Commit por bloque de 500 líneas manuales de código/tests y al cerrar tarea;
  revisar lo preparado sin secretos. No borrar trabajo ajeno.
