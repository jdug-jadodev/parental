# CP/2 separado — primera unidad de vinculación local

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
