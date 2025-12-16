# 🚀 Guide de Déploiement Rapide

## 📋 Étapes pour installer l'application sur d'autres ordinateurs

### Étape 1 : Créer l'installer (sur votre ordinateur)

```bash
npm run electron:dist
```

⏱️ **Temps estimé** : 5-10 minutes (première fois)

📁 **Résultat** : Un fichier `.exe` sera créé dans `release/`
- Nom : `Contrôle Qualité Microbiologique Setup X.X.X.exe`
- Taille : ~100-150 MB

---

### Étape 2 : Transférer l'installer

**Option A : USB/Disque externe**
1. Copiez le fichier `.exe` sur une clé USB
2. Branchez l'USB sur l'ordinateur cible
3. Copiez le fichier sur le bureau de l'ordinateur cible

**Option B : Partage réseau**
1. Placez le fichier dans un dossier partagé
2. Accédez depuis l'ordinateur cible : `\\Serveur\Partage\`
3. Copiez le fichier

**Option C : Email/Cloud**
- Si le fichier est < 25MB, envoyez-le par email
- Ou utilisez OneDrive/Google Drive/Dropbox

---

### Étape 3 : Installer sur l'ordinateur cible

1. **Double-cliquez** sur le fichier `.exe`
2. Si Windows demande une confirmation :
   - Cliquez sur "Oui" ou "Exécuter"
3. Suivez l'assistant d'installation :
   - Choisissez le dossier d'installation (ou gardez le défaut)
   - Cliquez sur "Installer"
   - Attendez la fin de l'installation
4. Cliquez sur "Terminer"

---

### Étape 4 : Lancer l'application

**Méthode 1 : Raccourci Bureau**
- Double-cliquez sur l'icône sur le Bureau

**Méthode 2 : Menu Démarrer**
- Cliquez sur le menu Démarrer (⊞)
- Tapez "Contrôle Qualité"
- Cliquez sur l'application

**Méthode 3 : Dossier d'installation**
- Allez dans `C:\Program Files\Contrôle Qualité Microbiologique\`
- Double-cliquez sur `Contrôle Qualité Microbiologique.exe`

---

## ✅ Vérification

Une fois l'application lancée, vérifiez que :
- ✅ L'application s'ouvre correctement
- ✅ La connexion à Supabase fonctionne (vérifiez dans la console F12)
- ✅ Vous pouvez vous connecter/utiliser l'application

---

## 🔄 Mise à jour de l'application

Pour mettre à jour l'application sur les ordinateurs :

1. **Créez une nouvelle version** :
   ```bash
   # Incrémentez la version dans package.json d'abord
   npm run electron:dist
   ```

2. **Distribuez le nouvel installer** :
   - Les utilisateurs exécutent le nouvel installer
   - L'ancienne version sera remplacée automatiquement

---

## ⚠️ Notes importantes

- **Aucune configuration nécessaire** : L'application est pré-configurée avec Supabase
- **Pas de prérequis** : Aucun logiciel supplémentaire n'est nécessaire
- **Fonctionne hors ligne** : L'application fonctionne même sans navigateur
- **Internet requis** : Pour se connecter à Supabase (base de données)

---

## 🐛 Problèmes courants

### "Windows a protégé votre ordinateur"
- Cliquez sur "Plus d'infos"
- Cliquez sur "Exécuter quand même"

### L'application ne démarre pas
- Vérifiez les permissions d'installation
- Exécutez en tant qu'administrateur : Clic droit → "Exécuter en tant qu'administrateur"

### Erreur de connexion
- Vérifiez la connexion Internet
- Vérifiez que le firewall n'bloque pas l'application

---

## 📞 Support

Pour toute question, consultez `GUIDE_INSTALLATION.md` ou contactez l'équipe de développement.

---

**Version** : 1.0.0









