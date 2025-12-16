# 🧪 Application de Contrôle Qualité Microbiologique

Application desktop et web pour la gestion des analyses microbiologiques dans le contrôle qualité alimentaire.

## 🚀 Démarrage Rapide

### Pour le développement (Web)
```bash
npm install
npm run dev
```
L'application sera disponible sur `http://localhost:8080`

### Pour le développement (Desktop Electron)
```bash
npm run electron:dev
```

### Pour créer l'installer Windows
```bash
npm run electron:dist
```
L'installer sera créé dans le dossier `release/`

## 📦 Installation sur d'autres ordinateurs

Voir le guide complet : **[GUIDE_INSTALLATION.md](./GUIDE_INSTALLATION.md)**

### Résumé rapide :
1. Créez l'installer : `npm run electron:dist`
2. Copiez le fichier `.exe` du dossier `release/`
3. Installez-le sur les ordinateurs cibles
4. Aucune configuration supplémentaire nécessaire !

## 🎯 Fonctionnalités

### 🔬 Gestion des Échantillons
- Saisie des échantillons alimentaires
- Contrôles organoleptiques (odeur, texture, goût, aspect)
- Mesure du pH
- Suivi par site (R1, R2, etc.)

### 🦠 Analyses Microbiologiques
- Support de 9+ types de bactéries
- Gestion des délais d'incubation (24h, 48h, 72h, 96h, 120h)
- Calcul automatique des jours de lecture
- Statuts en temps réel (prêt, en attente, en retard)

### 👥 Gestion des Rôles
- **Coordinateur** : Création et modification des formulaires
- **Technicien** : Saisie des analyses et résultats microbiologiques

## 🔧 Configuration

### Base de données Supabase
L'application est pré-configurée avec :
- **URL** : `https://vwecfxtgqyuydhlvutvg.supabase.co`
- **Clé API** : Intégrée dans l'application

Aucune configuration supplémentaire n'est nécessaire.

### Variables d'environnement (optionnel)
Si vous voulez utiliser un fichier `.env.local` :
```
VITE_SUPABASE_URL=https://vwecfxtgqyuydhlvutvg.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_api
```

## 📁 Structure du Projet

```
├── src/                    # Code source de l'application
│   ├── components/         # Composants React
│   ├── pages/             # Pages de l'application
│   ├── integrations/      # Configuration Supabase
│   └── ...
├── electron/              # Configuration Electron
│   ├── main.js           # Processus principal
│   └── preload.js        # Script de préchargement
├── build/                 # Fichiers de build
│   └── icons/            # Icônes de l'application
├── public/               # Fichiers publics
├── docs/                 # Documentation
└── release/              # Builds finaux (générés)
```

## 📚 Documentation

- **[GUIDE_INSTALLATION.md](./GUIDE_INSTALLATION.md)** - Guide complet d'installation et déploiement
- **[ELECTRON_README.md](./ELECTRON_README.md)** - Documentation Electron
- **[build/ICONE_GUIDE.md](./build/ICONE_GUIDE.md)** - Guide pour créer l'icône

## 🛠️ Scripts Disponibles

```bash
npm run dev              # Serveur de développement web
npm run build            # Build de production web
npm run electron:dev     # Application Electron (développement)
npm run electron:dist    # Créer l'installer Windows
npm run electron:pack    # Build portable (sans installer)
```

## 🎨 Icône de l'application

Pour personnaliser l'icône de l'application :
1. Créez une icône 512x512 pixels
2. Convertissez-la en `.ico` pour Windows
3. Placez les fichiers dans `build/icons/`
4. Voir le guide : [build/ICONE_GUIDE.md](./build/ICONE_GUIDE.md)

## 🔐 Sécurité

- ✅ Context Isolation activé
- ✅ Node Integration désactivé
- ✅ Web Security activé
- ✅ Configuration Supabase sécurisée

## 📊 Types de Bactéries Supportées

| Bactérie | Délai | Code |
|----------|-------|------|
| Entérobactéries | 24h | `entero` |
| Escherichia coli | 24h | `ecoli` |
| Coliformes totaux | 24h | `coliformes` |
| Staphylocoques | 24h | `staphylocoques` |
| Listeria | 48h | `listeria` |
| Levures/Moisissures (3j) | 72h | `levures3j` |
| Flore totales | 72h | `flores` |
| Leuconostoc | 96h | `leuconostoc` |
| Levures/Moisissures (5j) | 120h | `levures5j` |

## 🐛 Dépannage

### L'application ne démarre pas
- Vérifiez les permissions d'installation
- Exécutez en tant qu'administrateur
- Désactivez temporairement l'antivirus

### Erreur de connexion Supabase
- Vérifiez la connexion Internet
- Vérifiez le firewall
- Contactez l'administrateur

## 📝 Notes

- L'application fonctionne **indépendamment du navigateur**
- Aucun prérequis nécessaire sur les ordinateurs cibles
- Configuration Supabase intégrée et prête à l'emploi

## 📞 Support

Pour toute question, consultez la documentation ou contactez l'équipe de développement.

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2025
