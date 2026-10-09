# Arquitectura del servidor

## Dependencias y responsabilidades

Dominio no importa infraestructura, Node.js ni librerías externas. Aplicación
solo importa dominio y sus propios puertos. Los casos de uso implementan los
puertos de entrada y reciben puertos de salida por constructor cuando necesitan
acceso externo. No hay contenedor DI, decoradores ni service locator.

Infraestructura recibe esos puertos de entrada en los controladores. Los
adaptadores `EstadoLocalAdapter` y `ValidacionPublicaAdapter` implementan los
puertos de salida. El primero conserva estado no operativo; el segundo encapsula
validación HTTPS y la importación criptográfica SPKI P-256. `bootstrap/composicion.ts`
es la raíz de composición. `main.ts` limita el arranque a loopback y rechaza producción.

## Flujos actuales

- HTTP: Node → request DTO → ServicioController → ConsultarServicioEntrada →
  ConsultarServicio → EstadoServicioSalida → EstadoLocalAdapter. El resultado
  de dominio se transforma en response DTO; Node escribe status, JSON y no-store.
- Upgrade: IncomingMessage → UpgradeEntity → request DTO → ConexionController →
  EvaluarConexionEntrada → EvaluarConexion. DecisionConexion → response DTO →
  RechazoUpgradeEntity → HTTP de rechazo. UpgradeMapper también convierte
  SolicitudConexion ↔ UpgradeEntity sin introducir sockets en el dominio.
- Configuración: variables → DTO → ConfiguracionController → ConfigurarServidor →
  ValidacionPublicaSalida. ConfiguracionMapper filtra las variables admitidas:
  el dominio no recibe el resto del entorno. El resultado vuelve como DTO público
  interno; no hay endpoint que publique claves o pareja.

EvaluarConexion es una regla pura y no necesita un puerto de salida ficticio.
Las entidades actuales representan el handshake/rechazo, no conexiones autenticadas
que todavía no existen. No se añade un adaptador de envío operativo para aparentar R02/R03.

## Respuestas y seguridad

Health: 503 con `{ok:false,protocol:1}` mientras el adaptador indique no operativo.
Ruta/método no admitidos: 404. Upgrade inválido: 400. Upgrade de CP/1 válido:
503 porque falta autenticación. Fallos imprevistos: 500 sin detalles internos.
Errores de arranque imprimen únicamente mensajes controlados, no el entorno.

El transporte `ws` sigue desacoplado de HTTP, con noServer, límite de 16384 bytes
y compresión deshabilitada. El dominio no contiene objetos ws, Buffer, Server,
KeyObject ni Request. El codec y la verificación criptográfica quedan en
infraestructura como componentes técnicos del contrato, no como reglas de negocio.
No se reconstruyen los bytes del payload antes de verificar su firma.

## Estructura y compatibilidad

Paquete npm, lockfile, tsconfig, .npmrc y .node-version residen en la raíz.
Los resultados nuevos están en dist/ y dependencias en node_modules/, ignorados.
compartido/ y pruebas/ conservan contrato y fixtures congelados. documentacion/
conserva especificaciones y evidencias históricas; sus rutas relay/ describen
el diseño anterior y no son instrucciones de arranque actuales.

Para Render, al implementar R03 se usará la raíz del repositorio, no relay/.
No se ha creado ni aplicado una configuración de despliegue.
La herramienta de interoperabilidad usa ahora la raíz de este proyecto; cualquier
ajuste del consumidor Android debe acordarse aparte, sin modificar las apps aquí.
