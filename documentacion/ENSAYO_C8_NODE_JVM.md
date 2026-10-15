# C8-X01 — cruce JVM con servidor Node real, sólo laboratorio local

Preparación autorizada 2026-10-15, sin despliegue/ADB/instalación/ceremonia.
Fuente R1 permanece idéntica, sin nuevos mensajes de red ni cambios CP1/CP2.

## Arnés Node para cada rol JVM

`corepack pnpm run build` en Render antes del ensayo. Script exclusivo de pruebas:
`node <rutaRelay>/test/soporte/interop-c8.mjs`. No CLI/main productivo.
Servidor C8real compilado, loopback127.0.0.1, WSS/c8.v1, PoP y firmas reales.
Cada ejecución cruza UN clienteJVM real con contraparteNode sintética en RAM.
NO equivale a dos apps juntas ni Keystore/DeviceOwner/IOAndroid reales.

Entrada/salida: una línea JSON por evento en stdin/stdout del proceso, no HTTP.
Capturar pipes sólo RAM en el test; no imprimirlos ni guardarlos en evidencias.
No argumentos/entorno/archivos con privadas. stderr sólo fallos genéricos.
Proceso expira45s, EOF/fallo limpia sockets/servidor; no reconexión automática.

1. JVM crea certificadoTLS efímero con SAN127.0.0.1 y CA/cliente de test estrictos,
   sin trustAll/hostnameVerifier permisivo. Obtiene puerto libre loopback.
2. Escribe init `{"role":"PARENT|CHILD","port":puerto,"certPem":"...","keyPem":"..."}`.
   Certificado/privada efímeros via pipe local, sólo RAM, nunca repos/log/chat.
   role es el rol del clienteJVM, NO la contraparteNode. No claves familiares reales.
3. Lee `READY` con `origin` y `peerPublicKeyB64`; esa pública sintética sirve como
   ancla INDEPENDIENTE de mensajePAIR en el ensayo (no sustituye cotejo humano real).
   Sólo rolePARENT recibe además `offerB64` y `code` efímeros de laboratorio.
4. JVM conecta su cliente/codec real a origin→wss/pair, certificado normal verificado
   contra CA efímera inyectada únicamente en tests. No modificar DNS/TLS productivos
   para permitirlocalhost. Si wrapperAndroid no es inyectable, usar modeloJVMreal
   con puenteOkHttpTEST explícito e informar límite, sin llamarlo wrapperAndroid.
5. rolePARENT: introducir code en flujo real; Node ya publica oferta. JVM prepara/
   firma/guarda/readback y envía PAIR original. Node verifica firma/contexto y emite
   `PAIR_RECEIVED` con `pairSha256B64` y `parentPublicKeyB64`.
6. roleCHILD: JVM genera/publica oferta y recibe CODE. Test pasa a stdinNode
   `{"event":"CLAIM","code":"..."}`; contraparteNode reclama y envía PAIR firmado.
   Node emite `PAIR_SENT` con `pairSha256B64` y `parentPublicKeyB64`. JVM comprueba
   candidata/huellas de prueba, validación y guardado/readback a través de bordes
   reales cuando sean JVM, con disco/adulto/enforcer falsos sólo explícitamente.
7. Comparar hashSHA256base64url de bytes originales de PAIR entre lados. Verificar
   familia/origen/nonce/oferta/contexto sin obtener autoridad de la propia PAIR.
   SEND/SENT nunca prueba Android. Escribir `{"event":"DONE"}`, leer DONE y exit0.

Errores: timeout/proceso no0/test falla detienen esa ejecución; sin reintento para
disimular. Recoger sólo conteos/hashes públicos/detalles genéricos. Pruebaopt-in
con propiedad Gradle `-PrutaRelay=<rutaRender>` o equivalente explícito, sin tocar
otros repositorios. La ejecución positiva debe informar que realmente corrió, no
sólo asumirla desde UP-TO-DATE o que el test fue omitido sin ruta.

## Perfil público

Se prepara separadamente en servidor, desactivado por defecto y sin publicar.
No usar endpointreal bootstrap para estos ensayos. No instalar APK nuevas ni
usar identidades/códigos adultos/teléfonos reales; requieren autorización posterior.
