# CP/2 separado — primera unidad de vinculación local

## STATE piloto E2E01

`state-piloto.schema.json` es una versión parcial separada de CP1 y del futuro
historial completo. Fuente STATE compartida íntegra a ambas apps para el piloto:
20 campos STATE, reto5, effective11 y lastRemote9. permittedTime y lastExpiry
son null obligatorios: datos no disponibles, no totales cero. No es congelación
del contrato completo ni cancelación de historia/avisos. effective.reason admite
NETWORK_LOST para revocación NORMAL/red10s posterior al draft; WSS no sustituye
validación Android. Firma MESSAGE por CHILD con pública esperada externa.

El codec complementa schema con coherencia temporal/revisión/resultado, contadores
64 exactos, reto30s y duración temporal entera de1..1440min. No valida efectos del
dispositivo ni freshness del padre: esas decisiones corresponden a cada app.

2026-10-14. **CP2-V01 implementada y probada localmente, no perfil público ni
ceremonia operativa.** CP/1 en `compartido/` sigue congelado; ningún cliente o
socket del relay usa esta unidad automáticamente.

## Fuente y alcance

Base: PADRE-C04-R1 `75eb56e`, §§2–3 y 10.1, gate HIJO-C08 `3cc206e` apto para
generar contrato separado y autorización del propietario registrada en coordinación.
Implementación limitada a campos estables de oferta/aceptación y su sobre PAIR.
Reglas posteriores NORMAL/red10s, excepción offline y DNS/VPN canceladas no se
modelan aquí; deben incorporarse a órdenes/STATE antes de integrar esas partes.
No se ha congelado CP/2 completo ni aprobado migración móvil por esta entrega.

- `vinculacion.schema.json`: JSON Schema 2020-12 con tres objetos cerrados.
- `CHILD_OFFER`: v=2, kind, protocol=cp.v2, childPublicKeyB64, enrollId, enrollNonce.
- `PAIR_ACCEPT`: v=2, kind, protocol=cp.v2, pairId, enrollId, enrollNonce,
  parentPublicKeyB64, childPublicKeyB64, relayOrigin y recoveryHashes cerrado con
  MAINTENANCE/RECOVER_PARENT/RETIRE. No código maestro/pregunta/respuesta en QR.
- Sobre PAIR: exactamente kind=SIGNED, payloadB64, purpose=PAIR, sigB64, v=2.
  No lleva protocol adicional: el perfil está en el payload conforme §2.

OFFLINE/MESSAGE/STATE, transporte WSS, recuperación/migración e historial
no están implementados en este esquema parcial. No enviar PAIR por el relay.
Oferta y firma correctas no bastan para promover vínculo PREPARADO.

## Validación y criptografía

DTOs separados en `src/application/dtos/vinculacion-cp2.dto.ts`, bordes en
`src/infrastructure/adapter/protocol/cp2/`. Esquema inyectado por constructor,
no lectura de archivos ni composición de casos de uso en dominio/aplicación.
No conexión de estos módulos a config/dependencias.ts o al servidor actual.
Se reutilizan primitivas técnicas UTF-8/JSON/base64/SPKI/DER/origen sin modificar
el codec, los dominios criptográficos o el contrato de CP/1.

El schema valida campos y tipos; el codec añade límites 8192 bytes payload/16384
frame, profundidad máxima6 comprobada antes de parse anidado, UTF-8 estricto,
ASCII imprimible, claves sin duplicados y representación canónica exacta también
en oferta/sobre. Base64url sin padding con roundtrip, nonce/hashes32 bytes,
SPKI DER canónico P-256 y origen HTTPS exacto sin normalización silenciosa.
Firma DER8–72 bytes: dos enteros estrictos y r/s en 1..n−1 de P-256; no JOSE.

Verificación sobre los bytes originales bajo `UTF8("CPv2/PAIR\n") || payload`.
Exige pública padre esperada suministrada por el llamador, nunca la extrae como
autoridad del mensaje. Comprueba además que coincide con la declarada en payload.
Hash SHA256 de payload original; documentos congelados y copias de bytes al salir.
El llamador aún debe comprobar oferta viva/ventana/nonce/identidad hijo/origen,
comparación humana, consumos y commit/readback: **sin protección replay o estado
de vinculación en este adaptador criptográfico**. Verificar dos veces una firma
idéntica no concede dos permisos ni acredita frescura.

## Evidencia de esta unidad

Pruebas `test/vinculacion-cp2.test.ts`: claves P-256 efímeras sólo RAM, firmas reales,
bytes exactos, dominios cruzados v1/v2/otro propósito rechazados, pública distinta,
mutación externa, campos obligatorios/desconocidos, canonicalidad/UTF-8/profundidad,
base64/SPKI/origen/DER/rango, límites y rechazo v2 por codec CP/1 congelado.
Sin privadas persistidas, datos/códigos reales, APK, dispositivos o despliegue.
Comandos/resultados efectivamente ejecutados se registran en `ESTADO.md`.

Siguiente dependencia: clientes implementan estos bordes de manera separada,
sin migrar datos/identidades de producción ni quitar guardas para escanear. La
primera vinculación real requiere fuentes móviles compatibles y autorización
física específica de ambos dispositivos; endpoint/TLS todavía pendientes.

## CP2-A01 — mensajes y firmas AUTH separados

2026-10-14. Base draft padre `75eb56e` §4: nuevo `autenticacion.schema.json`
cerrado para CHALLENGE, AUTH_PROOF, AUTH_OK, PING/PONG y sobre SIGNED/AUTH.
DTOs en `application/dtos/autenticacion-cp2.dto.ts`; codec y criptografía AUTH
en el mismo borde CP/2. JSON estricto compartido con vinculación sin cambiar
su schema, campos ni firmas; DER/P-256 se reutiliza con nombre genérico.

CHALLENGE contiene connectionId, nonce32 y timeoutSec=10; AUTH_PROOF añade
pairId, role y protocol=cp.v2. AUTH_OK contiene connectionId/protocol; latidos
sólo nonce. Prueba suelta no es frame. Sobre AUTH no admite PAIR/MESSAGE/OFFLINE.
Firma SHA256/P-256 DER sobre `UTF8("CPv2/AUTH\n") || payloadBytes` originales;
el llamador suministra pública y rol esperados, nunca una clave del emisor.
Mismos límites/canonicalidad/nonce que CP2-V01 y copias de buffers al devolver.

**No autentica sockets todavía:** no se ha enlazado esta unidad al registro de
parejas, negociación cp.v2, reto RAM por conexión/consumo/plazo monotónico,
reemplazo de conexiones ni routing. El llamador debe comprobar ese contexto;
una firma válida puede verificarse otra vez y no demuestra frescura o permiso.
No se activa latido automático, ni AUTH_OK acredita orden aplicada o internet.
Tests `test/autenticacion-cp2.test.ts`: ocho nuevos casos con claves sólo RAM.

## CP2-A02 — contexto de autenticación probado localmente

`VerificacionAutenticacionCp2Adapter` implementa el puerto existente de verificación
con las dos públicas fijadas por configuración, validadas antes de uso. La clave
que verifica determina el rol permitido, no una clave o rol arbitrario del frame.
Mapper CP2 independiente emite CHALLENGE/AUTH_OK canónicos mediante la entidad de
frame existente, sin DTO de conexión duplicado ni cambios al mapper CP1.

Se reutiliza `AutenticarConexion`, independiente de versión, con almacén RAM de
retos exclusivo de la instancia CP2. Consume ANTES de verificar, compara pareja,
nonce y connectionId del intento confiable, y comprueba vencimiento monotónico
antes/después de la firma. Cancelar libera capacidad y revoca el reto. El adaptador
WebSocket deberá suministrar el id asociado a SU socket, nunca copiarlo del payload.

Ocho pruebas nuevas con firmas reales verifican ambos roles, consumo, conexión
cruzada, plazo exacto10s/coste de firma, firma/esquema fallidos, pareja/nonce/rol,
claves no configuradas, desconexión/cupo y separación de instancias de retos.
Composición sólo en tests; no wiring productivo ni sockets CP2 habilitados.
Pendientes negociación, transporte/routing y clientes compatibles antes de operar.

## CP2-T01 — transporte AUTH local separado

`crearServidorAutenticacionCp2Local` en `config/dependencias.ts` compone un servidor
de laboratorio explícito, distinto del arranque normal CP1. Exige configuración
pública válida, rechaza producción y sólo acepta sockets procedentes de127.0.0.1.
Las pruebas enlazan el listener en127.0.0.1/puerto efímero; no se añadió CLI/env que
active CP2 en `main.ts`, ni escucha LAN/TLS público o despliegue.

`EvaluarConexionCp2` admite exclusivamente GET /ws, sin Origin/query y con único
subprotocolo cp.v2; no perfil mixto/downgrade. Transporte sin compresión, autoPong
desactivado, máximo16384bytes/64fragmentos/128chunks, cabeceras32 y cupos upgrade
existentes. Adaptador de entrada `WebSocketAuthCp2Adapter` tiene su almacén de
retos y conexiones, separado del adaptador CP1. No se modifica su semántica.
La prueba de arquitectura reconoce ambos como entradas e impone puertos de entrada.
HTTP compartido acepta la superficie estructural del adaptador para cierre común.

CHALLENGE/AUTH_PROOF/AUTH_OK reales, reto monotónico10s/consumo único y pública/rol/
pareja configurados. Un cliente nuevo sólo sustituye mismo rol tras autenticar;
máximo16retos/18sockets y una conexión autenticada por rol. Cierre ordenado1012.
Tras AUTH se admite únicamente PING→PONGCP2, sin reenviarlo. Cupo20ráfaga/10porsegundo
de aplicación y de controles, salida64KiB y supresión de noncePONG repetido inmediato/
salida pendiente. Fallos de protocolo cierran1008 (binario1003/exceso1009) sin emitir
ERRORCP1 ni inventar schema nuevo. No se añadieron autopings ni servicios externos.

Diez pruebas nuevas de sockets reales con clientes Node y claves efímerasRAM:
ambos roles/latidos, ausencia compresión, rechazo upgrade, prueba cruzada/replay,
impostor/rol/nonce/pareja, sustitución, binarios/grandes, ausencia de autoridad antes
AUTH, rechazo de órdenes tras AUTH, cupos/limpieza/timeout10s/cierre y configuración.
Health sigue503 y keepalive sólo actividad del proceso; no disponibilidad CP2.
No presencia/routing MESSAGE/STATE/ACK/órdenes, WSS público, cliente móvil, firmas
móviles cruzadas o permisos de uso acreditados por esta unidad. El siguiente bloque
de relay necesita el contrato de mensajes/STATE actualizado antes de integrarlos.

## CP2-I01 — vectores públicos y cruce entre implementaciones

`node scripts/generar-vectores-cp2.mjs` emite únicamente públicas y documentos de
laboratorio: oferta, PAIR firmado/hash de payload y AUTH firmado de cada rol.
Cada ejecución crea claves nuevas sólo RAM; no exporta privadas ni utiliza datos
de teléfonos, códigos adultos o una pareja real. Los hashes de recuperación son
aleatorios ficticios, no verificadores de códigos de producción. No usar el vector
en una ceremonia; etiqueta CP2_PUBLICO_EFIMERO_SIN_AUTORIDAD.

Verificador de laboratorio:

```text
pnpm exec tsx test/soporte/verificar-vector-cp2.ts <archivo-publico.json>
```

Acepta seis campos de fixture PAIR, u ocho con ambas pruebas AUTH. Exige oferta/
PAIR consistentes, firma con pública externa del fixture y hash exacto; AUTH debe
corresponder a rol/pareja del vector. Rechaza campos privados/desconocidos o AUTH
incompleto. Las cadenas internas se validan con codecs CP2 productivos; no acepta
normalizarlas para hacer pasar firmas. Archivo de laboratorio≤32KiB.

Tres tests nuevos verifican generador, campos normativos y rechazo de cruces. El
PAIR_ACCEPT del schema tiene **10 campos**, incluyendo v/kind/protocol: listas
required/properties y payload generado contrastadas explícitamente. La referencia
a11 del relevo padre es error de conteo, no motivo para modificar contrato.
Enviado mismo vector público íntegro a ambas IAs para pruebas JVM y generación
de vectores públicos JVM de vuelta. Hasta verificar esas devoluciones, esto sólo
acredita Node→Node; no interoperabilidad JVM, teléfonos o vínculo operativo.

### Devoluciones JVM verificadas — 2026-10-15

Se revisaron ambas evidencias INTEROP01 y se ejecutó el verificador anterior sobre
los dos archivos públicos JVM entregados, sin regenerarlos ni operar las apps:

- Padre: oferta/PAIR/ambos AUTH aceptados en Node; SHA256 del archivo
  `fb830c79349479eca0e7ee5392c05d5a32ca62157af7e00fd1d890dcf2c65d4b` comprobado.
- Hijo: oferta/PAIR aceptados en Node; SHA256 del archivo
  `fa04fc863d7bace67b5036751e04865e2e6d90047d333252e4a70d21f5b36bf6` comprobado.
  AUTH no evaluado/implementado por el hijo en este bloque.

Node→JVM está reportado con codecs propios en las evidencias de cada app;
JVM→Node fue ejecutado aquí. Queda acreditado el cruce criptográfico local de esas
muestras públicas, no UI/IO Android/Keystore real, oferta vigente, consentimiento,
recuperación, vínculo real, clientes conectados o control remoto. No se cambiaron
codecs/esquemas para lograr la compatibilidad ni se instalaron APKs.

## CP2-O01 — SYNC_REQUEST/SET_POLICY separados

`ordenes.schema.json`, DTOs y codec/criptografía propios en el borde CP2 implementan
la parte PARENT de draft75eb56e §§2–5. SYNC_REQUEST tiene6campos: v/kind/pairId/sender/
syncNonce/requestedAction; acción null explícita para consulta o LOCK/ALLOW/ALLOW_FOR.
SET_POLICY tiene12: v/kind/sender/pairId/bootId/childSessionId/commandId/seq/
expectedRevision/commandNonce/action/durationSec. Sobre MESSAGE cerrado de5campos.
No añadir campos por errores de conteo en resúmenes. Campos/nulos obligatorios.

Seq decimal1..2^63−1 y revisión0..2^63−1 en strings exactos; schema limita forma y
codec valida rango con bigint. UUIDv4minúsculos y nonce32base64urlcanónico. Duración
sóloALLOW_FOR:60..86400segundos/múltiplo60 (minutos1..1440enteros), null paraLOCK/ALLOW.
No LOCK_FOR/deferredAllowSec/WAITING_ALLOW ni duración predeterminada. Mismos límites
8192/16384/profundidad6/ASCII/UTF8/canonicalidad/DER/P256. Firma CPv2/MESSAGE+LFreal
sobre payloadoriginal, pública padre esperada desde llamador, hashpayload/copias.

No integración con sockets/routing/STATE/ACK, reserva de seq, escritor del hijo,
reto vivo/CAS/revisión o enforcement. Firma válida puede verificarse otra vez y no
acredita operación aceptada/aplicada. TransporteT01 sigue rechazando estas órdenes.
Regla de red posterior al draft: autorización NORMAL se revoca10s desde señal
Android negativa y reconectar no abre; excepciónOFFLINE es local explícita. No
copiar semántica antigua «ALLOW incluso offline» del draft a las apps por este codec.
Siete tests nuevos cubren campos/tipos/rangos/duración/bytes/firma/domino/aislamiento.

## CP2-K01 — ACK CHILD separado de STATE

`ack.schema.json`, DTO, codec y verificador implementan draft75eb56e §§7/9.
ACK cerrado14campos: v/kind/sender/pairId/bootId/childSessionId/commandId/seq/
commandPayloadSha256B64/acceptedRevision/evaluatedRevision/result/reason/resultElapsedMs.
SobreMESSAGE5campos, dominio CPv2/MESSAGE+LFreal y públicaHIJOesperada externa.
Hash del resultado verificado es SHA256 del payloadACK; commandPayloadSha256B64
sigue siendo el hash de la orden, no se confunden ni se recalculan como si fueran uno.

APPLIED exige razónOK/revisiónaceptada/instante, PENDING razónOK/revisión/instantenull,
FAILED razónENFORCEMENT_ERROR/revisión/instante. REJECTED usa revisión/instantenull
y causa evaluable distinta deOK/UNKNOWN_COMMAND; UNKNOWN_COMMAND usa esosnulos y
causa homónima. Seq/revisión aceptada positivos, evaluación/elapsed no negativos,
strings decimales exactos≤2^63−1; accepted≤evaluated. Nulos explícitos obligatorios.
Hash32/base64url canónica, UUIDv4minúsculos, mismas barreras UTF8/ASCII/canonicalidad/
DER/rango/tamaño/profundidad. No campos mode/source/remaining ni texto libre.

Verificar firma no correlaciona intención ni demuestra evidencia física: padre
debe comprobar orden/seq/hash/contexto originales y vuelo conocido. ACKterminal
histórico no rejuvenece STATE ni declara modo actual; UNKNOWN conserva incertidumbre.
El relay no emite ACKdehijo. Sin routing/STATE/escritor/aplicación de órdenes por
esta unidad; transporteT01 sigue AUTH-only. Siete tests nuevos con clavesefímerasRAM.

Vuelta AUTH del hijo141ed73 verificada por Node (oferta/PAIR/ambosAUTH), archivo público
SHA25614ad8921072e628e700cd4404a3a4d0506c07ce434215c13f288efe32860c289 comprobado.
Actualiza el alcance histórico AUTH_NO_EVALUADO_HIJO de INTEROP01, sin afirmar canal.
