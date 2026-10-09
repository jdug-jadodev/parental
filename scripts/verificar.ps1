param()
$ErrorActionPreference = 'Stop'
function Ejecutar {
    param([string]$Programa, [string[]]$Argumentos)
    & $Programa @Argumentos
    if ($LASTEXITCODE -ne 0) { throw "Falló $Programa con código $LASTEXITCODE." }
}
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    Ejecutar 'pnpm' @('run', 'verificar')
} finally { Pop-Location }
