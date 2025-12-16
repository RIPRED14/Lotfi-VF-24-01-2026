# 🚀 Guide pour mettre LOTFIV5 sur GitHub

## 📋 Prérequis

1. **Compte GitHub** : Créez un compte sur [github.com](https://github.com) si vous n'en avez pas
2. **Git installé** : Téléchargez depuis [git-scm.com](https://git-scm.com/)

## 🎯 Méthode Automatique (Recommandée)

### Étape 1 : Créer le repository sur GitHub
1. Allez sur [github.com](https://github.com)
2. Cliquez sur **"New repository"** (bouton vert)
3. Nommez votre repository : `lotfiv5-microbiologie`
4. Ajoutez une description : `Système de gestion microbiologique`
5. Laissez **Public** ou choisissez **Private**
6. **NE PAS** cocher "Add a README file"
7. Cliquez sur **"Create repository"**

### Étape 2 : Lancer le script automatique
```bash
# Dans votre dossier lotfiv5-master
setup-github.bat
```

Le script va :
- ✅ Configurer Git
- ✅ Créer le .gitignore
- ✅ Créer un README professionnel
- ✅ Ajouter tous vos fichiers
- ✅ Faire le commit initial
- ✅ Pousser vers GitHub

## 🔧 Méthode Manuelle

Si vous préférez faire étape par étape :

### 1. Configuration Git
```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

### 2. Initialiser le repository
```bash
cd lotfiv5-master
git init
```

### 3. Ajouter les fichiers
```bash
git add .
git commit -m "🚀 Initial commit - LOTFIV5 Microbiological System"
```

### 4. Connecter à GitHub
```bash
git remote add origin https://github.com/VOTRE_USERNAME/lotfiv5-microbiologie.git
git branch -M main
git push -u origin main
```

## 🔑 Authentification GitHub

### Option 1 : Personal Access Token (Recommandé)
1. Allez dans **Settings** > **Developer settings** > **Personal access tokens**
2. Cliquez **"Generate new token (classic)"**
3. Sélectionnez les permissions : `repo`, `workflow`
4. Copiez le token généré
5. Utilisez ce token comme mot de passe lors du push

### Option 2 : GitHub CLI
```bash
# Installer GitHub CLI
winget install GitHub.cli

# S'authentifier
gh auth login
```

## 📁 Structure du projet sur GitHub

Votre repository contiendra :

```
lotfiv5-microbiologie/
├── 📄 README.md                    # Documentation principale
├── 📄 .gitignore                   # Fichiers à ignorer
├── 📄 package.json                 # Dépendances Node.js
├── 📁 src/                         # Code source React
├── 📁 public/                      # Fichiers publics
├── 📁 supabase/                    # Configuration Supabase
├── 🔧 fix-bacteria-display.html    # Scripts de correction
├── 🔧 test-lectures-attente.html   # Scripts de test
├── 📚 README_BACTERIA_SYSTEM.md    # Documentation bactéries
├── 📚 SUPABASE_SETUP.md           # Guide Supabase
└── 📚 deployment-guide.md          # Guide de déploiement
```

## 🎉 Après la mise sur GitHub

### 1. Vérifier le repository
- Allez sur votre repository GitHub
- Vérifiez que tous les fichiers sont présents
- Le README.md s'affiche automatiquement

### 2. Configurer GitHub Pages (optionnel)
1. **Settings** > **Pages**
2. Source : **Deploy from a branch**
3. Branch : **main** / **docs**
4. Votre site sera disponible sur : `https://username.github.io/lotfiv5-microbiologie`

### 3. Inviter des collaborateurs
1. **Settings** > **Manage access**
2. **Invite a collaborator**
3. Entrez l'email ou username

### 4. Configurer les issues et projets
- **Issues** : Pour tracker les bugs et améliorations
- **Projects** : Pour organiser le développement
- **Wiki** : Pour la documentation détaillée

## 🔄 Mises à jour futures

Pour mettre à jour votre repository :

```bash
# Ajouter les modifications
git add .
git commit -m "✨ Description des changements"
git push
```

## 🆘 Résolution de problèmes

### Erreur d'authentification
```bash
# Vérifier la configuration
git config --list

# Réinitialiser les credentials
git config --global --unset user.name
git config --global --unset user.email
```

### Repository déjà existant
```bash
# Supprimer l'origine existante
git remote remove origin

# Ajouter la nouvelle origine
git remote add origin https://github.com/USERNAME/REPO.git
```

### Fichiers trop volumineux
```bash
# Voir les gros fichiers
git ls-files | xargs ls -la | sort -k5 -rn | head

# Supprimer du tracking
git rm --cached fichier-volumineux
echo "fichier-volumineux" >> .gitignore
```

## 📞 Support

- 📖 [Documentation Git](https://git-scm.com/doc)
- 📖 [Documentation GitHub](https://docs.github.com/)
- 💬 [GitHub Community](https://github.community/)

---

🎯 **Votre projet LOTFIV5 sera bientôt sur GitHub !** 🚀 