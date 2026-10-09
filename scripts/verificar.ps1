param()
$ErrorActionPreference = 'Stop'
function Ejecutar {
    param([string]$Programa, [string[]]$Argumentos)
    & $Programa @Argumentos
    if ($LASTEXITCODE -ne 0) { throw "Falló $Programa con código $LASTEXITCODE." }
}
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    Push-Location 'relay'
    try {
        Ejecutar 'npm.cmd' @('ci')
        Ejecutar 'npm.cmd' @('run', 'check')
        Ejecutar 'npm.cmd' @('run', 'build')
        Ejecutar 'npm.cmd' @('test')
    } finally { Pop-Location }
    Ejecutar 'node' @('pruebas/verificar_vectores.mjs')
    Write-Host 'Verificación local del servidor terminada. Sin despliegue ni dispositivos.'
} finally { Pop-Location }
