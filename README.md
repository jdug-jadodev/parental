# Control parental — servidor Render independiente

Servidor Node.js 24 / TypeScript con `src/` y paquete npm en la raíz. Las apps padre e hijo no forman
parte de este proyecto y no se modifican desde aquí. CP/1 en `compartido/`
y los fixtures permanecen congelados.

## Estado: R01, base segura local

Validación de configuración pública, claves SPKI P-256 distintas, HTTP y
límites iniciales. Transporte WebSocket preparado sin compresión y con máximo
de 16 KiB, **todavía no conectado al servidor HTTP**.

**No operativo públicamente:** escucha solo en `127.0.0.1`, `/healthz` devuelve
503, upgrades rechazados y arranque en producción bloqueado. Incluso con
configuración válida no se anuncia CP/1 listo hasta completar R02/R03.

## Verificación con Node.js, sin Python

Desde la raíz del proyecto:

```sh
npm run verificar
```

Instala con `npm ci`, chequea TypeScript, compila, ejecuta tests, valida ejemplos
contra el esquema y verifica vectores criptográficos. Como alternativa Windows
se conserva `powershell -File scripts/verificar.ps1` desde la raíz.
Para arrancar la base local: `npm run build` y `npm start`.

Sin variables públicas se permite la base local no operativa. Si se proporciona
alguna de `PUBLIC_ORIGIN`, `ACTIVE_PAIR_ID`, `PARENT_PUBLIC_KEY_B64` o
`CHILD_PUBLIC_KEY_B64`, se exige el conjunto completo y válido. Solo públicas;
nunca claves privadas, códigos de recuperación ni historial.

## Próximas etapas, una por turno

- R02: autenticación por reto ligada al socket, expiración y firma del rol.
- R03: retransmisión autenticada, latidos, límites operativos y preparación
  de Render. Probar primero con dos clientes Node locales, sin tocar las apps.
- Integración posterior con las apps y despliegue: requieren coordinación y
  autorización; no se han realizado aquí. ACK de relay no significa orden aplicada.

Referencias: `documentacion/SPEC_RELAY_RENDER.md` y R01–R03 de
`documentacion/PLAN_ORIGEN_PADRE.md` (histórico, no ejecutar tareas Android).
La mención al antiguo verificador Python en documentación congelada/histórica
no es una dependencia: su reemplazo es `npm run test:esquema` desde la raíz.

La herramienta Node de interoperabilidad está en `test/soporte/interoperabilidad.mjs`.
Una integración Kotlin futura debe apuntar a la raíz de `parental_render` y
coordinarse desde el proyecto del padre; no se modificaron sus rutas ni código.
No hace falta Android para verificar este servidor.

## Arquitectura hexagonal

```text
src/
  domain/                       clases y reglas sin Node.js ni bibliotecas
  application/
    ports/input/                contratos usados por los controladores
    ports/output/               contratos usados por los casos de uso
    use-cases/                  implementaciones de puertos de entrada
  infrastructure/
    adapters/                   implementaciones de puertos de salida
    config/                     controlador, DTOs y mapper de configuración
    http/                       servidor, controlador, DTOs y mapper HTTP
    websocket/                  controlador, DTOs, entidades, mappers y transporte
    protocol/                   codec y criptografía técnica de CP/1
  bootstrap/                    composición e inyección por constructor
  main.ts                       arranque local y cierre
test/                           pruebas unitarias, arquitectura y HTTP local
```

Los controladores reciben puertos de entrada; los casos de uso reciben puertos
de salida; solo `bootstrap/` construye las dependencias concretas. Los mappers
separan DTO request → dominio, dominio → DTO response y dominio ↔ entidad
del handshake WebSocket. No hay ORM ni entidades de base de datos.

Los tipos del contrato CP/1 son DTOs de transporte, no entidades de dominio.
Los bytes firmados siguen intactos: no pasan por mappers que reserialicen JSON.
Autenticación y mensajes operativos se implementarán en R02/R03 bajo estas reglas.
Ver detalles en `documentacion/ARQUITECTURA.md`. El código de `src/` no contiene
comentarios; la explicación vive en documentación.
