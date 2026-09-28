@echo off
REM ---------------------------------------------------------------------------
REM Daily Energy — Windows launcher for scripts/configure.sh
REM
REM The configurator itself is a POSIX shell script (the project deploys to
REM Linux), so on Windows we delegate to a bash that understands the script.
REM Preference order: WSL, then Git Bash.
REM
REM Usage:
REM   scripts\configure.cmd            :: interactive menu
REM   scripts\configure.cmd prod       :: non-interactive
REM ---------------------------------------------------------------------------
setlocal

set "SCRIPT_DIR=%~dp0"
set "SCRIPT=%SCRIPT_DIR%configure.sh"

if not exist "%SCRIPT%" (
	echo [configure] Не найден %SCRIPT% >&2
	exit /b 1
)

REM Normalise the path for WSL (/mnt/c/...) from the Windows path.
where wsl.exe >nul 2>nul
if %ERRORLEVEL%==0 (
	for /f "usebackq delims=" %%i in (`wsl.exe wslpath -a "%SCRIPT%"`) do set "WSL_SCRIPT=%%i"
	if defined WSL_SCRIPT (
		wsl.exe bash "%WSL_SCRIPT%" %*
		exit /b %ERRORLEVEL%
	)
)

REM Fall back to Git Bash if present.
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if exist "%GIT_BASH%" (
	"%GIT_BASH%" "%SCRIPT%" %*
	exit /b %ERRORLEVEL%
)

echo [configure] Не найден WSL или Git Bash. Установите один из них,
echo [configure] либо запустите скрипт из Linux/macOS: ./scripts/configure.sh
exit /b 1
