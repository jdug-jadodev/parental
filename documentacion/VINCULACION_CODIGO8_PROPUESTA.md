# C8-R0 — alternativa de vinculación sin cámara

Estado: propuesta compartida para revisión entre los tres roles. Solicitada por el
propietario porque la pantalla manchada impide leer el QR. No implementada ni
desplegada por este documento; no autoriza más operaciones físicas. La ruta QR
se pausa para este ensayo, sin borrar posibles pendientes o cambiar identidades.

## Resultado solicitado

- Hijo muestra un código de8 caracteres; padre lo escribe y ambos completan la
  vinculación sin cámaras, fotos, archivos ni transcribir ofertas JSON completas.
- Alfabeto propuesto: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`,32 símbolos;8caracteres
  generados criptográficamente (40bits). Entrada sin distinción de mayúsculas,
  representación final mayúscula; no confundir0/O o1/I. Nunca código constante.
- Es código temporal de encuentro, NO código adulto ni recuperación, contraseña
  permanente, autoridad de órdenes o un resumen capaz de contener toda la oferta.
- Código adulto actual permanece5..10dígitos y conserva ceros iniciales.
- Confirmación adulta en ambos teléfonos, comprobación humana independiente de
  huellas/origen y validación/commit/readback existentes siguen siendo obligatorios.
  Conocer el código8 no habilita por sí solo guardar o aceptar una pareja.

## Separación de contratos y transporte propuestos

CHILD_OFFER, PAIR_ACCEPT, sus firmas, esquemas y bytes CP2 actuales se conservan.
No cambiar CP1 ni enviar PAIR por el relay de órdenes cp.v2. C8/1 será un transporte
de enrolamiento separado, versionado y acordado antes de implementar/sincronizar
su formato. Los puntos de este documento son requisitos, no un schema congelado.

Propuesta para respetar HTTP sólo health/keepalive: WSS separado, ruta/subprotocolo
propios y perfil de despliegue de enrolamiento explícito, inicialmente desactivado.
Sin añadir un controller HTTP de negocio ni convertir bootstrap/cp.v2 a abierto.
Las apps aún no tienen una pareja: no pueden usar AUTH familiar con claves fijadas
para descubrirla. Debe resolverse esta dependencia, NO quitar verificación AUTH.

Antes de intercambiar mensajes de enrolamiento, reto de un solo uso/10s ligado al
socket y prueba de posesión de identidad existente P256, con dominio C8/1 separado.
Esa autenticación provisional sólo acredita posesión de la clave declarada: NO
acredita identidad humana, permiso adulto o una familia autorizada, ni genera
AUTH_OKcp.v2. Alcance exclusivo de encuentro/entrega acotada. No órdenes/STATE/ACK.
El servicio requiere habilitación pública específica de ese perfil después de
contrato/pruebas; no hereda la habilitación de cp.v2 ni se despliega ahora.

## Flujo mínimo propuesto

1. Hijo, con identidad y ausencia de pareja coherentes, código adulto fresco y
   sesión original vigente, crea la oferta RAM existente sin obligar a crear QR.
2. Hijo abre el transporte C8 autorizado y publica esa oferta. El servidor verifica
   formato y que su pública coincide con la identidad provisional; crea código8
   aleatorio sin colisiones activas y una sesión RAM de duración fija no renovable.
3. Padre adulto introduce código8 en esa misma URL HTTPS real. Su prueba de posesión
   usa identidad existente, no crea otra. Una reclamación válida consume el código
   atómicamente y queda ligada a ESA conexión/identidad; no segundo reclamante.
4. Padre obtiene la oferta original y aplica sus guardas de legado/consentimiento,
   confirmación humana, preparación/códigos y firma/commit/readback habituales.
   Cambia sólo la entrega: envía PAIR_ACCEPT original por C8, no requiere cámara
   ni que QrLocal.generar tenga éxito. Sigue PENDIENTE_CONFIRMACION_HIJO.
5. Servidor comprueba firma padre y coincidencia de oferta/ambas públicas/origen
   antes de entregar al hijo. Sólo a la sesión iniciadora vinculada, sin listar
   ofertas, claves, códigos o intentos. No edita ni vuelve a firmar PAIR.
6. Hijo recibe candidata sin cámara, conserva confirmación humana independiente
   y VALIDAR/GUARDAR con códigos frescos dentro del marco original120s. Llama a
   ValidacionPairRam/PairAndroid reales; queda PENDIENTE_CANAL_Y_RECUPERACION.
7. Transporte entregado no es pareja guardada. Sin nuevo recibo unilateral o
   promociónACTIVO. Exportación pública/configuración de relay/STATE firmado
   posterior siguen el procedimiento existente; ningún permiso de uso por C8.

## Límites indispensables

- TLS/hostname normal hacia el mismo origen real, sin trustAll/CA de laboratorio.
- Código nunca en URL/query, logs, repositorio o historial; secret/capacidades sólo
  RAM. Ningún código adulto, privada ni recuperación en el servidor.
- Vida propuesta≤120s y nunca mayor al marco adulto restante del hijo. Relojes
  monotónicos locales independientes: no comparar elapsed de Android con Node.
  Regenerar/tickets/pings/reintentos no amplían la sesión original.
- Máximo propuesto16encuentros/18sockets, cargas≤16384/payload8192, profundidad6,
  límites globales/por socket y dirección real; no confiar en X-Forwarded-For.
- Límite estricto de intentos/ventana y respuesta genérica a código inexistente,
  consumido o expirado; cinco intentos fallidos por conexión como máximo, además
  de cupos globales. No prometer límite por código para un valor que no existe.
- Cierre/fondo/cancelación/caducidad/contexto cambiado invalidan capacidades RAM.
  La reserva consumida no vuelve a disponible por error, carrera o callback viejo.
- Interrupción tras persistir padre puede dejar pendiente sin entrega: preservar
  ese estado y comunicar incertidumbre, nunca borrar/volver a firmar/regenerar
  aceptación por atajo. Render reiniciado pierde encuentros RAM, no datos móviles.
- Sin nuevas claves familiares, migraciones, borrados, reinstalaciones, recuperación
  implícita, permisos offline, cambio de enforcement o excepción a emergencia.

## Revisión previa requerida

Padre e hijo deben confirmar cómo conservar las guardas de autoridad/huellas y
el marco120s sin depender de la cámara. Acordar mensajes exactos C8/1, autenticación
provisional, consumo/cancelación y comportamiento de pendientes ANTES de escribir
clientes o habilitar sockets nuevos. Tras acuerdo, una unidad vertical por rol:
servidor de encuentro y UI/transporte real en ambas apps, con firmas y pruebas
cruzadas. Nuevas APK y despliegue posterior; lo ya instalado no contiene esta opción.
