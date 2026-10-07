<#
.SYNOPSIS
    Prepare and run the production Docker Compose stack on Windows.

.PARAMETER Up
    Build and start the production stack.

.PARAMETER Down
    Stop the stack and remove database volumes.

.PARAMETER Stop
    Stop the stack while preserving database volumes.

.PARAMETER Logs
    Follow production logs.
#>
[CmdletBinding()]
param(
    [switch]$Up,
    [switch]$Down,
    [switch]$Stop,
    [switch]$Logs
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $RootDir '.env'
$EnvExample = Join-Path $RootDir '.env.example'

if (-not (Test-Path -LiteralPath $EnvFile)) {
    if (-not (Test-Path -LiteralPath $EnvExample)) {
        throw "Missing environment template: $EnvExample"
    }

    Copy-Item -LiteralPath $EnvExample -Destination $EnvFile
    Write-Host "Created $EnvFile. Fill in production secrets before deployment." -ForegroundColor Yellow
}

$ComposeArgs = @()
if ($Down) {
	$ComposeArgs = @('down', '-v', '--remove-orphans')
} elseif ($Stop) {
	$ComposeArgs = @('down', '--remove-orphans')
} elseif ($Logs) {
    $ComposeArgs = @('logs', '-f')
} elseif ($Up) {
	$ComposeArgs = @()
} else {
    Write-Host 'Production environment is ready. Use -Up to start the stack.' -ForegroundColor Green
    exit 0
}

Push-Location $RootDir
try {
    if ($Up) {
        & docker compose --parallel 1 build backend-prod
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }

        & docker compose --parallel 1 build frontend-prod
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }

        & docker compose up -d --remove-orphans
    } else {
        & docker compose @ComposeArgs
    }
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
