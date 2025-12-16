@echo off
cd /d "%~dp0V31-master"
echo ========================================
echo   DEPLOIEMENT AUTOMATIQUE SUR VERCEL
echo ========================================
echo.
echo Etape 1: Build de l'application...
call npm run build
echo.
echo Etape 2: Deploiement sur Vercel...
echo.
(
echo y
echo.
echo n
echo collims
echo ./
) | vercel --prod
echo.
echo ========================================
echo   DEPLOIEMENT TERMINE !
echo ========================================
pause




