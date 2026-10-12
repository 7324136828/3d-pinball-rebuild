@echo off
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" goto launch
call "%~dp0setup.bat"
if errorlevel 1 exit /b %ERRORLEVEL%

:launch
if /i "%~1"=="--help" if "%~2"=="" goto start
if /i "%~1"=="-h" if "%~2"=="" goto start
rem Create settings.json as {}, fill missing ports, and re-read saved defaults.
"%~dp0.venv\Scripts\python.exe" "%~dp0run.py" --initialize-settings
if errorlevel 1 exit /b %ERRORLEVEL%
:start
"%~dp0.venv\Scripts\python.exe" "%~dp0run.py" %*
exit /b %ERRORLEVEL%
