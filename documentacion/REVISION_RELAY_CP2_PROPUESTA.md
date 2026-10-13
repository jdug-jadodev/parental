# Revisión del relay — CP/2 propuesta, no implementación

Fecha: 2026-10-13. Fuentes completas en lectura: PADRE-C04 1582e66,
HIJO-C07 8b25c24 y decisiones centrales §§17. CP/1 permanece congelado.
Una revisión propia del servidor; no acuerdo de versión o autorización pública.

## Resultado

Compatible como dirección, **no directamente implementable como contrato cerrado**.
El draft padre necesita integrar las correcciones del hijo y resolver pairing/
recuperación de la nueva versión. No activar cp.v2 aceptando campos nuevos bajo
cp.v1. El relay actual solo tiene cp.v1, esquema v1 y dominio CPv1; no soporta CP/2.

## Deltas mínimos por capas

- Configuración pública: perfil de pareja explícito, no elegido por el cliente.
  Una pareja no puede operar simultáneamente dos perfiles para evitar el corte
  de versión. Guardar solo públicas/origen/pareja/perfil, sin tiempo/historial.
- Upgrade: validar perfil exacto antes de admitir; subprotocolo acordado por
  configuración. Rechazar mezcla/fallback, mantener TLS/autenticación/cupos.
- Codec/crypto en borde: esquema nuevo separado, propósitos/dominios de firma,
  versión de sobre/payload/socket coincidentes, DER/base64/bytes originales.
  Validación cerrada, arrays solo en ruta aprobada, límites antes de trabajo caro.
- Autenticación: mismo reto ligado al socket/rol/pareja, consumo/expiración y
  sustitución solo tras firma válida. Configurar perfil no concede identidad nueva.
- Routing: padre SYNC_REQUEST/SET_POLICY; hijo STATE/ACK. No calcular permiso,
  contador, calendario, purga o resultado de orden. Reenviar bytes intactos.
- Dominio/aplicación: puertos y entidades sin Node/DTOs de protocolo. Composición
  en dependencias.ts, perfil inyectado sin lectura de infraestructura en dominio.
- HTTP: health/keepalive no publican historial/presencia/identidades. Ningún endpoint
  de credencial, recuperación, tokens push o uso añadido por esta revisión.

## Correcciones necesarias del draft

1. Quitar LOCK_FOR, deferredAllowSec, WAITING_ALLOW y apertura automática en todos
   los campos/enums/trazas/reglas. Mantener LOCK, ALLOW, ALLOW_FOR y expiración de
   permiso. Alcance libre local y rango de duración aún por explicitar.
2. Incorporar permittedTime.days cerrado y ordenado con máximo ocho fechas, no
   arrays libres. Snapshot absoluto, subtotal/calidad, revisión contable/retención
   distintos de seq remoto/controlRevision; sin historias por app o intervalos.
3. Materialización/corte/día/calendario/anti-resurrección pertenecen a clientes.
   El relay puede validar coherencia estructural acordada, no verificar hora civil
   real del hijo/padre ni borrar sus registros. Evitar convertir firma en frescura:
   sync/contexto en receptor, firma solo acredita origen/integridad de bytes.
4. ACK histórico no lleva modo/total o reemplaza STATE; errores/presencia/heartbeat
   de relay no resuelven pending ni implican bloqueo aplicado/red validada del hijo.
5. Push queda componente por evaluar separadamente: no interpretar hint como
   orden o snapshot firmado, no emisión/tokens/secretos/historial en relay por
   inferencia. Antes de implementarlo acordar proveedor/emisor/privacidad/coste,
   credenciales/retención/permiso/notificaciones y recepción Android reales.

## Ejercicio de tamaño ejecutado

Node local, sin importar codec ni crypto: JSON sintético con ocho buckets, campos
no nulos, contadores decimales de 19 caracteres, zona de 64 caracteres y relleno de
firma de 72 bytes para medir su longitud base64url. No archivo guardado o fixture.

| Medida | Resultado |
|---|---:|
| Payload UTF-8 | 2966 bytes |
| Sobre UTF-8 con payload base64url | 4122 bytes |
| Profundidad de objetos/array del payload | 4 |
| Margen respecto a payload 8192 | 5226 bytes |
| Margen respecto a frame 16384 | 12262 bytes |

**No es cota formal ni prueba de protocolo:** zona ficticia no IANA válida,
combinaciones deliberadamente incompatibles para tamaño, remainingSec amplio sin
rango aprobado, relleno no firma DER válida. No se verificó firma/semántica o
implementó codec v2. El resultado indica margen para el caso construido, no
ausencia de desbordes para cada forma futura. No aumentar límites por costumbre.
Al cerrar contrato derivar cota de tipos/campos y pruebas de frontera independientes
en los tres codecs (incluido base64url/sobre/UTF-8/profundidad/array 9/orden/extra).

## Bloqueos y siguiente paso

- Ratificar rango de tiempo/ALLOW local y política de calendario/purga. Domingo21
  confirmado; catch-up lógico no garantiza borrado forense mientras equipo apagado.
- Consolidar draft con tablas de combinaciones cerradas: fecha/zona/nulos/cortes,
  epoch/revisiones/máximos agotados, snapshots más antiguos y UNKNOWN sin cero ficticio.
- PAIR/OFFLINE de nueva instalación y ruta de recuperación/migración siguen por
  especificar antes del acuerdo; no habilitar MESSAGE nuevo con recuperación rota.
- Revisar juntos y acordar versión antes de crear esquema/vectores separados o
  sincronizar copias. Plan/puertas no cambiados por esta revisión.

Sin código/CP1/fixtures/planes/credenciales/apps modificados, builds/tests nuevos,
dispositivos/ADB/permisos/CA/LAN/push/despliegue o barreras locales relajadas.
