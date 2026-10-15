# C8-I01 — encuentro sin cámara, servidor local

Fecha:2026-10-15. No despliegue, teléfonos, APK instaladas nuevas o ceremonia real.

## Implementado

- Contrato C8/1 R1 común: SHA256
  `089e0b6299ec6db3d312596e5929452321cbb60e3fb4646cceb4669b9492adde`.
  Cotejados los tres archivos locales con Get-FileHash: idénticos byte por byte.
- Cliente provisional prueba P256/DER sobre bytes originales con dominio
  `C8v1/PROOF\n`. Reto/socket/origen/rol ligados, consumido antes de verificar;
  plazos comprobados antes/después. No demuestra identidad humana/familia/adulto.
- CHILD publica oferta original, recibe código8 uniforme40bits de32símbolos,
  PARENT reclama atómicamente UNA vez. Verifica firma/contexto PAIR completo y
  entrega sus bytes originales; SENT no confirma commit móvil.
- Estado sólo RAM,18sockets/16encuentros, tombstone impide reusar código durante
  su ventana; cancelación/cierre/caducidad purgan oferta/públicas/participantes.
- Presupuesto anclado a CHALLENGE, sin comparar relojes o ampliar por tránsito.
  Hijo sigue obligado a imponer marco adulto local original y foreground.
- Cupos por frame/control/upgrade y40CLAIM/min global, cinco fallidos/socket.
  Códigos inexistentes/ocupados/consumidos/expirados responden genéricamente.
- `/pair`/`c8.v1` distinto del relay; sólo127.0.0.1. Composición local explícita
  en config/dependencias.ts; producción rechazada. Sin nuevo modoCLI ni cambios
  de bootstrap/cp.v2 o configuración remota. HTTP sólo health/keepalive, health503.

## Pruebas realmente ejecutadas

Primera pareja focal:2correctas. Ampliación:16/17correctas; expectativa de test
bootstrap503 incorrecta para ruta/subprotocoloC8 desconocidos: la barrera existente
responde400. Corregida expectativa sin abrir ni cambiar bootstrap.

Primera verificación completa:203/206correctas, tres fallos de arquitectura;
interrumpió antes de esquema/vectores. Se corrigió código, no se relajaron reglas:
puerto de entrada/entidades una por archivo/mapper en borde y composición aislada.
El nuevo adaptador de entrada C8 se añadió a lista de adaptadores de entrada del
test, sometido a las mismas comprobaciones de inyección de puertos existentes.

Tras corrección: `corepack pnpm run check` correcto y ejecución focal conjunta
de arquitectura+C8:26tests correctos,20C8+6arquitectura. C8 contiene14tests unitarios
y6con WebSockets reales locales: flujo original, rechazo de upgrades/perfiles,
tráfico previo a prueba/binarios/órdenes, desconexión, caducidad/cupo y cierre1012.
Claves efímeras sólo RAM, sin datos privados guardados o endpoint externo.

Verificación completa final relanzada; resultado registrado al concluir en ESTADO.md.
No ensayo Node↔Android/JVM cruzado por estos20tests; clientes del ensayo son Node,
sin enforcer, Keystore ni persistencia móvil real. Compilar o firmar no acredita
ceremonia humana, guardado de pareja, recuperación o bloqueoAndroid.

## Pendiente de publicación/piloto

Ambas sesiones raíz recibieron implementación C8-I01, no sólo revisión; API
confirmó running y existen fuentesC8 nuevas en ambos árboles. Entregas móviles
finales y APK aún pendientes al redactar esta evidencia. Contrato idéntico no
demuestra interoperabilidad por sí solo. No ejecutar ADB desde servidor.

El nuevo perfil público de enrolamiento requiere autorización específica,
implementación/configuración revisadas y despliegue por propietario. Lo publicado
continúa bootstrap cerrado. C8local no elude AUTH familiar ni las claves fijas
requeridas por relayCP2 después de vincular. No push ni deploy realizados.
