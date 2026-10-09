# Padre P07 → relay CP/1: primera integración local

## Alcance demostrado

Se leyó parental_padre sin modificarlo. Su estado declara P07 local parcial,
no integración física completada. Su cliente es exclusivamente WSS:
TransporteOkHttp rechaza WS y ConfiguracionRelay transforma HTTPS en wss://…/ws.
Por eso el servidor WS local previo no bastaba para conectarlo.

El relay admite TLS local por inyección en crearServidorLocal(valores, tls).
No cambia main.ts, no carga privadas desde env/archivos, no abre un puerto
permanente ni habilita producción. El harness crea HTTPS/WSS en un puerto efímero
de 127.0.0.1, con certificado/clave efímeros solo en RAM. Health continúa en 503;
todo upgrade pasa por autenticación CP/1 y límites existentes. TLS requiere
configuración pública, key/cert completos y mínimo TLS 1.2. Si es inválido,
se libera el transporte preparado y no se escucha.

## Ejecución desde parental_render

```powershell
pnpm run build
pnpm run test:padre --ruta-padre "C:\Users\Usuario\Documents\parental_padre"
pnpm run test:padre:fallos --ruta-padre "C:\Users\Usuario\Documents\parental_padre"
pnpm run test:padre:proceso --ruta-padre "C:\Users\Usuario\Documents\parental_padre"
pnpm run test:padre:politicas --ruta-padre "C:\Users\Usuario\Documents\parental_padre"
```

Requiere JDK 21 con java/javac en PATH o JAVA_HOME, clases debug ya compiladas
del padre, core-protocol.jar y JAR de su caché Gradle. No ejecuta Gradle,
descarga dependencias, compila la app ni modifica fuentes/build del padre.
Si faltan artefactos o las dos fuentes de red son posteriores a sus clases,
pedir al proyecto padre un build actualizado: no se reconstruye aquí.

JAR usados: Kotlin stdlib 2.2.0, coroutines-core-jvm 1.10.2, serialization
core/json JVM 1.9.0, OkHttp/okhttp-tls 4.12.0 y okio-jvm 3.6.0. La ruta explícita
selecciona un solo repo. Antes de conectar se comparan por SHA-256 contrato,
esquema y vectores congelados de ambos proyectos.

PruebaPadre.java es un driver de este servidor, compilado en el temporal aprobado
OpenCode. Carga TransporteOkHttp, RelayConnection y core-protocol ya compilados
del padre sin copiarlos ni sustituirlos. Comprobar mtime evita desactualización
obvia, pero no certifica procedencia del build ni equivalencia con una APK.
Los temporales contienen solo .class del driver; certificados y privadas TLS/CP/1
no se escriben ni se imprimen. El bootstrap privado pasa solo por pipe en RAM.

## Flujo verificado

1. JVM crea identidad P-256 y certificado de test con SAN 127.0.0.1. Node crea
   identidad ficticia del hijo y fija ambas públicas antes de escuchar.
2. Cliente padre con confianza predeterminada rechaza el certificado de test.
   Cliente JVM aislado confía solo en ese certificado; hostname y TLS siguen
   verificados. Sin trustAll ni instalación de CA de test en Android.
3. Hijo Node y padre JVM autentican CHALLENGE → firma AUTH → AUTH_OK. Padre
   habilita sesión de transporte solo tras su PING/PONG correlacionado real.
4. Padre envía SYNC_REQUEST firmado con codec/firmante JVM. Hijo Node verifica
   firma/pareja y responde STATE firmado con nonce y contexto de sesión.
5. JVM verifica STATE con la pública del hijo y envía SET_POLICY firmado.
   Hijo simulado verifica firma, pareja, boot/sesión/nonce y responde ACK firmado
   ACCEPTED_PENDING_ENFORCEMENT con id/seq/hash exactos del payload recibido.
6. JVM verifica ACK y correlación de contexto/id/seq/hash; segundo plano invalida
   la sesión de RelayConnection. Se cierran clientes, JVM y servidor.

Los mensajes atraviesan el relay real, no un eco ni MockWebServer. El hijo es
simulador de protocolo: no ejerce restricciones. El driver invoca envío de
transporte para probar CP/1, **no ControlPoliticas** ni sus guardias de negocio.
STATE declara isDeviceOwner=false y lockTaskActive=false: no es evidencia de un
hijo apto. No promociona PREPARADO ni habilita controles de la APK.

### Variante de fallos de transporte

test:padre:fallos no emite el ACK de la orden recibida por el hijo simulado.
Después cierra la instancia WSS con 1012 y crea otra en el mismo puerto, con
configuración pública y TLS efímeros conservados solo en RAM. RelayConnection JVM
reconecta por su backoff normal, autentica con reto nuevo y obtiene PONG/ticket
nuevos; el ticket anterior no permite enviar. El hijo Node reautentica y solo
recibe SYNC_REQUEST nuevo, no la orden anterior. STATE firmado de sesión nueva
se verifica en JVM; no llega un ACK inventado o almacenado por el relay.

Esto prueba recreación de instancia/listener en el mismo proceso Node, no muerte
y arranque de un proceso independiente. Tampoco ejecuta ControlPoliticas ni
agotamiento de sus dos reintentos/reconciliación duradera: siguen pendientes.

### Variante de reinicio de proceso

test:padre:proceso reutiliza el recorrido de fallos, pero arranca un proceso Node
independiente mediante test/soporte/relay-proceso.mjs. Configuración pública y
certificado/privada TLS efímeros pasan por IPC, nunca por archivos, argumentos,
variables de entorno o logs. El listener solo escucha 127.0.0.1 y la prueba
confirma health 503. El worker tiene límite de vida de 45 s y termina al perder
el IPC; el orquestador también lo termina al cerrar o fallar la prueba.

Una vez recibida la orden sin emitir ACK, el orquestador termina abruptamente
ese proceso con SIGKILL (terminación forzada en Windows), espera su salida y
comprueba cierre WebSocket 1006. Arranca un nuevo proceso con PID distinto en el
mismo puerto y conserva únicamente la configuración de prueba, no el estado del
relay. Padre JVM reautentica por su backoff normal, obtiene ticket nuevo y
rechaza el anterior. Hijo simulado recibe reto nuevo y SYNC_REQUEST nuevo, sin
la orden anterior; padre verifica STATE de sesión nueva y no recibe ACK ficticio.

El reinicio corresponde al proceso Node de laboratorio, no Render, Android ni
el proceso JVM del padre. No prueba cortes de energía, agotamiento de reintentos
de ControlPoliticas, reconciliación duradera o una orden aplicada por el hijo.

### Variante de políticas sin ACK

test:padre:politicas compila también PruebaPoliticas.java en el temporal del relay,
usando ControlPoliticas, ParentStore, MetadatosPadre y CifradoMetadatos del build
existente del padre. Comprueba que sus clases no sean anteriores a sus fuentes;
no ejecuta Gradle ni modifica ese proyecto. El driver llama métodos suspendidos
con continuaciones sobre Dispatchers.IO, para no bloquear al escritor serial
de ParentStore cuando comprueba la persistencia desde el callback de envío.

Inicializa únicamente un almacén de laboratorio VINCULADO y un hijo Node que
declara isDeviceOwner=true de forma ficticia. No promociona ningún vínculo
PREPARADO ni cambia las guardas de producción. Firma JCA y autoridad ficticia,
AES/GCM real de CifradoMetadatos con clave de test en RAM; ArchivoMetadatos
en RAM, no AtomicFile ni Keystore. Solo publica resultados genéricos.

Recorrido demostrado:

1. SYNC/STATE firmado y confirmación explícita de LOCK_FOR de 60 s.
2. Reserva/contador 1, firma y ENVIADA_SIN_CONFIRMAR persistidos antes de enviar.
   El callback comprueba el registro real y los bytes en cada envío.
3. Hijo omite todos los ACK. Reloj de políticas inyectado avanza a 5/10 s: dos
   reintentos byte a byte idénticos al original. No se espera ese tiempo real.
   El reloj de transporte y la red WSS sí son reales.
4. A 15 s, ControlPoliticas agota reintentos y emite SYNC_REQUEST con nonce nuevo,
   no un cuarto comando. La intención incierta permanece y nunca figura aplicada.
5. STATE firmado con id/seq correctos pero hash ajeno no resuelve la intención:
   conserva el pendiente y pide confirmación. No se exige que rechace el STATE
   completo: el comportamiento observado es retener evidencia sin correlacionarla.
6. STATE de hash correcto y ACCEPTED_PENDING_ENFORCEMENT deja pendiente aplicación.
7. Cierre/reapertura del ParentStore sobre el mismo archivo cifrado en RAM y un
   ControlPoliticas nuevo: pendiente preservado, sin reproducir la orden. SYNC
   nuevo y STATE de sesión nueva con id/seq/hash correctos y ENFORCEMENT_FAILED
   simulado resuelven el pendiente conservando contador 1 y fase FALLO_APLICACION.

No prueba ACK emitido y perdido en tránsito, restricciones reales, reinicio del
padre, almacenamiento físico ni reintentos combinados con restart del relay.
El reinicio de proceso relay está cubierto por la variante de transporte separada.
Estas variantes opcionales no forman parte de CI ni sustituyen las puertas físicas.

## Pendientes y handoff al proyecto padre

- El padre ya reporta P08-B: ControlPoliticas/ParentStore contra este relay en
  JVM aislado, con hijo simulado y guardias de producción conservadas. Evidencia
  en su pruebas/EVIDENCIA_P08_B.md; no reejecutada en el turno de coordinación.
  Pendientes reinicio real del relay y ACK totalmente perdido en ese recorrido.
- APK, Keystore, autenticación del adulto, red Android e hijo real no probados.
  No hubo dispositivos ni ADB.
- Una APK no puede usar sin más 127.0.0.1 del PC: en teléfono apunta al propio
  teléfono. Elegir después entorno local autorizado y confianza TLS, sin abrir
  LAN/publicación ni cambiar la app desde este proyecto.
- Sin despliegue, certificado público, exportación real o CI remoto. Coordinar
  siguiente tarea con la IA del padre; CP/1 permanece igual.
- La observación de cadencia fue atendida por el padre en P08-A (48e681b): su
  relevo reporta PING cada 15 s desde envío y caducidad de 45 s. Es evidencia de
  su proyecto, no una prueba nueva de esta sesión. Ver coordinación central
  COORDINACION_PROYECTOS.md para siguientes unidades y puerta de vínculo operativo.

Script opcional, no incluido en CI: los runners no contienen repo/clases/cache
del padre. pnpm run verificar sigue independiente. Evidencia en ESTADO.md.
