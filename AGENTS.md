# Instrucciones — proyecto servidor Render

Proyecto independiente: solo servidor Node/TypeScript del relay WSS. No desarrollar
ni modificar las apps en parental_padre ni el repositorio del hijo.

El propietario pidió separar proyectos y desarrollar servidor más adelante.
En esta extracción no se implementaron nuevas funciones ni se desplegó nada.
Leer README.md, ESTADO.md y documentacion/SPEC_RELAY_RENDER.md antes de continuar.
Próxima tarea R01; R02/R03 pendientes. Una tarea por turno, respetar dependencias.

- Español claro en comunicación/documentación/comentarios/commits.
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
- Commit por bloque de 500 líneas manuales de código/tests y al cerrar tarea;
  revisar lo preparado sin secretos. No borrar trabajo ajeno.
