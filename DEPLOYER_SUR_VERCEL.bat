@echo off
echo ========================================
echo   DEPLOIEMENT COLLIMS SUR VERCEL
echo ========================================
echo.
echo Etape 1/3 : Connexion a Vercel...
echo.
vercel login
echo.
echo Etape 2/3 : Build de l'application...
echo.
call npm run build
echo.
echo Etape 3/3 : Deploiement en production...
echo.
vercel --prod
echo.
echo ========================================
echo   DEPLOIEMENT TERMINE !
echo ========================================
echo.
echo Votre lien Vercel s'affiche ci-dessus
echo.
pause




