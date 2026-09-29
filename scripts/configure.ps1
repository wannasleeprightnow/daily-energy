<#
.SYNOPSIS
    Daily Energy — интерактивный конфигуратор и запуск проекта (PowerShell).

.DESCRIPTION
    Аналог scripts/configure.sh для Windows. Показывает меню режимов,
    пишет .env и .env.mode, затем может сразу поднять стек через docker compose.

    Нужен только Docker (Docker Desktop). bash / make не требуются.

.PARAMETER Mode
    Режим без меню: prod | dev | full

.PARAMETER Up
    Сразу выполнить `docker compose up --build` для выбранного режима.

.PARAMETER Down
    Остановить стек выбранного режима (docker compose down -v).

.PARAMETER Logs
    Смотреть логи выбранного режима (docker compose logs -f).

.EXAMPLE
    .\scripts\configure.ps1
    Меню + запись .env, затем подсказка как запустить.

.EXAMPLE
.\scripts\configure.ps1 full -Up
    Настроить локальный API и frontend с Telegram-моком и сразу поднять.

.EXAMPLE
    .\scripts\configure.ps1 prod -Logs
    Настроить прод и смотреть логи.
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('prod', 'dev', 'full')]
    [string]$Mode,

    [switch]$Up,
    [switch]$Down,
    [switch]$Logs
)

$ErrorActionPreference = 'Stop'

# --- Пути -------------------------------------------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir
$EnvFile   = Join-Path $RootDir '.env'
$EnvExample = Join-Path $RootDir 'example.env'
$ModeFile  = Join-Path $RootDir '.env.mode'

# --- Описание режимов -------------------------------------------------------
$Modes = @{
    prod = @{
        Title    = 'Продакшен (prod)'
        Desc     = 'postgres + backend + frontend + nginx (HTTPS)'
        Profiles = @('prod')
        Services = 'postgres backend-prod frontend-prod nginx-prod'
        MockTg   = 'false'
        Backend  = 'yes'
        Frontend = 'yes'
    }
    dev = @{
        Title    = 'Разработка — только бэкенд (dev)'
        Desc     = 'PostgreSQL + локальный backend API, без frontend'
        Profiles = @('dev')
        Services = 'postgres-dev backend-dev'
        MockTg   = 'true'
        ApiUrl   = 'http://localhost:8080'
        Backend  = 'yes'
        Frontend = 'no'
    }
    full = @{
        Title    = 'Разработка — локальный API + фронтенд (full)'
        Desc     = 'локальный API + frontend с Telegram WebApp mock'
        Profiles = @('dev-full')
        Services = 'postgres-dev backend-dev frontend-full'
        MockTg   = 'true'
        ApiUrl   = 'http://localhost:8080'
        Backend  = 'yes'
        Frontend = 'yes'
    }
}
$ModeOrder = @('prod', 'dev', 'full')

# --- Вспомогательные функции ------------------------------------------------
function Show-Banner {
    Write-Host 'Daily Energy — конфигурация окружения' -ForegroundColor Cyan
    Write-Host "Каталог проекта: $RootDir" -ForegroundColor DarkGray
    Write-Host ''
}

function Show-Menu {
    Show-Banner
    Write-Host 'Выберите режим запуска:'
    Write-Host ''
    for ($i = 0; $i -lt $ModeOrder.Count; $i++) {
        $key = $ModeOrder[$i]
        $m = $Modes[$key]
        Write-Host ("  {0}) " -f ($i + 1)) -ForegroundColor White -NoNewline
        Write-Host ("{0,-4}" -f $key) -ForegroundColor Green -NoNewline
        Write-Host " $($m.Title)"
        Write-Host ("        {0}" -f $m.Desc) -ForegroundColor DarkGray
    }
    Write-Host '  q) выход' -ForegroundColor White
    Write-Host ''
}

function Select-ModeInteractive {
    Show-Menu
    while ($true) {
        $choice = Read-Host 'Введите номер режима'
        switch ($choice) {
            'q' { Write-Host 'Отменено.'; exit 0 }
            'Q' { Write-Host 'Отменено.'; exit 0 }
            '1' { return 'prod' }
            '2' { return 'dev' }
            '3' { return 'full' }
            default { Write-Host 'Некорректный ввод, попробуйте снова.' -ForegroundColor Yellow }
        }
    }
}

# Установить KEY=VALUE в файле (заменить строку или дописать).
function Set-EnvVar {
    param([string]$Path, [string]$Key, [string]$Value)
    if (-not (Test-Path $Path)) { New-Item -ItemType File -Path $Path -Force | Out-Null }
    $lines = @(Get-Content -LiteralPath $Path)
    $pattern = "^\s*$([regex]::Escape($Key))="
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match $pattern) { $found = $true; "$Key=$Value" } else { $line }
    }
    if (-not $found) { $out += "$Key=$Value" }
    Set-Content -LiteralPath $Path -Value $out -Encoding UTF8
}

function Ensure-BaseEnv {
    if (Test-Path $EnvFile) { return }
    Write-Host 'Файл .env не найден.' -ForegroundColor Yellow
    if (Test-Path $EnvExample) {
        $answer = Read-Host 'Создать .env из example.env? [Y/n]'
        if ([string]::IsNullOrWhiteSpace($answer) -or $answer -match '^[YyДд]') {
            Copy-Item -LiteralPath $EnvExample -Destination $EnvFile
            Write-Host "Создан $EnvFile" -ForegroundColor Green
            Write-Host 'Заполните секреты (DB_*, TELEGRAM_BOT_TOKEN, API_KEY) перед прод-запуском.' -ForegroundColor Yellow
        } else {
            New-Item -ItemType File -Path $EnvFile -Force | Out-Null
        }
    } else {
        New-Item -ItemType File -Path $EnvFile -Force | Out-Null
    }
}

function Write-ModeOverlay {
    param([string]$Key)
    $profiles = ($Modes[$Key].Profiles -join ' ')
    $content = @(
        '# Generated by scripts/configure.ps1 — do not edit by hand.'
        "MODE=$Key"
        "COMPOSE_PROFILES=$profiles"
        "VITE_MOCK_TELEGRAM=$($Modes[$Key].MockTg)"
        "VITE_API_URL=$($Modes[$Key].ApiUrl)"
    )
    Set-Content -LiteralPath $ModeFile -Value $content -Encoding UTF8
}

function Invoke-Compose {
    param([string]$Key, [string[]]$ComposeArgs)
    $profiles = $Modes[$Key].Profiles
    $profileFlags = @()
    foreach ($p in $profiles) { $profileFlags += @('--profile', $p) }
    Push-Location $RootDir
    try {
        & docker compose @profileFlags @ComposeArgs
    } finally {
        Pop-Location
    }
}

# --- Основной сценарий ------------------------------------------------------
if (-not $Mode) {
    $Mode = Select-ModeInteractive
}

$m = $Modes[$Mode]

Ensure-BaseEnv
Write-ModeOverlay -Key $Mode

# Зеркалим фронтовые флаги в .env, чтобы совпадало с docker compose / vite.
Set-EnvVar -Path $EnvFile -Key 'VITE_MOCK_TELEGRAM' -Value $m.MockTg
Set-EnvVar -Path $EnvFile -Key 'VITE_API_URL' -Value $m.ApiUrl

Write-Host ''
Write-Host 'Готово. ' -ForegroundColor Green -NoNewline
Write-Host "Режим: $Mode" -ForegroundColor White
Write-Host "  Профили compose : $($m.Profiles -join ', ')"
Write-Host "  Сервисы         : $($m.Services)"
Write-Host "  Мок Telegram    : $($m.MockTg)"
Write-Host "  Backend         : $($m.Backend)"
Write-Host "  Frontend        : $($m.Frontend)"
Write-Host ''

# Проверяем наличие docker.
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host 'Docker CLI не найден в PATH.' -ForegroundColor Yellow
    Write-Host 'Запустите Docker Desktop и перезапустите терминал.' -ForegroundColor Yellow
    Write-Host 'Затем поднимите стек вручную:' -ForegroundColor Yellow
    $profileFlags = ($m.Profiles | ForEach-Object { "--profile $_" }) -join ' '
    Write-Host "  docker compose $profileFlags up --build" -ForegroundColor White
    exit 0
}

if ($Down) { Invoke-Compose -Key $Mode -ComposeArgs @('down', '-v'); exit $LASTEXITCODE }
if ($Logs) { Invoke-Compose -Key $Mode -ComposeArgs @('logs', '-f'); exit $LASTEXITCODE }
if ($Up)   { Invoke-Compose -Key $Mode -ComposeArgs @('up', '--build'); exit $LASTEXITCODE }

$profileFlags = ($m.Profiles | ForEach-Object { "--profile $_" }) -join ' '
Write-Host "Запуск: docker compose $profileFlags up --build" -ForegroundColor Cyan
Write-Host 'Либо сразу: .\scripts\configure.ps1 ' -NoNewline
Write-Host "$Mode -Up" -ForegroundColor White
