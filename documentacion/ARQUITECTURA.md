# Arquitectura del servidor

## Estructura y dependencias

- `application/mapper`: DTO request → entidad de dominio; resultado → DTO response.
- `application/dtos`: configuración, respuestas de servicio y contrato CP/1.
- `application/usecase`: implementaciones de puertos de entrada.
- `application/validations`: reglas de entrada/configuración y admisión del handshake.
- `domain/entities`: una clase de entidad por archivo, inmutable y sin Node.js.
- `domain/ports/portin` y `portout`: contratos que usan entidades de dominio,
  no DTOs, sockets ni objetos criptográficos de infraestructura.
- `infrastructure/controller`: únicamente health y keepalive.
- `infrastructure/routers`: selección de rutas HTTP exactas y respuestas de error.
- `infrastructure/adapter`: WebSocket de entrada y adaptadores de salida;
  entidades, mapper específico y componentes técnicos del protocolo dentro.
- `infrastructure/config`: configuración de HTTP/WebSocket, lectura del entorno
  y raíz de composición en `dependencias.ts`.

Dominio solo importa dominio. Aplicación importa dominio y aplicación, nunca
infraestructura ni librerías Node. Infraestructura depende hacia dentro.
La inyección pertenece al arranque: `config/dependencias.ts` puede construir
adaptadores y casos de uso sin introducir esa responsabilidad en el dominio.
No hay contenedor DI, decoradores, service locator ni carpeta bootstrap paralela.

## Flujos, sin conversiones duplicadas

HTTP:

```text
Node → ServicioRouter → ServicioController (health/keepalive)
     → ServicioMapper → ConsultarServicioEntrada → ConsultarServicio
     → EstadoServicioSalida → EstadoLocalAdapter
     ← ResultadoConsulta ← response DTO ← JSON HTTP
```

El dominio conoce el tipo de consulta, no rutas HTTP ni códigos de estado.
El router rechaza rutas y métodos no admitidos antes de invocar el controlador.

WebSocket:

```text
upgrade Node → WebSocketAdapter → UpgradeEntity → UpgradeMapper.aDominio
             → EvaluarConexionEntrada → EvaluarConexion
              ← DecisionConexion → UpgradeMapper.aRechazo → HTTP de rechazo
              o admisión local → AutenticarConexionEntrada → AutenticarConexion
              → retos/reloj/entropía/verificación (puertos de salida)
              ← RetoAutenticacion/ConexionAutenticada → AutenticacionMapper → frame
```

No existe ConexionController ni DTO de conexión intermedio. El mapper específico
convierte dominio ↔ UpgradeEntity y DecisionConexion ↔ RechazoUpgradeEntity.
Un rechazo 500 de transporte no se interpreta como una decisión de dominio.
WebSocketAdapter es un adaptador de entrada: inyecta un puerto de entrada,
no necesita fingir que implementa un puerto de salida. EstadoLocalAdapter y
ValidacionPublicaAdapter sí implementan los puertos de salida correspondientes.

Configuración:

```text
entorno → ConfiguracionServidor → ConfiguracionMapper → ConfigurarServidorEntrada
        → ConfigurarServidor → ValidacionPublicaSalida → ValidacionPublicaAdapter
        ← Configuracion ← response DTO interno
```

La lectura del entorno no es un controller ni una ruta pública. El mapper filtra
las variables admitidas antes de entrar al dominio. Validaciones de aplicación
comprueban campos requeridos, puerto, entorno y nivel de log; la entidad mantiene
invariantes de pareja y claves distintas. El adaptador encapsula validación HTTPS
e importación criptográfica SPKI P-256.

## HTTP, liveness y seguridad

- `GET /healthz`: 503 con `{ok:false,protocol:1}` mientras R02/R03 no estén listos.
- `GET /keepalive`: 200 con `{alive:true}`, sin claves, pareja ni presencia.
- Otras rutas/métodos y query strings: 404. No hay endpoints HTTP de negocio.
- Upgrade inválido: 400; CP/1 sin configuración o durante cierre: 503.
- Con configuración válida solo se autentican sockets de 127.0.0.1; otros: 403.
- Máximo 16 retos pendientes y 18 sockets de transporte; saturación: 429.
- Fallos inesperados HTTP/upgrade: 500 genérico, sin detalles internos.
- Respuestas JSON con no-store; `main.ts` conserva loopback y bloqueo de producción.

Keepalive es una respuesta de actividad del proceso, no disponibilidad funcional,
autenticación ni prueba de entrega. No instala cron, autopings ni servicios externos,
y no garantiza que Render no suspenda una instancia. Para uso habitual permanece
la recomendación de la SPEC de una instancia que no se suspenda por inactividad.
Se añade esta ruta por solicitud del propietario; la SPEC copiada conserva su
tabla HTTP anterior como referencia histórica, sin cambiar CP/1.

El transporte ws se enlaza a HTTP solo con configuración pública válida, con
noServer, maxPayload 16384 y compresión deshabilitada. Codec y criptografía
permanecen en adapter/protocol.
Los tipos CP/1 son DTOs, no entidades de dominio. Nunca se reserializan payloads
firmados para verificar o reenviar. R02 verifica los bytes originales antes de
interpretar AUTH_PROOF; R03 y el reenvío siguen pendientes.

El caso de uso consume el reto antes de verificar la firma, comprueba socket,
nonce y pareja, y revisa expiración antes y después de verificar. RelojAdapter
usa performance.now; EntropiaAdapter usa UUID v4 y 32 bytes aleatorios. Los retos
permanecen en RAM acotada y se eliminan por uso, expiración o desconexión.
VerificacionAutenticacionAdapter solo utiliza las claves P-256 configuradas:
el rol declarado debe corresponder a la clave firmante. No acepta claves propuestas.

WebSocketAdapter mantiene una conexión autenticada por rol y sustituye la antigua
solo después de autenticar. El cierre antiguo no borra la nueva del mapa.
Después de AUTH_OK se rechazan más frames de aplicación hasta R03; no hay eco
ni reenvío. cerrarServidorHttp detiene upgrades y cierra pendientes/autenticados
con 1012, con terminación forzada del socket tras un segundo si no coopera.

## Herramientas y compatibilidad

pnpm fijado en packageManager, pnpm-lock.yaml y Node 24 en la raíz.
Verificar con `pnpm run verificar`; instalación `pnpm install --frozen-lockfile`.
Sin autorización de scripts de dependencias. dist/node_modules ignorados.
compartido/ y fixtures conservan bytes congelados; las evidencias anteriores
mantienen rutas y comandos históricos. Las apps no se modifican desde aquí.

Render se preparará en R03 desde la raíz: pnpm install --frozen-lockfile --prod=false,
pnpm run build y pnpm start. No se creó ni aplicó configuración de despliegue.
La herramienta local de interoperabilidad sigue en test/soporte/interoperabilidad.mjs;
los consumidores Android deben ajustarse coordinadamente en otra tarea.
