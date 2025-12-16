# 🔧 Solution pour l'erreur de copie

## ❌ Erreur rencontrée
Erreur 0x8007045D : Erreur de périphérique d'E/S lors de la copie

## ✅ Solutions

### Solution 1 : Utiliser l'archive ZIP (RECOMMANDÉ)

Une archive ZIP a été créée dans le dossier `release\` :
- **Nom** : `Application_Controle_Qualite.zip`
- **Taille** : Environ 150-200 MB

**Comment utiliser :**
1. Copiez le fichier `Application_Controle_Qualite.zip` sur votre USB
2. Sur l'ordinateur cible :
   - Clic droit sur le fichier ZIP
   - Cliquez sur "Extraire tout..."
   - Choisissez un dossier (par exemple : Bureau)
   - Cliquez sur "Extraire"
3. Double-cliquez sur `Contrôle Qualité Microbiologique.exe` dans le dossier extrait

### Solution 2 : Copier avec un autre outil

Si la copie Windows ne fonctionne pas :
1. Utilisez **7-Zip** ou **WinRAR** pour copier
2. Ou utilisez la ligne de commande :
   ```cmd
   xcopy "release\win-unpacked" "Destination\" /E /I /H
   ```

### Solution 3 : Vérifier le périphérique

1. **Vérifiez votre clé USB** :
   - Essayez une autre clé USB
   - Formatez la clé USB (FAT32)
   - Vérifiez qu'il y a assez d'espace (200 MB minimum)

2. **Vérifiez les permissions** :
   - Clic droit sur le dossier `win-unpacked`
   - Propriétés → Onglet "Sécurité"
   - Vérifiez que vous avez les droits de lecture

### Solution 4 : Utiliser un partage réseau

Au lieu de copier sur USB :
1. Partagez le dossier `release\win-unpacked` sur le réseau
2. Les utilisateurs peuvent accéder directement depuis leur ordinateur

## 💡 Solution la plus simple

**Utilisez l'archive ZIP** qui a été créée :
- `release\Application_Controle_Qualite.zip`
- Plus facile à copier
- Plus rapide
- Moins de risques d'erreurs

---

**Le fichier ZIP est prêt à être copié !**









