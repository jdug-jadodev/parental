# Estado del servidor separado

Origen: parental_padre, commit previo a extracción 308c2b1.
Estado: EXTRAIDO_Y_VERIFICADO_LOCAL — desarrollo posterior pendiente; no servicio público operativo.

Los 18 archivos propios de relay/ se trasladaron sin cambios y se compararon
por SHA-256 con el origen. Se conservaron dependencias/resultados existentes
(no versionados). Contrato/ejemplos/fixtures copiados sin modificaciones.
SPEC del relay y plan original copiados a documentacion/ como referencias.
Evidencias C01/C02 copiadas son historia anterior de ambos componentes,
no nuevas pruebas ni certificación del servidor en Render.

Pruebas tras separación: scripts/verificar.ps1 correcto, npm ci/check/build y
30 tests Node aprobados, cero omitidos/fallos. Diez vectores/78 comprobaciones
documentales correctas. Interoperabilidad opcional desde el padre con rutaRelay
al codec de este proyecto: un test aprobado, 20 cruces de firmas nuevas. No
demuestra autenticación, WSS público, Render real ni políticas del hijo.
Contrato/ejemplos/fixture se comparan por SHA-256 con el padre al cerrar extracción.
node_modules/dist ignorados; npm informó cero vulnerabilidades y aviso de script
esbuild sin aprobación añadida. No hubo funciones nuevas ni cambios en relay/src.
Ningún ADB ni despliegue. Próxima tarea R01 cuando el propietario decida
desarrollar este proyecto aparte. No avanzar funciones nuevas durante extracción.
