@echo off
echo ========================================
echo   COLLIMS - Version WEB
echo ========================================
echo.
echo Demarrage du serveur web...
echo.
cd /d "%~dp0V31-master"
start "" "http://localhost:8080"
npm run dev




