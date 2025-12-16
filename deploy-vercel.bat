@echo off
echo ========================================
echo   DEPLOIEMENT COLLIMS SUR VERCEL
echo ========================================
echo.
cd /d "%~dp0V31-master"
echo Etape 1: Connexion a Vercel...
echo.
call vercel login
echo.
echo Etape 2: Build de l'application...
echo.
call npm run build
echo.
echo Etape 3: Deploiement sur Vercel...
echo Nom du projet: collims
echo.
call vercel --prod --name collims --yes
echo.
echo ========================================
echo   DEPLOIEMENT TERMINE !
echo ========================================
echo.
echo Votre lien Vercel s'affiche ci-dessus ^
echo.
pause




