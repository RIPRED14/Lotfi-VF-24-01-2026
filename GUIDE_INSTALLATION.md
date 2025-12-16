# 📦 Guide d'Installation et Déploiement

## 🎯 Installation sur d'autres ordinateurs

### ⭐ Méthode 1 : Application Portable (.exe) - LE PLUS SIMPLE (RECOMMANDÉ)

**Parfait pour les utilisateurs non-informatiques !**

#### Étape 1 : Créer l'application portable
```bash
npm run electron:portable
```

Cela créera un fichier `.exe` dans le dossier `release/` :
- Nom : `Contrôle Qualité Microbiologique X.X.X.exe`
- Taille : ~150 MB
- **Un seul fichier, pas d'installation !**

#### Étape 2 : Transférer le fichier
1. Copiez le fichier `.exe` sur un support USB ou un partage réseau
2. Transférez-le sur l'ordinateur cible

#### Étape 3 : Utiliser l'application (SIMPLE !)
1. **Double-cliquez** sur le fichier `.exe`
2. L'application se lance automatiquement
3. **C'est tout !** ✅

**Aucune installation nécessaire !**

**Instructions pour les utilisateurs :**
- Double-clic sur le fichier = ça marche !
- Mettez-le sur le Bureau pour un accès facile
- Voir aussi : `INSTRUCTIONS_UTILISATEURS.md`

---

### Méthode 2 : Installation via Installer Windows (Pour installation permanente)

#### Étape 1 : Créer l'installer
Sur votre ordinateur de développement, exécutez :
```bash
npm run electron:dist
```

Cela créera un fichier d'installation dans le dossier `release/` :
- `Contrôle Qualité Microbiologique Setup X.X.X.exe`

#### Étape 2 : Transférer l'installer
1. Copiez le fichier `.exe` sur un support USB ou un partage réseau
2. Transférez-le sur l'ordinateur cible

#### Étape 3 : Installer sur l'ordinateur cible
1. **Double-cliquez** sur le fichier `.exe`
2. Suivez l'assistant d'installation :
   - Choisissez le dossier d'installation (par défaut : `C:\Program Files\Contrôle Qualité Microbiologique`)
   - Acceptez les conditions
   - Cliquez sur "Installer"
3. Une fois installé, l'application sera disponible :
   - **Raccourci sur le Bureau**
   - **Menu Démarrer** → "Contrôle Qualité Microbiologique"

#### Étape 4 : Lancer l'application
- Double-cliquez sur le raccourci du Bureau
- Ou cherchez "Contrôle Qualité Microbiologique" dans le Menu Démarrer

---

### Méthode 2 : Installation Portable (Sans installer)

#### Étape 1 : Créer la version portable
```bash
npm run electron:pack
```

Cela créera un dossier `release/win-unpacked/` avec l'application complète.

#### Étape 2 : Transférer l'application
1. Copiez tout le dossier `win-unpacked` sur un support USB
2. Transférez-le sur l'ordinateur cible

#### Étape 3 : Utiliser l'application
1. Allez dans le dossier `win-unpacked`
2. Double-cliquez sur `Contrôle Qualité Microbiologique.exe`
3. L'application se lancera sans installation

**Avantage** : Fonctionne directement, pas besoin d'installer
**Inconvénient** : Pas de raccourcis automatiques

---

## 🔧 Prérequis pour l'installation

### Sur l'ordinateur cible (où vous installez l'application)

**Aucun prérequis nécessaire !** L'application Electron est autonome et inclut :
- ✅ Node.js (intégré)
- ✅ Toutes les dépendances (intégrées)
- ✅ Configuration Supabase (intégrée)

L'application fonctionne **indépendamment** du navigateur.

---

## 📋 Configuration Supabase

### ✅ Configuration automatique

L'application est **pré-configurée** avec :
- **URL Supabase** : `https://vwecfxtgqyuydhlvutvg.supabase.co`
- **Clé API** : Intégrée dans l'application

**Aucune configuration supplémentaire n'est nécessaire** sur les ordinateurs cibles.

---

## 🚀 Déploiement en réseau (Pour plusieurs ordinateurs)

### Option 1 : Partage réseau

1. Placez le fichier `.exe` dans un dossier partagé
2. Les utilisateurs peuvent installer depuis le réseau :
   - `\\Serveur\Partage\Contrôle Qualité Microbiologique Setup.exe`

### Option 2 : USB/Disque externe

1. Copiez le fichier `.exe` sur une clé USB
2. Installez sur chaque ordinateur depuis l'USB

### Option 3 : Email/Cloud

1. Partagez le fichier `.exe` via :
   - Email (si taille < 25MB)
   - OneDrive / Google Drive / Dropbox
   - Serveur FTP

---

## 📊 Taille de l'application

- **Installation** : ~150-200 MB (une fois installé)
- **Fichier installer** : ~100-150 MB

---

## 🔄 Mise à jour de l'application

### Pour mettre à jour l'application :

1. **Créer une nouvelle version** :
   ```bash
   npm run electron:dist
   ```

2. **Distribuer le nouvel installer** :
   - Les utilisateurs exécutent le nouvel installer
   - L'ancienne version sera remplacée automatiquement

### Note importante
Assurez-vous d'incrémenter la version dans `package.json` avant de créer un nouveau build.

---

## 🛠️ Dépannage

### L'application ne démarre pas

1. **Vérifiez les permissions** : L'utilisateur doit avoir les droits d'installation
2. **Désactivez l'antivirus temporairement** (parfois les bloqueurs détectent Electron)
3. **Installez en tant qu'administrateur** : Clic droit → "Exécuter en tant qu'administrateur"

### Erreur de connexion Supabase

- Vérifiez la connexion Internet
- Vérifiez que le firewall n'bloque pas l'application
- Contactez l'administrateur si le problème persiste

### L'application est lente

- Vérifiez les ressources système (RAM, CPU)
- Fermez les autres applications lourdes
- Redémarrez l'ordinateur si nécessaire

---

## 📞 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

## ✅ Checklist de déploiement

- [ ] Build créé avec `npm run electron:dist`
- [ ] Fichier `.exe` testé sur un ordinateur de test
- [ ] Icône de l'application configurée
- [ ] Version mise à jour dans `package.json`
- [ ] Documentation fournie aux utilisateurs
- [ ] Support technique disponible

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2025

