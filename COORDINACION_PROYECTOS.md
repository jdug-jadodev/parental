# Coordinación central — padre, hijo y relay

Última actualización: 2026-10-12. Coordinador: sesión de parental_render, por petición del propietario.
Este documento organiza el trabajo; no autoriza editar las apps, operar teléfonos,
abrir LAN, instalar certificados, aprovisionar, borrar datos, hacer push o desplegar.
Una tarea por turno. Cada IA implementa y registra resultados en su propio repo.

## Cambio funcional vigente — control local del adulto

Propietario solicita bloqueo/desbloqueo normal local con código maestro y entrada
protegida a la app del hijo, además del control remoto del padre. Confirma uso
normal también sin internet en el hijo y bloqueo obligatorio tras reinicio.
Requisitos/diseño pendiente en documentacion/CONTROL_LOCAL_ADULTO_PROPUESTA.md.
Emergencia sin código; no código universal ni secretos en relay. Esto contradice
prohibición de ALLOW offline de CP/1: proponer versión coordinada antes de cambiar semántica/
esquema/fixtures. No se aprueba CP/2 ni bypass por esta petición funcional.
HIJO-C03 terminado en 9ae6c99, diseño revisado en lectura. PADRE-C03 terminado
en 984693c y revisado en lectura: compatible como propuesta con precisiones;
decisiones nuevas del propietario recogidas en §§7–8 de la propuesta central;
HIJO-C04 asignada para consolidarlas. Sin implementación/permisos físicos o
versión nueva aprobada.
PADRE-QR01 terminado en a8e4ffc: fallo QR reproducido, lector no corregido.
PADRE-QR02 propuesto, no asignado; no ocultar ese defecto por prioridad nueva.

Confirmados reboot bloqueado, permisos offline LOCAL/REMOTO, tiempo elegido,
ambas autoridades, todas las apps normales, administración cerrada al salir,
código numérico 5–10 y pregunta personalizada. Parámetros de seguridad/lifecycle,
STATE/ACK y migración/versionado siguen pendientes de diseño/acuerdo.
No inferir de este requisito aprobación del orden H05/H08/H11 o quiosco.

### HIJO-C03 revisada y PADRE-C03 enviada

Diseño hijo/DISENO_CONTROL_LOCAL_ADULTO.md separa administración RAM, permiso
normal por boot y recuperación limitada. Propone credencial reutilizable propia
de instalación, verificador/KDF protegido, espera independiente, rotación/olvido
y revisión de control para últimas acciones frescas locales/remotas. STATE/ACK
deben distinguir modo efectivo de resultado de orden remota anterior. No código
maestro en padre/relay, bytes firmados intactos, sin downgrade CP/1 encubierto.

Duración normal 30 min por defecto, sesión administrativa cinco minutos, código
aleatorio 26 caracteres, KDF/coste, precedencia, apps aprobadas y migración son
**recomendaciones pendientes**, no decisiones del propietario. Permiso local
offline y bloqueo tras reinicio sí confirmados. No implementar límites nuevos
o restringir silenciosamente «uso normal» por esas recomendaciones.

PADRE-C03 documental revisará correspondencia/reconciliación/recuperación,
cambios mínimos por rol y lista breve de elecciones del propietario antes de
ADR/versión/puertas. Única sesión raíz padre/bandeja vacía confirmadas antes del
envío. Sin tests/builds/código nuevo, C02 modificado, CP/1/fixtures/plan/ADR
aceptados editados, teléfonos/ADB o despliegue. No nueva unidad hijo ni QR02
automática. El relay revisará implicaciones de versión/autenticación/routing
al acordar propuesta, sin credenciales ni lógica de desbloqueo en el servidor.

### PADRE-C03 revisada — 2026-10-11

Leídos relevo y padre/REVISION_CONTROL_LOCAL_ADULTO.md completos; HEAD confirmado
984693c. Revisión documental compatible con HIJO-C03, sin tests/builds nuevos.
Precisiones: revisión global independiente de seq remoto, escritor único, segunda
acción contra contexto sustituido requiere nueva confirmación; timers viejos de
LOCK_FOR también se invalidan. ACK anterior solo puede resolver su resultado
correlacionado, no reemplazar modo efectivo de STATE posterior. Estado sin canal
es desconocido, no prueba de bloqueo: podría existir autorización LOCAL offline.

Esperas/consumos/seq/pendientes e identidad deben preservarse en transición; no
fabricar credencial, autorización o acreditación. Migración presencial propuesta,
no ejecutada/autorizada. KDF/coste/antirollback físicos no acreditados. No añadir
recibos PAIR/OFFLINE o recuperación nueva como requisito implícito de este cambio.

Siguiente paso: elecciones concretas del propietario sobre duración normal,
sesión administrativa, alcance de apps, credencial, precedencia y pérdida de red
de permiso REMOTO; después concretar recuperación/rotación y versión coordinada.
No nuevas asignaciones, orden/planes alterados o CP/2 acordado por «continúa».
Defecto QR sigue abierto, sin QR02 asignada. Emergencia y bloqueo tras reboot
siguen requisitos confirmados. No pruebas físicas o cambios de apps desde Render.

### Decisiones funcionales confirmadas — 2026-10-11

Propietario elige tiempo de desbloqueo local en cada acción, todas las apps
normales (sin lista parental), última acción válida confirmada en hijo entre
ambas autoridades, y conservar permiso REMOTO al perder internet hasta plazo/
bloqueo nuevo/reinicio. Administración cierra al salir o pasar a fondo, sin
revocar por ello el uso permitido; caducidad breve todavía por concretar.
Detalle en §7 de documentacion/CONTROL_LOCAL_ADULTO_PROPUESTA.md.

Conservar REMOTO offline también contradice CP/1: no cambiarlo unilateralmente.
Pendientes formato/entrega/recuperación/rotación de credencial, intentos/esperas,
rangos/duración administrativa, LOCK_FOR y migración/versionado. No 26 caracteres
o cinco minutos aprobados. Sin nueva asignación o autorización física por estas
respuestas; las entregas hijo/padre previas son propuestas anteriores al acuerdo.

### Credencial y recuperación confirmadas — 2026-10-11

Propietario elige código maestro numérico de 5 a 10 dígitos y pregunta personalizada
con respuesta configurada por adulto para recuperación local offline y cambio de
código, no exposición del anterior. Detalle y límites en §8 de propuesta central.
Sin secretos reales recogidos. No credencial aleatoria de 26 caracteres o longitud
fija de ocho aprobadas. Pregunta no secreta/respuesta secreta: evitar datos deducibles
y diseñar límites persistidos de ambas vías, KDF/verificadores protegidos y reset
atómico. Riesgo de cinco dígitos/pregunta adivinable explícito, no garantía física.
Pendientes normalización, intentos/esperas, lifecycle del reset, cambios autorizados
y respuesta olvidada/corrupción. Diseños hijo/padre anteriores necesitan actualización;
sin nueva tarea automática, CP/2 aprobada, implementación o permisos de dispositivos.

### HIJO-C04 — consolidación de decisiones asignada

Continuación solicitada por propietario tras decisiones de credencial. Una tarea
documental en sesión existente hijo, con HIJO-C03/PADRE-C03 y §§7–8 centrales en
lectura. Esquema servido /openapi.json consultado; ruta explícita y bandeja vacía
confirmadas antes de envío queue/resume=true admitido. No resultado confirmado.

Actualizar matriz/credencial/recuperación/precedencia y mínimos de versión; distinguir
requisitos de recomendaciones (duraciones/rangos, normalización, límites/esperas,
KDF/protección, reset/rotación/revocación, olvido completo, LOCK_FOR/migración).
Evitar bypass alternando pregunta/PIN o reiniciando, emergencia independiente;
sin prometer protección física ni volver a lista de apps contra requisito.
Reset solo establece código nuevo, sin uso normal automático o administración
permanente. Propuesta atómica/contextual, sin secretos en padre/relay/exportaciones.

Diseño/relevo/ESTADO y commit propios; sin código/tests/builds, contrato/fixtures/
plan/ADR aceptados modificados, nuevos permisos físicos/ADB o despliegue. No tarea
nueva padre/QR02, sesiones/subagentes o promoción de H05/puertas. Revisar entrega
antes de versión/implementación; no generar siguiente unidad automáticamente.

### HIJO-C04 interrumpida y reanudada — 2026-10-12

Propietario pide continuar. Relevo hijo todavía sin C04 y HEAD 9ae6c99; API muestra
último paso C04 terminado con finish=error, aborted/Step interrupted. Tres lecturas
externas quedaron Tool execution interrupted; no inferir fallo de permisos o causa
distinta. No permisos pendientes ni sesión activa observada, bandeja vacía antes
de reanudar. No entrega/commit confirmados; el inicio no equivale a tarea terminada.

Reanudada la MISMA unidad en sesión existente, queue/resume=true admitido, con
requisitos y precisiones de padre íntegros en mensaje para no depender de lecturas
externas. Sin ampliar permisos, crear sesiones/subagentes o duplicar asignación.
Conservar parcial, informar bloqueos; límites documentales/CP1/dispositivos intactos.
Resultado pendiente, no nueva tarea padre/QR02 o implementación autorizada.

### HIJO-C04 revisada y HIJO-C05 asignada — 2026-10-12

Propietario informa cierre; HEAD hijo confirmado 4636d30. Relevo y diseño completos
revisados en lectura: incorpora PIN 5–10/pregunta personalizada, tiempo elegido,
todas apps, permisos de ambas fuentes offline, autoridad RAM separada y reset
solo cambia código. Sin implementación/tests/builds/versión/puertas aprobadas.
Normalización/límites/esperas agregadas/KDF, caducidad/reset/revocación, rango/
LOCK_FOR, olvido doble y migración son propuestas pendientes, no decisiones nuevas.

Antes de fijar contrato se prioriza viabilidad del requisito de todas las apps
normales y retorno real a bloqueo. HIJO-C05 documental enviada a sesión existente
hijo, esquema API y ruta/bandeja vacía comprobados, queue/resume=true admitido.
Sin resultados aún. Usar fuentes oficiales Android, inspección propia en lectura
y matriz de garantías/límites: Lock Task/HOME/DevicePolicyManager, suspensión y
excepciones, apps nuevas/visibilidad/escapes, timer/Doze/proceso/boot/emergencia.

No convertir lista técnica en lista parental ni lockNow en bloqueo continuo;
si no se puede cumplir, devolver incompatibilidad/alternativas sin cambiar requisito.
No APIs privadas/accesibilidad/overlays como atajo o garantías físicas por documentos.
Proponer prototipo/pruebas futuras sin ejecutarlos. Solo documento/relevo/ESTADO y
commit hijo, sin código/tests/builds/plan/ADR/CP1/fixtures/dispositivos/ADB/LAN/
despliegue o nuevas tareas padre/QR02. Sin cerrar H05 o autorizar H06/versionado.

### HIJO-C05 revisada y precisiones/avisos nuevos — 2026-10-12

HEAD hijo confirmado 94b1bbe; leído informe VIABILIDAD_ANDROID_TODAS_APPS.md
completo y relevo. Viabilidad condicionada documental, no pruebas físicas.
Android no aporta lease de política con expiración autónoma independiente del
controlador; candidato HOME/Lock Task/catálogo técnico requiere probar timers/
Doze/crash/boot/emergencia/escapes. No inviolabilidad ni cumplimiento certificados.

Propietario acepta HOME propio y exige instalar/actualizar durante desbloqueo,
proteger Ajustes/admin/desinstalación hijo. Corrige expresamente «sí evaluar sin
garantizar»: hacer bloqueo lo más resistente posible y corregir fallos iterativos,
no aceptar ventanas/fallos conocidos como producto terminado ni autorizar teléfonos.
Solicita avisos de tiempo agotado, uso actual, total diario y falta de internet/
conexión. Detalle decisiones y límites §§11–12 propuesta central; sin recopilar
apps/contenido/ubicación o historial de uso por aplicación. No secretos en relay.

HIJO-C06 documental enviada/admitida queue/resume=true, esquema API y ruta de
sesión raíz/bandeja vacía comprobados. Consolidar arquitectura con instalación
libre y mínima medición local/avisos: fuentes oficiales/precisión/permisos, tiempo
autorizado distinto de uso observado; conexión no prueba interacción. Sin datos,
mostrar desconocido, no cero o «sin internet» inventados. WSS no es push fiable
con app cerrada; sin red no aviso remoto inmediato. Aviso no reemplaza enforcement.
Agregado offline del día/horario/cambio de reloj/proceso/sync/retención por proponer,
sin estado de uso/historial en servidor o servicio externo nuevo unilateral.

Entregar documento incremental, riesgos/elecciones breves y próxima implementación
aislada propuesta, no ejecutar. Sin código/tests/builds/CP1/fixtures/plan/ADR
aceptados editados, permisos de uso reales/políticas/dispositivos/ADB/LAN/despliegue
o nueva tarea padre/QR02. Sin subagentes/sesiones/promoción H05/H06 o versión nueva.
Resultado pendiente; revisar deltas de privacidad/contrato antes de implementación.

### HIJO-C06 revisada y laboratorio HIJO-L02 enviado — 2026-10-12

Relevo e informe ARQUITECTURA_BLOQUEO_Y_SENALES_MINIMAS.md completos revisados,
HEAD ae1c7eb confirmado. C06 solo documental. Indica proxy interactivo/Keyguard
distinto de humano usando; interacción reciente requiere acceso especial y API34
puede entregar más datos por paquete. Fuente/métrica/permisos no elegidos. Total
estimado/subtotal parcial distinto de tiempo autorizado, día/zona/retención y
marcador único aún propuestas. WSS sin app padre viva/red no garantiza notificación.
No contrato/versión/H05/puertas aprobados o datos de uso reales recopilados.

Propietario solicita continuar; HIJO-L02 asignada en sesión existente: componente
solo sourceSet test JVM, fuera APK/main/androidTest, con intervalos FICTICIAS_JVM
explícitos, suma/subtotal/calidad y snapshots absolutos diagnósticos. Políticas de
ventana inyectadas, no fijar día/zona/métrica/permisos de producto. Sin marcador
durable o historial/intervalos reales. Testear duplicación/solapamiento/atrasos/
overflow, boot/proceso/huecos, commit/readback inciertos, límites 23/25h/salto de
ventana y snapshots viejos; nunca llenar gap por tiempo permitido o afirmar uso
humano/Android probado. Build/sourceSet test mínimo y pruebas JVM pertinentes.

API/esquema/ruta raíz/bandeja vacía comprobados; queue/resume=true admitido, no
resultado confirmado. Código/tests aislados y evidencia/relevo/ESTADO/commit hijo;
sin dependencias nuevas, producción/UI/IO real/protocolo/planes/fixtures/puertas,
dispositivos/ADB/LAN/notificaciones/WSS/push/despliegue o tarea padre/QR02. Detener
si exige semántica pendiente antes de ampliar; no otra tarea automática/subagentes.

### HIJO-L02 revisada y cambio de prioridad/métrica

HEAD hijo c6e8d5d confirmado, código/tests/evidencia íntegros revisados. 22 tests
nuevos/199 debug ejecutados correctos reportados; núcleo 169 UP-TO-DATE. Primer
fallo de expectativa documentado; exclusión main/JAR debug reportada, no APK real
nuevo o pruebas reejecutadas aquí. Modelo solo FICTICIAS_JVM, sin integración.

Preguntas sobre uso/retención/push interrumpidas sin respuesta. Propietario después
pospone revisión de escapes y define uso como tiempo concedido/pantalla desbloqueada,
no detector humano. Diseñar tiempo permitido/consumido desde aceptación vigente,
sin UsageStats/historial apps por esa métrica, ni sumar duration solicitada entera.
Mantener protección básica/recuperación/emergencia y errores; revisión pospuesta
no certificado inviolable, guardas eliminadas o permiso físico. Detalle §15 central.
Tratamiento Keyguard/pantalla apagada, día/retención y padre cerrado/push pendientes.
Aviso informativo hijo admitido queue/resume=false sin nueva ejecución/tarea para no integrar antes
de versión/contrato o convertir laboratorio en telemetría productiva.

## 1. Fuentes y situación comprobada

| Proyecto | Revisión consultada | Estado |
|---|---|---|
| Padre | HEAD 8f0aa33; implementación P08-B 77c2b10 | Políticas integradas en JVM con relay real e hijo simulado; vínculo de producción sigue PREPARADO |
| Hijo | HEAD 3f160c4; base de relevo 524ad8b | H05 en curso; sin CHILD_OFFER/PAIR_ACCEPT operativos, cliente WSS ni enforcement completo |
| Relay | ce59ef6 antes de este cierre documental | R01–R03 locales, WSS efímero y cruce padre JVM; health 503/producción bloqueada |

Fuentes padre: COORDINACION_PROYECTOS.md, ESTADO.md y pruebas/EVIDENCIA_P08_B.md.
Fuentes hijo: COORDINACION_PADRE_HIJO_RENDER.md, AGENTS.md, ESTADO.md,
INTEGRACION_FUTURA.md y dependencias de hijo/PLAN_HIJO.md.
Fuentes relay: AGENTS.md, ESTADO.md, README y documentacion/INTEGRACION_LOCAL_PADRE.md.
Leer nuevamente estas fuentes al recibir un resultado: este snapshot no es estado vivo.

El padre reporta 146 pruebas independientes más una integración opcional, cadencia
PING corregida a 15 s y caducidad de 45 s. P08-B cubre ControlPoliticas/ParentStore,
reintentos idénticos y reconciliación. El hijo reporta 329 resultados JVM y 23
Android anteriores, con recuperación operativa todavía pendiente. Son evidencias
de sus proyectos, **no pruebas reejecutadas por el coordinador**.
No existe comunicación entre las dos APK demostrada; un hijo simulado no la sustituye.

## 2. Compatibilidad revalidada en lectura

SHA-256 idénticos en los tres repositorios en este turno:

| Archivo | Hash |
|---|---|
| compartido/00_CONTRATO_V1.md | deee863f7587736d3e209f5a11a6e972a93004d0700c47eb3a2d136ad8f16a3c |
| compartido/protocolo.schema.json | eccf964fbb41869c47d86ddb0bfda6585136430bab297568d3c20b56607372bb |
| pruebas/vectores_crypto.json | 626b935f272aa4f7028fcb00c7640dceff2828418966e950a72f5590effe45e3 |

También 29 archivos de compartido/ejemplos idénticos por inventario y bytes.
Comparación documental, no prueba criptográfica nueva. Repetir antes de cada cruce.
Cualquier diferencia de esquema/firmas/semántica bloquea integración: acordar
versión nueva y cambios coordinados; no adaptar el relay unilateralmente.

## 3. Unidades por proyecto — handoffs admitidos por API

Estado actual: HIJO-C01 terminado en d350bf6 y PADRE-C01 en 0e7b5db, ambos
diseños documentales sin pruebas nuevas o aceptación física. Revisados sus
relevos y padre/DISENO_ACREDITACION_VINCULO.md en lectura. Propietario autoriza
ahora H05-L01 del hijo con pruebas/commit propios, sin ADB. Handoff admitido por
API con queue/resume=true y posteriormente terminado en c7fb842: coordinador
OFFLINE aislado, 17 tests nuevos y 346 resultados JVM reportados por el hijo.
No reejecutados aquí ni evidencia Android nueva. H05 sigue abierta.
HIJO-C02 terminado en cb62a73: puertas A/B/C1/C2 y resumen público propuestos,
sin alterar plan/contrato o activar producción. Revisado su diseño en lectura.
PADRE-C01-R1 terminado en 95dfd02: resumen/formato/estatus/errores y declaraciones
compatibles como propuesta. Revisión documental, sin pruebas nuevas. Propietario
autoriza PADRE-C02 puro con pruebas/commit propios y sin ADB; handoff admitido
con queue/resume=true y posteriormente terminado en 8a6ae91: 21 tests nuevos,
167 independientes reportados por padre; diagnóstico solo sourceSet JVM test,
fuera de APK. Incidencia QR sintética previa pendiente, no corregida por rerun.
PADRE-QR01 terminó en a8e4ffc: detector QR falla con contenido reproducible,
sin corrección productiva; PADRE-QR02 no asignada. No promoción productiva por
el acuerdo/validador; puertas/orden del hijo siguen pendientes.
No duplicar tareas ya hechas ni descartar trabajo ajeno.

### H05-L01 — terminada al alcance aislado

Resultado revisado: c7fb842, relevo/ESTADO y CoordinadorOffline.kt en lectura.
17 tests nuevos; hijo reporta 346 resultados núcleo+debug correctos y release
170 casos repetidos correctos, no sumados como independientes. Cancelación,
trabajos tardíos, espera/consumo duradero y vigencia probados con archivo/contexto/
reloj simulados y crypto/QR reales. Sin cámara/lifecycle/Keystore/herramientas
reales ni nuevas pruebas físicas. Proyección sin actualización no es autoridad:
la respuesta vuelve a comprobar contexto/firma en RecoveryController.

Alcance: coordinador de presentación OFFLINE en proyección RAM, integrando
QrOffline/RecoveryController con identidad, estado, reloj/contexto y ejecutor
inyectados. Sin alias/vínculo reales, Android Keystore/cámara, herramientas,
dispositivos, WSS ni cableado de UI/permisos de producción. Solo build/tests JVM
necesarios en el repo hijo y commits propios según sus instrucciones.

Aceptación: bytes QR solo entran por controlador; sesión limitada requiere firma
y contexto correctos; cancelación/fondo, nueva generación, expiración o respuesta
tardía invalidan trabajos/desafíos/permisos. Consumo impreso durable antes de
sesión, sin devolver códigos gastados al cancelar; espera persistida y respuesta
OFFLINE válida independientes. Emergencia accesible; nada de ALLOWED/APPLIED,
wipe o Ajustes libres. Pruebas de pausa/cancelación en firma/IO, respuesta vieja,
RAM recreada, boot/reloj discontinuos, fronteras de vigencia, escritura fallida
y consumo sin devolución, contrastadas con tests existentes.

H05 permanece abierta y H06/H08/H10/H11 no se activan por este paso. No aprobada
todavía la separación de puertas de H05 propuesta por el hijo: tampoco cambios
de dependencias, CP/1 o ceremonia física/migración del padre. Si la unidad exige
esas decisiones, detener y reportar bloqueo. Entregar archivos, comandos/tests
realmente ejecutados, alcance y limitaciones, commit y siguiente unidad propuesta
en su coordinación/ESTADO; el coordinador revisará antes de asignar más trabajo.

### HIJO-C02 — propuesta documental terminada

Resultado revisado: cb62a73, hijo/DISENO_PUERTAS_Y_RESUMEN_PUBLICO.md.
Matriz propuesta A (aislado), B (evidencia local previa a vínculo), C1 (recuperación
real antes de endurecer), C2 (acreditación integral presencial con STATE/WSS).
B no habilita H08 en el plan actual; C1 no se sustituye por C2 ni espera WSS
para probar salida local. H06 nunca por JVM; repetir recuperación/emergencia
bajo restricciones después de cualquier endurecimiento autorizado. División y
cambio de orden pendientes de decisión: no cambiados PLAN_HIJO ni CP/1.

Resumen propuesto: pairId completo, SHA-256 SPKI DER de ambas públicas P-256,
64 hex mayúsculos en 16 grupos de cuatro y origen HTTPS exacto, desde snapshot
persistido íntegro/readback. Formato cotejado en lectura con PreparacionVinculo.huella
del padre, no con datos reales. Texto de commit local con acreditación pendiente;
legados sin procedencia, corrupción/identidad perdida no fabrican confirmación.
Sin pruebas/builds nuevos en HIJO-C02. Propuesta no es funcionalidad H08 implementada.

La unidad documental se asignó a la sesión existente del hijo con queue/resume=true,
bandeja vacía antes del envío y admisión confirmada. Su resultado está revisado
arriba; la asignación no autorizó implementación ni cambio de plan.

Entregables: matriz de garantías aisladas ya probadas, puerta local previa a
identidad/vinculación y acreditación operativa integral, con evidencia exigida y
dependencias/bloqueos; mínimas unidades pendientes antes de proponer revisión de
dependencias. H06/enforcement nunca se habilita por una etiqueta parcial o JVM.
H05 permanece abierta; la división propuesta requiere revisión/acuerdo explícitos.

Especificar resumen público post-commit H08 basado en estado persistido íntegro:
pairId, huellas comparables de ambas públicas y origen HTTPS exacto; distinguir
oferta/captura/commit confirmado de acreditación operativa. Reapertura sin cambiar
claves/revincular, errores/crash/corrupción/identidad perdida y ausencia de secretos
o hashes de recuperación en ese resumen. CP/1 §5 exige comparación presencial;
no recibos remotos inventados ni STATE como prueba de PAIR_ACCEPT exacto/consumo.

Leer diseño del padre en su ruta explícita, sin editarlo. Devolver propuesta de
pruebas futuras y acuerdo a revisar por padre antes de PADRE-C02, con coordinación,
ESTADO y commit propios. Sin código/tests/build nuevos, UI/dispositivos/ADB,
cambios CP/1, permisos, LAN o despliegue. El coordinador revisará/trasladará y
pedirá decisión antes de activar nuevas puertas; no bucles entre agentes.

### PADRE-C01-R1 — acuerdo público revisado

Resultado revisado: 95dfd02, diseño padre §7 y relevo. Sin corrección de formato
necesaria al hijo. Commit local confirmado no significa vínculo operativo; solo
comparación presencial del resumen público y declaraciones separadas de firmas.
El padre acepta correspondencia A/B/C1/C2 como propuesta, no modificación del
plan ni habilitación de H06/H08. Sin tests/builds o evidencia física nuevos.

Unidad documental al padre, sesión existente/ruta exacta y bandeja vacía antes
del envío. queue/resume=true y admisión confirmada; resultado revisado arriba.
Revisar diseño hijo cb62a73 contra PADRE-C01: acuerdo explícito o correcciones
de formato/estatus/errores, declaraciones presenciales frente a firmas y límites
de la matriz de puertas. Hash privado PAIR del padre no se convierte en recibo
remoto exigido al hijo; no se añaden campos/mensajes CP/1 o prueba automática.

Acotar inputs/supuestos/negativos del futuro PADRE-C02 puro, sin implementarlo.
Documentos propios y commit; sin tests/builds/código nuevo, migración/promoción,
órdenes/UI, cambio de plan/contrato, dispositivos/ADB, LAN o despliegue. No otra
tarea hijo hasta revisar acuerdo y presentar decisión de puertas/orden necesaria.

### PADRE-C02 — terminado como diagnóstico JVM aislado

Resultado revisado: 8a6ae91, pruebas/EVIDENCIA_PADRE_C02.md, relevo/ESTADO,
RevisionVinculo.kt y configuración de sourceSet en lectura. Código solo en
src/revisionAislada/kotlin incluido por test JVM, no main/androidTest/APK.
Entradas defensivas, sobres re-verificados PAIR/MESSAGE/OFFLINE con claves
vinculadas y contexto explícito; COHERENTE solo CONSISTENCIA_FICTICIA, sin
token/promoción o llamador productivo. No auditoría física ni pruebas reejecutadas aquí.

Padre reporta 21 tests nuevos y suite final 167 independientes (131 app, 30
núcleo, 1 interop y 5 Node), 78 comprobaciones documentales correctas. Primera
suite tuvo un NotFoundException en QR sintético P07 previo; focalizada y suite
posteriores pasaron. Causa sin identificar, test no cambiado; no declararlo
corregido. Repetición exitosa no borra la incidencia ni acredita QR/cámara reales.

Propietario autoriza la propuesta explícita de validador puro y pruebas JVM,
con commits propios y sin ADB. Confirmada sesión raíz padre por ruta exacta y
bandeja vacía antes de envío; queue/resume=true admitido. Resultado descrito arriba.

Implementar aislado según diseño padre §7: entradas inmutables/defensivas de
snapshot PREPARADO/aceptación PAIR verificable, revisión/generación/hash privado,
resumen observado, STATE/contexto verificados, MAINTENANCE OFFLINE/observaciones
y señales locales explícitas. Firmas/clave/purpose mediante codec/crypto CP/1,
nunca payload/booleano como prueba criptográfica. Sin Android/IO/red/reloj oculto,
UI, migración/escritura, promoción, órdenes, recibos o token de autorización.

Solo diagnóstico coherente/incompleta/rechazada y causa sin datos sensibles;
entrada igual produce salida igual, sin mutarla. Obligaciones del llamador sobre
autoridad en vivo/Keystore/contexto y veracidad de observaciones documentadas;
tests positivos ficticios etiquetados no habilitan ruta productiva o transición.
Negativos del diseño para datos/snapshot/aceptación/resumen, falta de observación,
STATE/contexto ajeno/viejo, acción indebida, boot/generación/cancelación/autoridad,
canal/fondo y reloj vencido/discontinuo. Frescura desde solicitud, no recepción.

Pruebas/verificación local JVM necesarias y commit propio, sin ADB/instrumentación,
dispositivos, pruebas de migración/IO/commit, otros repos, CP/1 nuevo o cambio del
plan hijo. Si exige más alcance, detener/devolver bloqueo. Registrar resultados
reales y próxima unidad en coordinación/ESTADO; esperar revisión posterior.

### PADRE-QR01 — diagnóstico QR sintético, enviado

Una unidad local al padre, continuación autorizada de coordinación; sesión raíz
por ruta exacta y bandeja vacía antes de envío. queue/resume=true admitido,
sin resultados aún. Diagnosticar NotFoundException de OfflineChallengeSignerTest
en el roundtrip de ambos QR, con presupuesto acotado de casos/repeticiones y
registro de todos los resultados, no repetir indefinidamente hasta verde.

Separar generación/contenido/firma variable, versión/máscara, margen/escala,
lector sintético y orden/suite; preservar bytes y verificación CP/1 reales. Solo
si causa reproducible está en imagen/soporte de TEST: regresión y corrección
mínima de test permitidas. No retries/ignorar errores/quitar aserciones como
solución. Si requiere cambiar QR/lector productivos, dependencias, cámara o
semántica, detener/devolver propuesta sin hacerlo. Si no reproduce, declarar
límites y causa pendiente, no falsa corrección.

Build/tests JVM pertinentes, evidencia/coordinación/ESTADO y commit propios;
sin fuentes productivas/PADRE-C02/promoción/UI, dispositivos/ADB, otros repos,
CP/1/plan, certificados/LAN, push/despliegue. Hijo sin nueva asignación ni cierre
H05. Decisión de puertas/orden se presentará separada del diagnóstico de calidad.

### HIJO-C01 — propuesta acotada de identidad/oferta y dependencia con H05

Resultado revisado: d350bf6. Diseño terminado; detectado ciclo funcional entre
recuperación operativa H05 e identidad/H08/herramientas H11, no ciclo explícito
del grafo. Identidad/oferta productiva detenida. Propuesta de separar puerta
aislada de acreditación integral pendiente de acuerdo, sin alterar plan/contrato.

Prioridad bloqueante para conectividad. Entregar a la IA del hijo:

> Lee tus instrucciones, estado, COORDINACION_PADRE_HIJO_RENDER.md y el documento
> central de parental_render. Trabaja una unidad de coordinación/diseño: delimita
> identidad no exportable y CHILD_OFFER inicial, separadas de recuperación OFFLINE,
> aceptación/commit y WSS. Explica cómo se completa H05 respetando las dependencias
> de H08; no declares H05 cerrado ni empieces H06/H08/H10 para facilitar conexión.
> Propón la siguiente unidad local permitida, puertos y pruebas de oferta/consumo/
> cancelación/boot/vigencia de cinco minutos, sin timestamp CP/1 inventado. Si existe
> una dependencia circular, registra propuesta y detén esa vía sin cambiar el plan
> o contrato unilateralmente. Sin ADB, nuevos permisos físicos o cambios externos.
> Devuelve bloqueo, tarea propuesta, evidencia y commit en tu archivo de coordinación.

Aceptación de esta unidad: propuesta concreta que preserve emergencia, consumo
duradero y límites, con dependencias explícitas. No exige generar una identidad
operativa ni mostrar un QR real. Tras revisión se asignará una sola implementación
del plan del hijo. H08 depende de H05; H10 requiere H07/H08/H09/R03: no saltarlos.

### PADRE-C01 — diseño de acreditación de vínculo operativo

Resultado revisado: 0e7b5db, padre/DISENO_ACREDITACION_VINCULO.md. Ceremonia
presencial propuesta bajo CP/1; STATE no acredita PAIR_ACCEPT exacto y respuesta
OFFLINE no prueba consumo/aplicación. Sin recibos automáticos inventados ni
promoción PREPARADO. Si se requiere acreditación remota criptográfica completa,
proponer versión acordada antes de implementar. Validador puro PADRE-C02 propuesto,
no activado; ceremonia/migración/operaciones físicas y sus dependencias pendientes.

Entregar a la IA del padre después de fijar el alcance de la siguiente unidad:

> Lee COORDINACION_PROYECTOS.md de tu repo y la coordinación central del relay.
> Diseña una unidad acotada de acreditación PREPARADO → VINCULADO bajo CP/1 §5:
> identificar evidencias de aceptación del hijo, estado firmado correlacionado y
> recuperación presencial, autoridad/confirmación del adulto y persistencia atómica.
> Documenta qué puede comprobar el software y qué necesita evidencia física.
> No promociones vínculos por STATE, presencia o tests; no añadas mensajes nuevos,
> habilites órdenes o cambies CP/1. Si necesitas semántica nueva, entrega propuesta
> de versión y detén implementación. Sin ADB ni cambios de hijo/relay. Devuelve
> criterio de aceptación y pruebas negativas propuestas en tu coordinación.

No usar un booleano de Device Owner enviado por un simulador como acreditación
física. VINCULADO de P08-B está aislado en tests y no resuelve esta puerta.

### RELAY-C01 — cobertura JVM local completada, no aceptación física

Ampliar pruebas locales integradas con padre JVM para reinicio real del relay y
ACK totalmente perdido hasta agotar reintentos, sin cola/reproducción y sin APPLIED
ficticio. P08-B no ejecutó esos dos escenarios. No editar su harness desde aquí;
acordar el reparto con su IA o usar un driver propio del relay. No se implementó
ni ejecutó esta ampliación en el turno documental inicial.

Avance posterior: test:padre:fallos prueba RelayConnection JVM con ACK omitido
por el hijo simulado, cierre 1012, recreación del servidor WSS en el mismo puerto,
reautenticación/ticket nuevo, rechazo de ticket antiguo y SYNC/STATE nuevos sin
replay. Se recrea la instancia en el mismo proceso Node; **no reinicio de proceso**.
ControlPoliticas/ParentStore no intervienen en este driver: siguen pendientes
agotamiento real de sus reintentos y persistencia/reconciliación.
No cerrar RELAY-C01 completo por esta prueba de red.

Avance siguiente: test:padre:proceso arranca relay Node independiente en loopback,
lo termina abruptamente tras la orden sin ACK, comprueba su salida/cierre 1006 y
arranca otro PID en el mismo puerto. RelayConnection JVM reautentica, invalida
ticket viejo y sincroniza con sesión nueva sin replay. Variante ejecutada dos
veces, incluida una tras pnpm run verificar (104 tests correctos). Reinicio de
proceso relay local demostrado; no del padre/Android ni infraestructura Render.
Las tres variantes JVM pasaron. Pendiente de RELAY-C01: agotamiento de reintentos
y reconciliación con ControlPoliticas/ParentStore reales, sin editar el padre.

Avance posterior: test:padre:politicas cubre esa pérdida lógica por omisión de ACK
con ControlPoliticas/ParentStore/CifradoMetadatos compilados reales del padre y
driver propio en relay. Tres envíos iguales (original + dos reintentos), registro
ENVIADA_SIN_CONFIRMAR antes de cada envío y SYNC nuevo al agotar reintentos.
STATE con hash ajeno conserva pendiente; correlación correcta deja aplicación
pendiente. Reapertura cifrada en RAM y nuevo control no reproducen la orden:
STATE de sesión nueva con id/seq/hash correcto resuelve fallo simulado, sin APPLIED.
Reloj de políticas controlado; transporte WSS real. VINCULADO/Device Owner solo
ficticios en laboratorio, sin acreditación física ni cambios en el padre.
Coberturas locales ampliadas por variantes separadas; pendientes combinación de
restart con ControlPoliticas, pérdida en tránsito de un ACK realmente emitido y
persistencia/reinicio físicos del padre. No declarar integración móvil completa.

Avance combinado: test:padre:politicas:proceso probado con clases padre reales y
relay en proceso independiente. Tras agotar reintentos y persistir aplicación
pendiente, reinicio abrupto/cierre 1006/nuevo PID, health 503 conservado y nueva
autenticación. Ticket/contexto anteriores invalidados sin borrar ni enviar la
orden incierta. Reapertura cifrada RAM y STATE nuevo correlacionado resuelven
fallo simulado; contador 1 y solo tres envíos. Cinco variantes JVM y 104 tests
aprobados. Cubierta la combinación restart/políticas al alcance de laboratorio.
Quedan pérdida de ACK emitido en tránsito y persistencia/reinicio físicos del
padre; ninguna evidencia de APK hijo, vínculo operativo o restricciones reales.
Siguiente prioridad entre proyectos sigue siendo HIJO-C01/H05 y PADRE-C01,
handoffs preparados sin canal automático ni modificaciones a sus repositorios.

Cierre de cobertura local: test:padre:ack-perdido usa proxy WSS efímero solo
loopback, TLS/hostname y AUTH del relay intactos. Hijo emite tres ACK firmados;
relay los retransmite byte a byte y proxy los descarta antes del padre. Dos
reintentos exactos, pendiente conservado y reconciliación STATE probados con
ControlPoliticas/ParentStore reales compilados. Seis variantes JVM y 104 tests
correctos. Pérdida de ACK emitido cubierta por inyección selectiva en laboratorio.
RELAY-C01 local completada al alcance definido; no sustituye evidencia del hijo
real, almacenamiento/reinicio Android, aceptación física o despliegue Render.
No seguir ampliando simulaciones para aparentar avance móvil: activar handoffs
HIJO-C01 y PADRE-C01 desde sus sesiones y releer resultados antes del siguiente
cruce. Propietario debe entregarles el documento central; no existe envío automático.

## 4. Secuencia de puertas

1. Revisar propuesta hijo/H05 y diseño de acreditación padre, una unidad por turno.
2. Completar dependencias locales por sus IAs, con commits/tests y sin endurecer
   antes de emergencia/recuperación. Separar oferta, aceptación, WSS y enforcement.
3. Preparar cruce JVM con código real del hijo cuando esté disponible; mientras
   tanto todo STATE/ACK del hijo ficticio queda etiquetado como simulación.
4. Acordar hostname/origen, certificado, confianza Android, ruta y exposición
   local. Configuración pública debe coincidir con la aceptación firmada.
5. Pedir autorización específica de instalación/pruebas por proyecto y dispositivo;
   después QR ida/vuelta → aceptación/recuperación → exportación pública → AUTH/PONG
   → SYNC/STATE → orden/ACK → cortes/reinicio/reconexión. No APPLIED por reenvío.
6. Revisar puertas de aceptación física; solo entonces solicitar despliegue Render.
   No se aprueba G0–G4 por compilación ni por pruebas JVM.

## 5. TLS/red local — propuesta, no configuración aprobada

Hoy solo hay WSS loopback efímero con certificado de test confiado por el cliente
JVM aislado. No sirve directamente a teléfonos: 127.0.0.1 apunta al propio equipo.
Para APK se propone un hostname controlado por el propietario y certificado de
CA confiable para ambos Android, con ruta local/proxy TLS explícitamente autorizada
hacia el relay. Primero confirmar disponibilidad de DNS/certificado, alcance de
red y restricciones de las apps. No se eligió hostname/puerto ni se abrió listener.
Una CA de laboratorio requeriría acuerdo de confianza de cada app y permiso del
propietario; no instalarla ni modificar release para aceptar certificados de tests.
Nunca trustAll, bypass de hostname, HTTP/WS de producción o túnel público improvisado.

## 6. Permisos por sesión y operaciones prohibidas

El hijo registra autorización histórica del A13 en su sesión; padre/Render
excluyen A13. No trasladar esa autorización entre proyectos ni considerarla permiso
nuevo. Render no opera dispositivos. Cualquier prueba física se ejecutará desde
la sesión del rol con aviso, autorización específica y selector explícito; ante
conflicto/ambigüedad, detener y consultar al propietario. No ADB genérico, reset,
aprovisionamiento, borrado, cambio de credenciales ni retiro por este relevo.
La coordinación tampoco autoriza lanzar subagentes o editar repos ajenos.

### Disponibilidad comunicada por el propietario

El propietario confirmó el regreso del A56: vuelve disponible para coordinar
pruebas desde el proyecto padre. Su disponibilidad no inicia instalaciones/ADB:
definir la prueba concreta y avisar antes de cualquier operación física. El retiro
temporal anterior queda como evidencia histórica en ESTADO.md.
El A13 queda disponible para coordinar el trabajo desde la sesión del hijo.
Render mantiene su prohibición de operar dispositivos y no ejecuta ADB.
No se infiere permiso para reset, aprovisionamiento, borrado, RETIRE, instalación
de CA, quiosco o restricciones nuevas. Antes de una operación física, la IA del
hijo debe delimitar la prueba, comprobar dependencias y comunicar su alcance.

Handoff adicional preparado para la IA del hijo, aún no enviado:

> A56 nuevamente disponible para el padre; no consultarlo desde el hijo. A13 disponible
> para avanzar en tu proyecto. Continúa la unidad HIJO-C01 de coordinación local
> respetando H05 y prepara la siguiente comprobación acotada de recuperación/
> emergencia que permita tu estado actual. Devuelve objetivo, precondiciones,
> operaciones necesarias y criterio de aceptación antes de una prueba física.
> No saltar H05 para endurecer ni cambiar datos/identidad/credenciales. Si hace
> falta instalar o alterar el teléfono, avisa del alcance concreto antes de actuar.
> Solo tu sesión opera el A13 con selector explícito; Render no ejecutará ADB.

## 7. Cómo devolver resultados y activar una tarea

Un handoff sin envío figura como **preparado**. Una admisión API acredita
**enviado/admitido**, no lectura, tarea iniciada o terminada. No existe canal automático entre
sesiones configurado en el proyecto. OpenCode V2 permite comunicación explícita
por su API local: descubrir la sesión por ruta exacta y enviar a su bandeja con
delivery=queue/resume=false permite informar sin reanudar ni interrumpir ejecución.
Una entrada admitida en bandeja no demuestra lectura o trabajo iniciado. Activar
la sesión/tarea requiere acuerdo explícito; no crea subagentes ni traslada permisos.
Las IAs actualizan solo su archivo de coordinación y ESTADO.md, con:

- Tarea única, HEAD/commit de implementación y dependencias todavía abiertas.
- Comandos realmente ejecutados, resultado y alcance JVM/Android/simulado/físico.
- Archivos públicos comparados, incompatibilidades y propuesta CP/1 si existe.
- Endpoint/TLS únicamente si están acordados; permiso concreto si hubo dispositivos.
- Siguiente unidad solicitada y bloqueos; sin privadas, códigos, series o credenciales.

El coordinador relee ambos relevos, registra aquí y en ESTADO.md la decisión y
prepara el siguiente handoff. No modificar retrospectivamente evidencias históricas.

### Primer aviso por API a la sesión existente del hijo

Por petición del propietario se comprobó el servicio local OpenCode y su OpenAPI.
Identificada una única sesión raíz con ubicación exacta parental_hijo. Enviado
informe del relay 8385410, seis variantes JVM/104 tests, límites y próxima propuesta
HIJO-C01. Entrada confirmada en bandeja con queue/resume=false: **aviso en cola**,
no lectura confirmada, ejecución iniciada ni autorización física nueva.
Se corrigió la codificación de un primer aviso cancelando solo esa entrada propia
y enviando su reemplazo UTF-8; queda un aviso válido, no dos tareas duplicadas.
No se crearon sesiones, subagentes ni se reanudó/interrumpió la IA del hijo.
El padre no recibió aviso en ese primer turno. No se editaron apps ni se inspeccionaron
historiales de conversación o credenciales; solo metadatos de la sesión objetivo.

### Coordinación directa autorizada y primeras unidades enviadas

Propietario solicita avanzar coordinándose directamente con padre/hijo y confirma
que aceptó el aviso del hijo. Comprobada una única sesión raíz del padre por
ruta exacta y las bandejas de ambas sesiones vacías antes del envío. No se leyó
historial de conversaciones ni se alteraron sesiones, modelos o permisos.

Enviados HIJO-C01 y PADRE-C01 a las sesiones existentes con queue/resume=true:
API confirma admisión y se solicita ejecución sin interrumpir trabajos activos.
Alcance solo diseño/documentación propia, una unidad por IA, commits propios y
devolución en sus archivos de coordinación/ESTADO. Prohibidas nuevas operaciones
físicas, código productivo, cambios CP/1, apps ajenas, push o despliegue por estos
mensajes. No se crearon sesiones/subagentes ni se concedieron permisos de herramientas.

No montar bucle de mensajes entre IAs: resultados en documentos/respuesta del rol;
el coordinador revisa y decide siguiente unidad. Si ya está hecha, devolver commit;
si hay tarea incompatible, preservar trabajo y reportar bloqueo. No activar la
siguiente implementación hasta revisar propuesta, dependencias y aceptación.
Sin resultados confirmados todavía; ninguna unidad se declara cerrada por el envío.
