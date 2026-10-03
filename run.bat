@echo off
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" goto launch
call "%~dp0setup.bat"
if errorlevel 1 exit /b %ERRORLEVEL%

:launch
"%~dp0.venv\Scripts\python.exe" "%~dp0run.py" %*
exit /b %ERRORLEVEL%
