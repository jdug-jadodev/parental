# Control local del adulto — requisitos y propuesta de versión

Fecha: 2026-10-10. Cambio funcional pedido por el propietario.
**Requisitos confirmados, diseño pendiente; no implementación autorizada aquí.**

## 1. Decisiones confirmadas por el propietario

- El padre mantiene control remoto de bloqueo/desbloqueo y funciones relacionadas.
- El hijo también permite al adulto bloquear y desbloquear localmente mediante
  contraseña/código maestro, aunque no haya conexión con el padre.
- Desbloqueo local significa uso normal del teléfono y aplicaciones, no solamente
  mantenimiento limitado. Funciona incluso sin internet en el propio hijo.
- Entrar a la interfaz de control de la app del hijo exige el código maestro;
  desde allí debe poder bloquearse directamente sin depender de la red.
- Cada reinicio vuelve a dejar el hijo bloqueado, aunque antes se desbloqueara
  localmente. Exige autorización nueva local o remota para ese arranque.

La vía de emergencia debe seguir disponible sin este código. El código de la
app no sustituye ni evita el desbloqueo ordinario de Android/Keyguard.
Estas decisiones no autorizan ADB, instalaciones, provisión, borrado, quiosco,
certificados, LAN o despliegue; cada operación física necesita acuerdo aparte.

## 2. Conflicto con CP/1 y transición

CP/1 §9/9.A no admite ALLOW offline ni PIN maestro fijo. Tiene tres códigos de
recuperación por propósito y de un solo uso: MAINTENANCE, RECOVER_PARENT, RETIRE.
MAINTENANCE no habilita uso normal. El nuevo control local es una autorización
distinta; no renombrar mantenimiento como desbloqueo ni reutilizar/convertir los
códigos actuales sin diseñar y acordar la transición.

Es necesario proponer nueva versión/ADR coordinada entre hijo, padre y relay
antes de cambiar semántica, esquema, firmas o copias compartido/ congeladas.
**CP/2 es por ahora un nombre de propuesta**, no versión acordada ni desplegada.
No introducir un bypass privado bajo CP/1 ni eliminar sus guardas para aparentar
compatibilidad. CP/1 y fixtures permanecen intactos durante el diseño.

H05-L01 y PADRE-C02 siguen siendo evidencia aislada válida de lo que probaron,
pero no implementan este nuevo requisito ni acreditan el control local normal.
La matriz de puertas anterior es propuesta; necesita revisar sus supuestos,
no declarar H05/H08 completas por cambiar la terminología.

## 3. Límites de seguridad que debe preservar el diseño

- Código del adulto, no acceso administrativo concedido al niño por desbloquear
  uso normal. Nunca código universal, valor fijo en fuente o secreto del relay.
- Protección de entrada administrativa separada de autorización de uso normal:
  entrar a apps normales no debe reabrir una sesión de administración anterior.
  Fondo/cancelación/reentrada y caducidad deben revalidar autoridad local.
- Proponer credencial propia de la instalación/vínculo, generación/entropía,
  almacenamiento/verificación protegidos, comparación segura, límites de intentos
  y espera persistida. No guardar/exportar contraseña en claro o en logs/QR/WSS.
- Emergencia nunca bloqueada por intentos, espera o falta de credencial. Definir
  pantalla pública mínima compatible con HOME/quiosco sin exponer controles.
- Reinicio/contexto cambiado invalida autorización normal y sesión administrativa;
  consumo y esperas de recuperación existentes no se restauran por reiniciar.
- Acción local exige autoridad local válida y efecto real comprobado. No inventar
  APPLIED ni ACK del padre por una acción local o reenvío del relay.
- Mantener autenticación/firma/contexto/replay de órdenes remotas, contadores y
  bytes intactos. No crear endpoint administrativo o almacenar secretos en Render.
- Archivo corrupto, identidad perdida o credencial ausente no generan reemplazo
  ni enrolamiento libre. Diseñar recuperación del adulto y cambios de credencial
  sin restablecer/borrar unilateralmente o destruir la identidad previa.

Son restricciones del diseño, no funcionalidades ya probadas en APK.

## 4. Decisiones todavía abiertas

El requisito confirmado no decide todos estos detalles; la IA del hijo debe
presentar alternativas y recomendación para revisión, sin elegir silenciosamente:

1. Generación inicial del código, si es reutilizable, longitud/entropía, cómo se
   entrega al adulto y cambio/recuperación ante olvido o sustitución del padre.
2. Duración de autorización de uso normal y sesión administrativa, cierre de
   app/fondo y confirmación de acciones sensibles. Reinicio bloquea está decidido.
3. Precedencia/orden entre bloqueo remoto y acción local, revocación de contexto,
   desafíos/secuencias y temporizadores. Ninguna orden antigua debe reaplicarse
   tras reconexión ni una caída de red anular sin definición el uso local offline.
4. Cómo STATE expresa estado efectivo y distingue última orden remota aceptada
   de una acción local; qué puede afirmar ACK y cómo reconcilia el padre al volver.
5. Modelo/procedencia/migración privados y versión CP coordinada; tratamiento
   de datos CP/1 legados sin inventar código maestro o autorización existente.
6. Revisión de subunidades y puertas de hijo/padre, con recuperación y emergencia
   reales antes de endurecer y nueva evidencia física requerida tras hacerlo.

## 5. Unidad HIJO-C03 — diseño, no código

Asignar a la sesión existente del hijo una sola unidad documental: propuesta
de control local del adulto y versión coordinada, basada en decisiones §1,
matriz de estados/acciones/eventos, límites §3 y decisiones abiertas §4.
Identificar exactamente qué semántica CP/1 deja de valer y el cambio mínimo
necesario en ambos clientes/relay; no editar el contrato o fixtures para resolverlo.

Entregar modelo de amenazas, lifecycle/boot, credencial local/recuperación,
precedencia y diagnóstico remoto propuestos, plan de pruebas futuras y unidades
de implementación/dependencias a revisar. No inventar aceptación física o logs
con secretos; no ejecutar código/tests/builds/dispositivos por esta unidad.
Actualizar coordinación/ESTADO y hacer commit propio en hijo. Revisar con padre
antes de pedir acuerdo de versión y autorizar implementación; no iniciar otras
unidades automáticamente ni modificar repos ajenos.

Padre recibe aviso de requisitos nuevos sin interrumpir PADRE-QR01; esa incidencia
de calidad sigue siendo independiente. No adaptar todavía su validador, UI,
aceptación o protocolo al nuevo código. Relay solo coordina este diseño.
