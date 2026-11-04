@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1" %*
set "subtitleExit=%ERRORLEVEL%"
echo.
if not "%subtitleExit%"=="0" echo Installation did not complete. See the message above.
pause
exit /b %subtitleExit%
