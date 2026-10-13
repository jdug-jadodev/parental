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

## 6. Resultado de diseño y revisión pendiente

HIJO-C03 terminado en 9ae6c99; diseño hijo/DISENO_CONTROL_LOCAL_ADULTO.md
revisado en lectura por coordinador, sin pruebas nuevas. Distingue administración
RAM de autorización normal por boot y códigos únicos de recuperación; propone
precedencia por revisión fresca y modo efectivo separado de última orden remota.
PADRE-C03 terminado en 984693c y revisado el 2026-10-11: compatible como propuesta
con precisiones, sin opciones/versión/implementación aprobadas. Revisión completa
en padre/REVISION_CONTROL_LOCAL_ADULTO.md del repositorio padre, solo en lectura.

Los 30 min de permiso normal por defecto, cinco minutos administrativos, código
aleatorio de 26 caracteres, KDF/coste y alcance de apps son recomendaciones del
diseño, **no aprobaciones del propietario**. Padre revisará riesgos/alternativas,
reconciliación y cambios mínimos coordinados; después se presentarán elecciones
al propietario antes de ADR/versión e implementación. CP/1 permanece congelado.

PADRE-QR01 terminó en a8e4ffc con caso fijo del fallo del detector y bytes/firma
válidos. No se corrigió lector ni debe usarse PURE_BARCODE como bypass de cámara.
PADRE-QR02 requiere asignación aparte; este diseño no resuelve el defecto QR.

Precisiones de revisión: serializar acciones contra revisión vigente, separar seq
remoto de revisión global y resultado de orden del modo efectivo; invalidar timers
y confirmaciones de revisiones anteriores. Sin red no afirmar bloqueo actual del
hijo. Preservar incertidumbre/seq/esperas/consumos/identidad en migración, sin
inventar credencial o APPLIED. Fuente REMOTA al perder red, duración, sesión,
alcance de apps, credencial y recuperación siguen elecciones pendientes.

## 7. Decisiones del propietario — 2026-10-11

Respuestas expresas recogidas tras revisar PADRE-C03:

- Desbloqueo local normal con duración elegida por el adulto en cada acción;
  al vencer vuelve bloqueado. No default silencioso de 30 minutos. Rango y
  presentación del tiempo todavía por acordar.
- Permitir todas las apps normales, no solo una lista parental autorizada.
  Controles administrativos del hijo protegidos por código; viabilidad y límites
  Android/enforcement necesitan diseño y pruebas, sin prometer protección física.
- Ambas autoridades pueden cambiar el modo: última acción válida y confirmada
  en hijo gana. Bloqueo remoto nuevo puede revocar permiso local y desbloqueo local
  posterior puede volver a permitir. Contextos/paquetes/timers viejos no mandan.
- Autorización REMOTA conserva el permiso aunque el hijo pierda internet, hasta
  su vencimiento, bloqueo válido nuevo o reinicio. También LOCAL funciona offline.
  La reconexión no renueva ni restaura permisos vencidos/revocados. Esto cambia
  adicionalmente la regla CP/1 de bloqueo al perder internet; exige versión nueva.
- Administración permanece mientras se está en controles, con caducidad breve
  todavía por definir. Salir o pasar a fondo cierra y pide código al volver.
  Cerrar administración no revoca por sí solo autorización normal ya comprometida.

Reinicio siempre bloqueado y emergencia sin código permanecen requisitos.
Credencial/formato/generación/entrega, intentos/esperas, recuperación/rotación,
duraciones/rangos concretos, LOCK_FOR y migración todavía pendientes. No se
aprobaron cinco minutos administrativos, 26 caracteres, KDF/coste, contrato
CP/2 o implementación por estas respuestas. Primero concretar esas elecciones
y la propuesta conjunta; no asignar silenciosamente código o permisos físicos.

## 8. Código numérico y recuperación — 2026-10-11

Propietario define código maestro como serie de números y recuperación mediante
pregunta. Tras consultar longitud y configuración, confirma:

- Código numérico de **5 a 10 dígitos**, longitud elegida por el adulto. No imponer
  ocho dígitos, 26 caracteres o generación aleatoria como requisito aprobado.
  Tratar como cadena de dígitos, sin conversión a entero que pierda ceros iniciales.
- **Pregunta personalizada**, con respuesta configurada por el adulto en el hijo.
  Recuperación local sin internet para establecer código nuevo, no revelar anterior.
  No enviar código/respuesta/verificadores al padre/relay ni guardarlos en logs,
  repositorio, QR o exportación pública. No se solicitaron secretos reales aquí.

Pregunta visible no es secreto; respuesta sí. Una respuesta conocida por el menor
o deducible puede eludir el código. Cinco dígitos ofrecen solo 100.000 combinaciones:
no afirmar alta entropía ni resistencia física por este formato. Diseñar protección
de verificadores/KDF y límites/esperas persistidos para ambas vías, sin bypass por
reinicio y sin afectar emergencia. Parámetros/coste y garantías requieren revisión
y pruebas, no cifras inventadas ni teléfonos autorizados por esta decisión.

Pendientes: reglas de respuesta (mayúsculas/acentos/espacios), límites de longitud,
intentos/esperas, configuración/cambio autorizado de pregunta y código, transacción
de recuperación y revocación de sesiones/permisos, y tratamiento de respuesta
olvidada/registro corrupto. No convertir recuperación correcta automáticamente en
uso normal o administración permanente; precisar autorización específica de reset.
No añadir obligatoriamente un código de recuperación adicional como sustituto de
la pregunta elegida. CP/1/fixtures permanecen intactos; diseño conjunto por actualizar
antes de implementación y sin nueva asignación o permiso físico en este turno.

## 9. Consolidación HIJO-C04 asignada

2026-10-11: propietario solicita continuar. HIJO-C04 enviada/admitida para
actualizar diseño hijo con §§7–8 y precisiones PADRE-C03. Solo documentación,
sin resultado confirmado ni código/contrato nuevo autorizado. Proponer seguridad
de PIN/pregunta, transacción de reset/revocación y matriz/lifecycle/contextos,
decisiones técnicas pendientes y siguiente unidad mínima para revisión. No más
lista parental/26 caracteres o default 30 min contra decisiones expresas.
No trasladar recuperación a servidor ni crear una apertura automática por reset.
Revisión de versión/planes y autorización de implementación siguen posteriores.

## 10. HIJO-C04 revisada y evaluación de viabilidad

2026-10-12: hijo terminó HIJO-C04 en 4636d30. Relevo y diseño íntegros revisados
por coordinador: requisitos §§7–8 incorporados. Solo entrega documental; parámetros
de duración/esperas/normalización/KDF/reset, LOCK_FOR/olvido y versión siguen pendientes.

HIJO-C05 asignada para evaluar con documentación oficial Android si todas las
apps normales pueden coexistir con bloqueo real al vencer plazo, también con
Doze/proceso muerto/boot, sin escapes administrativos o pérdida de emergencia.
Comparar opciones oficiales/limitaciones, distinguir lista técnica de paquetes de
lista parental no solicitada y detectar incompatibilidades antes de contrato/código.
No pruebas físicas, builds o implementación; resultado y elección de arquitectura
pendientes. Prototipo seguro y evidencia física futura solo propuestas por revisar.

## 11. HIJO-C05 revisada y precisiones del propietario — 2026-10-12

HIJO-C05 terminado en 94b1bbe, informe VIABILIDAD_ANDROID_TODAS_APPS.md y relevo
íntegros revisados en lectura. Viabilidad condicionada, no certificación: candidato
HOME/Lock Task persistente con catálogo técnico de todas apps normales. Android
no aporta lease de política que expire independientemente del controlador; cierre
ante crash/Doze/reboot y escapes requieren pruebas. No afirmar bloqueo inviolable.
Las consultas oficiales del hijo son evidencia documental, no ensayos físicos.

Propietario confirma/puntualiza:

- HOME propio aceptado. Bloqueado debe presentar pantalla única que el menor no
  pueda abandonar; adulto libera remotamente o desde controles locales protegidos.
  Mantener emergencia/Keyguard y expiración de uso como requisitos anteriores.
- **Instalar y actualizar durante uso desbloqueado**, no solo mantenimiento.
  Todas apps normales siguen incluidas sin selección parental. Investigar carreras
  de instalación/apertura/reemplazo sin ocultarlas con otra restricción no aprobada.
- Proteger Ajustes/administración, desinstalación de hijo y vías para quitar la
  protección. El alcance de ajustes cotidianos frente a cambios administrativos
  necesita matriz técnica; no asumir que un paquete Settings se separa por actividad.
- Corrige expresamente la opción «sí, evaluar sin garantizar»: quiere hacer el
  bloqueo lo más resistente posible y corregir fallos descubiertos de forma
  iterativa. **No es aceptación de ventanas/fallos conocidos como entrega final**
  ni autorización de operar teléfonos. No prometer imposibilidad absoluta que
  las APIs no demuestran; presentar límites encontrados y solución/revisión.

## 12. Nuevos avisos y total diario — requisito, diseño pendiente

Propietario solicita aviso al padre de:

1. Tiempo permitido agotado.
2. Que el menor está usando el teléfono.
3. Cuánto tiempo lleva de uso total en el día.
4. Falta de conexión/internet en el hijo.

Esto amplía el alcance previo: antes no se recopilaba uso. Diseñar solo estado
de uso y agregado diario mínimo; no apps consultadas/contenido/ubicación/historial
por aplicación, sin inferir autorización para capturarlos. Agregado de duración
no es dato de relay persistente: servidor sigue sin almacenar uso/historial.

Distinguir tiempo autorizado de uso observado: pantalla encendida, desbloqueo
Android, foreground de nuestra app o PONG no demuestran interacción humana.
Definir fuente/precisión/permisos y estados confirmado/posible/desconocido antes
de afirmar «está usando»; investigar APIs oficiales sin activar permisos ahora.
Sin observación fiable no rellenar uso con cero ni duración permitida completa.

Vencimiento de plazo no prueba bloqueo aplicado; avisar ambos hechos separados.
Internet validado localmente, canal WSS, presencia del relay y frescura del último
reporte son señales distintas. Sin comunicación, padre informa desconexión/estado
desconocido, no causa «hijo sin internet» inventada. No aviso inmediato garantizado
si hijo/relay/padre sin red, proceso muerto o Android difiere ejecución. Padre debe
seguir accesible para interpretar estado desconocido; avisos no corrigen enforcement.

Proponer medición local offline agregada, reloj monotónico para intervalos, límites
de día/zona/hora civil, proceso/reboot e incertidumbre; sync firmado fresco posterior
sin doble conteo ni reenvío de órdenes. Retención mínima y qué se hace con vencimiento
ocurrido sin red deben definirse explícitamente, no crear cola/historial oculto.
Notificaciones Android/permiso/canal/lifecycle del padre por proponer: WSS no es
push fiable con app cerrada. No añadir FCM/servicio externo/keepalive anti-suspensión
unilateralmente, recopilar datos reales o editar CP/1/fixtures por estos avisos.

## 13. HIJO-C06 — arquitectura mínima y señales de uso, enviada

Una unidad documental para incorporar §§11–12 a la arquitectura candidata y
presentar fuentes oficiales, matriz de estados/medición/alertas, límites y próxima
implementación aislada mínima. Reutilizar C04/C05, no reescribir todo o reparar QR.
Cambios exactos de contrato/versión requerirán revisión conjunta antes de código.
Sin instalación/restricciones/ADB, tests/builds/APK, permisos concedidos, datos
reales de uso o cambios en planes/ADR/CP1/fixtures/repos ajenos por esta unidad.
Envío admitido queue/resume=true a sesión existente del hijo; entrega todavía
pendiente. No permisos ampliados/sesiones nuevas por las consultas de documentación.

## 14. HIJO-C06 revisada; primer acumulador de laboratorio

2026-10-12: C06 terminado en ae1c7eb, diseño íntegro revisado. Señal de pantalla/
Keyguard no es humano usando; acceso UsageStats, definición métrica/total, retención
del marcador/día/zona y aviso con padre cerrado requieren decisión/revisión. No
se han aprobado por aceptar entrega documental ni por solicitar continuar.

HIJO-L02 enviada/admitida para modelo puro solo test JVM: sumar intervalos de
evidencia sintética explícita, subtotal conocido/calidad y snapshot absoluto con
ventana/boot/reloj/repositorio inyectados. Sin elegir fuente Android/métrica humana,
día/zona productivos o añadir retención de marcador pendiente. Pruebas negativas
de doble conteo/huecos/proceso/boot/IO/ventanas/overflow, sin uso real o autorización
de apps. Resultado diagnóstico, fuera main/APK/androidTest, no implementación
operativa del contador ni avisos. Revisión posterior antes de integración/versionado.

## 15. HIJO-L02 revisada y simplificación de uso — 2026-10-12

HIJO-L02 terminado en c6e8d5d. Código/test/evidencia completos revisados en lectura:
modelo FICTICIAS_JVM solo src/test, CAS/readback simulados, O(1), 22 tests nuevos.
Hijo reporta 199 tests debug ejecutados correctos, núcleo 169 UP-TO-DATE no
reejecutado. Primer fallo de expectativa conservado y corregido explícitamente.
Exclusión main/JAR debug reportada, no APK nuevo inspeccionado aquí. No medición
real, integración Android o pruebas reejecutadas por Render.

Preguntas de medición/retención/push quedaron interrumpidas **sin respuestas**.
No tomar opciones recomendadas como decisiones. Propietario precisa después:

- Por ahora no prioriza investigar escapes; quiere posponer esa revisión y
  corregir los que aparezcan. Esto sustituye la prioridad anterior de revisión
  exhaustiva previa, no demuestra ausencia de escapes o seguridad inviolable.
  Mantener protecciones básicas de administración/desinstalación, emergencia,
  recuperación y bloqueo temporal/boot; no quitar guardas o autorizar teléfonos.
  La entrega inicial deberá identificar lo no probado; no presentarla como
  certificación de bloqueo resistente a todos los ataques.
- Define «uso» como pantalla desbloqueada al conceder tiempo por el adulto.
  Para el diseño se separa **tiempo permitido/consumido** de interacción humana:
  no es necesario detectar persona/toques ni pedir acceso al historial de uso
  de otras apps para contabilizar permiso. No adaptar métricas de observación
  FICTICIAS_JVM como si fueran duración real de actividad.

Contar duración transcurrida de autorizaciones efectivamente aceptadas/vigentes,
no sumar el tiempo solicitado por anticipado. Plazo cuenta desde aceptación
duradera, no pulsación/envío del padre. Distintos permisos reemplazados no deben
sumar tramos solapados ni reiniciar el tiempo consumido del día. Aviso «permitido»
no asegura persona usando o enforcement exitoso: mantener fallo/desconocido aparte.
Keyguard Android y pantalla apagada no equivalen automáticamente a revocar permiso;
precisar su tratamiento en contador sin pausar/renovar silenciosamente el plazo.

Quedan sin respuesta retención del día/historial y avisos con padre cerrado/push;
zona/día/intervalos inciertos/reset y definición final del contador por acordar.
Sin elegir proveedor push, crear servicios/credenciales o recopilar datos reales.
HIJO-L02 queda laboratorio de evidencia sintética, no promoción a contador productivo.

## 16. PADRE-C04 — propuesta exacta de contrato preparada para revisión

2026-10-12: propietario confirma aclaración §15 y solicita continuar. Asignada y
admitida PADRE-C04 para documento propio de contrato propuesto: campos/tipos/rangos,
contextos/firmas/versionado/subprotocolo, revisión global vs secuencia remota,
STATE/ACK/contador absoluto de tiempo permitido y ejemplos negativos documentales.
Retención/día/push/duraciones/LOCK_FOR pendientes con alternativas identificadas,
no funcionalidades aprobadas silenciosamente. No se edita CP1/esquema/fixtures.

Preservar identidad/reservas/pendientes/consumos/esperas y ceremonia explícita;
sin downgrade de semántica nueva bajo CP1. Propuesta mínima reutilizable para
revisión hijo/relay y acuerdo posterior de versión antes de código/sincronización.
Sin nueva implementación/tests/builds o autorización física. Entrega pendiente.

## 17. PADRE-C04 revisada y decisiones funcionales — 2026-10-13

PADRE-C04 terminó en 1582e66. Leídos relevo y BORRADOR_CP2_ORDENES_Y_TIEMPO.md
íntegros en lectura. Campos/versiones/dominios/contextos propuestos, no contrato
aprobado. CP1 sigue intacto, sin tests/builds o codec nuevo por esa entrega.

Respuestas expresas del propietario:

- **Cuenta el permiso**: tiempo autorizado transcurrido, incluyendo pantalla
  apagada y Keyguard. No interacción humana ni duración por app; no UsageStats.
  La cuenta atrás sigue su plazo monotónico, no pausa por pantalla/red.
- **Historial de varios días, limpieza cada domingo a las 21:00**. Sustituye la
  propuesta de solo bucket actual/sin historial. Diseñar zona horaria local
  configurada, corte semanal, mínimo agregado por día y eliminación en hijo/padre.
  No historial por app/contenido ni persistencia de uso en relay. No se aprobó
  retener datos indefinidamente o más allá del corte por ausencia de red.
- **Evaluar push** para avisos con app padre cerrada. Solo diseño y revisión de
  proveedor/privacidad/seguridad/datos mínimos/coste/entrega/credenciales. No cuenta,
  SDK, token real, servicio/despliegue/credencial autorizado por la elección.
- **Eliminar bloqueo temporal con apertura automática (LOCK_FOR)**. No lo quiere.
  Acciones requeridas: permitir por tiempo y bloquear al vencer, bloquear inmediato,
  permitir libre hasta nuevo bloqueo/reinicio. No apertura diferida/timer de
  desbloqueo ni deferredAllowSec en versión nueva. CP1 conserva sus bytes/semántica
  históricos; no borrar botón/codec v1 unilateralmente para aparentar versión nueva.

El rango propuesto 1 minuto–7 días no quedó aprobado: el propietario respondió
retirando esa función, no eligiendo su rango. Alcance de permiso libre en controles
locales/remotos y rangos/caducidades de producto deben quedar explícitos en revisión.

Historial requiere mínimo multibucket acotado semanal (no fila por intervalo/app),
snapshot absoluto fresco sin sumar retransmisiones. Deadline de permiso monotónico
distinto del calendario de limpieza. Corte domingo21 debe ejecutarse localmente
sin depender de red, con catch-up antes de leer/publicar tras proceso apagado/boot;
definir cambio de zona/hora/DST, incertidumbre y eliminación segura. No reconstruir
datos borrados desde snapshot antiguo o sincronización tardía; marcador/época de
retención evita resurrección en padre. No prometer borrado instantáneo con proceso
muerto sin demostrar capacidad; presentar cómo se cumple el límite y errores.

Push no implica vigilancia/cola de órdenes: avisos mínimos autenticados y estado
confirmado por WSS/sync, no órdenes ejecutadas desde una notificación no verificada.
Si requiere componente de emisión/almacenamiento de tokens separado, proponerlo con
consentimiento y límites antes de cambiar arquitectura relay sin secretos/historial.
Sin comunicación el estado/red del hijo sigue desconocido, no causa inventada.

Siguiente revisión técnica del hijo debe incorporar estas decisiones antes de
acuerdo conjunto y actualizar el borrador; no congelar la variante de §8 anterior
de solo día/última expiración o LOCK_FOR. CP/2 sigue provisional.

HIJO-C07 documental enviada/admitida para deltas exactos de §§17 y revisión del
draft del padre. Entrega pendiente; sin contrato/schema/copias sincronizados,
implementación/tests/builds/permisos físicos o proveedor push activado. Revisión
de hijo y relay antes de acuerdo de versión, no cambios unilaterales de CP1.
