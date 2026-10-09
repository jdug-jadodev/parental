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
