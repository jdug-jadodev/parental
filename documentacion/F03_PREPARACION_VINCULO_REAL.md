# F03 — preparar actualización y vínculo real CP2

Origen real: `https://parental-0j3o.onrender.com` (sin barra final).
Servicio actual: bootstrap cerrado; no conectar las apps todavía.

## Artefactos cotejados desde el coordinador, sin acceder a teléfonos

| Rol | APK debug relativo a su repositorio | SHA256 |
|---|---|---|
| Padre | app-parent/build/outputs/apk/debug/app-parent-debug.apk | 38739ae2f2b33c1e059b14f98829df81d83b1b983a2de9f03fe632cabac92636 |
| Hijo | android/app-child/build/outputs/apk/debug/app-child-debug.apk | fc7a5bd82e6bfdcb0ae0434ce2d88be03eac2cc1390d73a339c9eb52c83108ed |

Ambos hashes coinciden con evidencia E2E01. No implica que estén instalados o que
su firma sea compatible con el APK actualmente instalado: cada rol debe verificarlo
en su propio procedimiento, con permiso físico directo. No repetir compilaciones
o pruebas ya cerradas si el artefacto no cambió.

## Autorización en cada sesión móvil

El coordinador prepara tareas, pero no traslada permisos físicos. Cada sesión debe
avisar y recibir habilitación directa del propietario antes de cualquier ADB,
incluyendo consultas. Padre sólo A56; hijo sólo A13 SM-A135M. Selector explícito
por operación; nunca actuar contra todos los dispositivos conectados.

Al conceder permiso, limitarlo a verificar destino/compatibilidad y actualizar
conservando datos, sin desinstalar, borrar, restablecer, cambiar Owner/PIN o migrar
almacenes. Cualquier incompatibilidad/legado/corrupción/pendiente incierto detiene
el paso, no autoriza limpiar para aparentar éxito. No heredar permisos F02/LOCAL08.
No reiniciar A13 (botón físico averiado), cortar red ni alterar protecciones.

## Ceremonia manual, tras autorización específica

1. Ambas APK actualizadas por sus proyectos, propietario presente, sin pruebas
   de bloqueo todavía. Preparar las dos pantallas antes de abrir ofertas efímeras.
2. Hijo: sesión adulta y oferta CP2 con identidad existente; padre: lectura óptica
   y confirmación presencial de huella/origen. No producir QR desde Node.
3. Padre: aceptación firmada/persistida pendiente y QR para lectura por hijo.
   Códigos adultos/recuperación sólo en teléfonos y custodia offline del propietario,
   nunca en chat, capturas persistentes, logs ni repositorio.
4. Hijo: comprobar huellas/origen independientes; VALIDAR y GUARDAR con los códigos
   frescos requeridos dentro del marco original120s. No renovar marco por tickets,
   regenerar para eludir vencimiento, resetear ni reintentar commits inciertos.
5. Recoger únicamente exportación pública CP2 del padre: PAIR_ID, ambas públicas
   y PUBLIC_ORIGIN. El relay usa el mismo valor de PAIR_ID como ACTIVE_PAIR_ID.
   No enviar oferta/aceptación QR completa ni códigos para configurar Render.

Guardar pareja no concede uso ni confirma canal/recuperación. Hijo queda pendiente
y padre no es ACTIVO por QR/AUTH_OK. Con esa exportación se prepara configuración
CP2 pública y despliegue por el propietario; después, otro ensayo autorizado de
AUTH→SYNC→STATE→orden→ACK/STATE con observación física. Primer piloto foreground
limitado120s, sin prometer appcerrada/Doze/uso habitual. Servidor no ejecuta ADB.
