# Guide Electron - Application Desktop

## 📦 Configuration Electron

L'application a été configurée pour fonctionner comme une application desktop autonome avec Electron.

### ✅ Configuration Supabase

La configuration Supabase est **complètement intégrée** dans Electron :
- ✅ URL : `https://vwecfxtgqyuydhlvutvg.supabase.co`
- ✅ Clé API : Configurée par défaut
- ✅ Compatible avec les variables d'environnement
- ✅ Fonctionne en mode développement et production

### 🚀 Commandes Disponibles

#### Mode Développement Electron
```bash
npm run electron:dev
```
Lance l'application Electron en mode développement avec hot-reload.

#### Build de Production
```bash
npm run electron:dist
```
Crée un exécutable Windows (.exe) dans le dossier `release/`.

#### Build sans Installer
```bash
npm run electron:pack
```
Crée un build sans créer d'installer.

### 📁 Structure des Fichiers Electron

```
electron/
├── main.js       # Processus principal Electron
└── preload.js    # Script de préchargement (sécurité)
```

### 🔧 Configuration Supabase dans Electron

Les variables d'environnement Supabase sont automatiquement :
1. Chargées depuis `.env.local` si disponible
2. Sinon, utilisent les valeurs par défaut (nouvelles valeurs professionnelles)
3. Injectées dans le processus renderer via `process.env`

### 🎯 Build pour Windows

Le build crée un installateur NSIS dans `release/` avec :
- ✅ Installation personnalisable
- ✅ Raccourci sur le bureau
- ✅ Raccourci dans le menu Démarrer

### ⚠️ Notes Importantes

1. **Premier Build** : Le premier build peut prendre plusieurs minutes car Electron doit télécharger les binaires.

2. **Variables d'Environnement** : Les valeurs Supabase sont incluses dans le build, donc pas besoin de `.env.local` en production.

3. **Sécurité** : L'application utilise `contextIsolation: true` pour la sécurité.

### 🐛 Dépannage

Si vous avez des erreurs :
1. Vérifiez que toutes les dépendances sont installées : `npm install`
2. Vérifiez que le build Vite fonctionne : `npm run build`
3. Consultez les logs dans la console Electron (F12)









