import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration Supabase - Utilise les valeurs par défaut
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vwecfxtgqyuydhlvutvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZWNmeHRncXl1eWRobHZ1dHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzY5OTQsImV4cCI6MjA3NzMxMjk5NH0.6oZR5-NV8XDxQgIJlm4R7zarf5kFg0-tN26ko_kpye8';

// Charger les variables d'environnement depuis .env.local si disponible
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      const value = values.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.log('⚠️ Fichier .env.local non trouvé, utilisation des valeurs par défaut');
}

// Injecter les variables d'environnement Supabase dans le processus
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      // Forcer l'activation des événements de saisie
      spellcheck: false,
      // Assurer que les événements clavier fonctionnent
      disableBlinkFeatures: '',
      // Désactiver le cache pour éviter les problèmes de focus
      cache: false
    },
    icon: existsSync(join(__dirname, '..', 'build', 'icons', 'icon.ico')) 
      ? join(__dirname, '..', 'build', 'icons', 'icon.ico')
      : join(__dirname, '..', 'public', 'favicon.ico'),
    title: 'COLLIMS',
    show: false // Ne pas afficher jusqu'à ce que la page soit chargée
  });

  // Afficher la fenêtre une fois que le contenu est chargé
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Forcer le focus sur le contenu de la page
    mainWindow.webContents.focus();
    console.log('✅ Fenêtre Electron prête');
    console.log('✅ Configuration Supabase:', {
      url: process.env.VITE_SUPABASE_URL,
      key: process.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
    });
  });

  // Forcer le focus après chaque navigation (pour les formulaires suivants)
  mainWindow.webContents.on('did-navigate', () => {
    console.log('🔄 Navigation détectée - Restauration du focus');
    setTimeout(() => {
      mainWindow.webContents.focus();
    }, 100);
  });

  // Forcer le focus après chaque changement de hash (pour React Router)
  mainWindow.webContents.on('did-navigate-in-page', () => {
    console.log('🔄 Navigation interne détectée - Restauration du focus');
    setTimeout(() => {
      mainWindow.webContents.focus();
    }, 100);
  });

  // Charger l'application
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Mode développement - se connecter au serveur Vite
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // Mode production - charger depuis le build
    // Dans Electron, les fichiers sont dans resources/app.asar
    // Dans le build, __dirname pointe vers resources/app.asar/electron
    // Donc dist est à resources/app.asar/dist
    const indexPath = join(__dirname, '..', 'dist', 'index.html');
    
    console.log('📁 Mode production');
    console.log('📁 __dirname:', __dirname);
    console.log('📁 Chemin index.html:', indexPath);
    
    // Utiliser loadFile qui gère automatiquement les chemins dans app.asar
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error('❌ Erreur lors du chargement:', error);
      // Afficher une page d'erreur informative
      const errorHtml = `
        <html>
          <head>
            <title>Erreur de chargement</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
              .error-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #e74c3c; }
              code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="error-box">
              <h1>❌ Erreur de chargement</h1>
              <p>Impossible de charger l'application.</p>
              <p><strong>Chemin essayé:</strong> <code>${indexPath}</code></p>
              <p><strong>__dirname:</strong> <code>${__dirname}</code></p>
              <p><strong>Erreur:</strong> ${error.message}</p>
              <hr>
              <p><small>Vérifiez que le build a été effectué correctement.</small></p>
            </div>
          </body>
        </html>
      `;
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Gestion du cycle de vie de l'application
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Gérer les erreurs de chargement
app.on('web-contents-created', (event, contents) => {
  contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -106) {
      console.error('❌ Erreur de chargement:', errorDescription, validatedURL);
    }
  });
});

