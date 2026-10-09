# Control parental — servidor Render independiente

Extraído de parental_padre con autorización del propietario, sin funciones nuevas.
Código en relay/, contrato congelado en compartido/, fixtures en pruebas/.
Las aplicaciones Android no forman parte de este proyecto.

**Aún no operativo públicamente:** servidor local 127.0.0.1, /healthz 503,
upgrades WebSocket rechazados y ejecución production bloqueada.
El desarrollo autenticado WSS y despliegue se realizarán aparte más adelante.

## Verificación local

Desde esta carpeta: `powershell -File scripts/verificar.ps1` (Node 24/npm).
Compila, chequea TypeScript, ejecuta los 30 tests heredados y verifica vectores.
No despliega Render ni usa dispositivos. Para arrancar solo la base local:
desde relay/ ejecutar `npm start` después de compilar.

## Continuación

R01 — configuración pública/HTTP/límites; luego R02 — autenticación por reto y
R03 — retransmisión/latidos/despliegue. Consultar documentacion/SPEC_RELAY_RENDER.md
y las entradas R01–R03 en documentacion/PLAN_ORIGEN_PADRE.md (archivo histórico;
no ejecutar aquí sus tareas Android). Contrato/firmas no cambian por extracción.

Pruebas de interoperabilidad con Kotlin son integración opcional desde el repo
del padre con `-PrutaRelay=<ruta absoluta a parental_render/relay>`; este servidor
no depende de su ubicación ni necesita compilar Android para los tests propios.
