@echo off
REM Production-only Windows entry point. Delegates to the POSIX configurator.
setlocal

set "SCRIPT_DIR=%~dp0"
set "SCRIPT=%SCRIPT_DIR%configure.sh"

if not exist "%SCRIPT%" (
    echo [configure] Missing %SCRIPT% 1>&2
    exit /b 1
)

where wsl.exe >nul 2>nul
if %ERRORLEVEL%==0 (
    for /f "usebackq delims=" %%i in (`wsl.exe wslpath -a "%SCRIPT%"`) do set "WSL_SCRIPT=%%i"
    if defined WSL_SCRIPT (
        wsl.exe bash "%WSL_SCRIPT%" %*
        exit /b %ERRORLEVEL%
    )
)

set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if exist "%GIT_BASH%" (
    "%GIT_BASH%" "%SCRIPT%" %*
    exit /b %ERRORLEVEL%
)

echo [configure] Install WSL or Git Bash, then run this script again. 1>&2
exit /b 1
