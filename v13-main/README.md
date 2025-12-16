# Système de Contrôle Qualité Microbiologique v14

## 🔬 Description

Système complet de gestion et de contrôle qualité microbiologique développé pour les laboratoires agroalimentaires. Cette application web permet la gestion des échantillons, l'analyse microbiologique, et le suivi des résultats de contrôle qualité.

## ✨ Fonctionnalités Principales

### 🧪 Gestion des Échantillons
- **Saisie d'échantillons** : Interface intuitive pour l'enregistrement des échantillons
- **Informations détaillées** : Site, produit, heure de fabrication, DLC, etc.
- **Traçabilité complète** : Suivi de chaque échantillon du prélèvement aux résultats

### 🦠 Analyses Microbiologiques
- **Analyses sensorielles** : Odeur, texture, goût, aspect, pH
- **Analyses microbiologiques** : Entérobactéries, Levures, Listeria, Coliformes, Staphylocoques
- **Gestion des délais** : Calcul automatique des délais d'analyse
- **Statuts dynamiques** : Suivi en temps réel de l'avancement des analyses

### 📊 Workflow Complet
1. **Analyses en cours** : Saisie des données sensorielles
2. **Lectures en attente** : Préparation pour les analyses microbiologiques
3. **Saisie des résultats** : Enregistrement des résultats UFC/g
4. **Archivage automatique** : Historique complet des formulaires

### 🏭 Multi-Sites
- **Site R1** : Laiterie Collet - Produits laitiers
- **Site R2** : Végétal Santé - Produits végétaux
- **Site BAIKO** : Laiterie Baiko - Yaourts et préparations

## 🛠️ Technologies Utilisées

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build et le développement
- **Tailwind CSS** pour le styling
- **Shadcn/ui** pour les composants UI
- **React Router** pour la navigation
- **Lucide React** pour les icônes

### Backend & Base de données
- **Supabase** pour la base de données PostgreSQL
- **Row Level Security (RLS)** pour la sécurité
- **Real-time subscriptions** pour les mises à jour en temps réel

### Outils de développement
- **ESLint** pour la qualité du code
- **PostCSS** pour le traitement CSS
- **Git** pour le versioning

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase

### Configuration

1. **Cloner le repository**
```bash
git clone https://github.com/RIPRED14/lotfi-v14.git
cd lotfi-v14
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Supabase**
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env avec vos credentials Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Lancer l'application**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:8080`

## 📋 Structure du Projet

```
src/
├── components/          # Composants React réutilisables
│   ├── ui/             # Composants UI de base (Shadcn)
│   ├── sample-form/    # Composants spécifiques aux formulaires
│   └── sample-table/   # Composants pour les tableaux
├── pages/              # Pages de l'application
├── hooks/              # Hooks React personnalisés
├── contexts/           # Context providers (Auth, Theme)
├── integrations/       # Intégrations externes (Supabase)
├── types/              # Définitions TypeScript
├── utils/              # Fonctions utilitaires
└── stores/             # Stores de données
```

## 🔧 Configuration Supabase

### Tables principales
- `samples` : Échantillons et résultats d'analyses
- `form_bacteria_selections` : Sélections de bactéries par formulaire

### Migrations SQL
Les migrations sont disponibles dans le dossier `supabase/migrations/`

## 👥 Rôles Utilisateurs

### 🔬 Coordinateur
- Création de nouveaux formulaires
- Définition des produits et sites
- Accès à l'historique complet

### 🧪 Technicien
- Saisie des analyses sensorielles
- Saisie des résultats microbiologiques
- Consultation des formulaires en cours

## 📱 Interface Utilisateur

### Design System
- **Couleurs** : Palette professionnelle avec code couleur par type d'information
- **Typographie** : Police claire et lisible
- **Responsive** : Adaptation mobile et desktop
- **Accessibilité** : Respect des standards WCAG

### Navigation
- **Dashboard** : Vue d'ensemble des analyses
- **Contrôle Qualité** : Accès aux différentes sections
- **Historique** : Consultation des analyses archivées

## 🔒 Sécurité

- **Authentication** : Gestion des utilisateurs via Supabase Auth
- **Authorization** : Contrôle d'accès basé sur les rôles
- **RLS** : Sécurité au niveau des lignes de base de données
- **Validation** : Validation côté client et serveur

## 📈 Monitoring & Analytics

- **Logs** : Système de logging intégré
- **Métriques** : Suivi des performances
- **Alertes** : Notifications pour les résultats critiques

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

## 📞 Support

Pour toute question ou problème :
- **Issues GitHub** : [Créer un ticket](https://github.com/RIPRED14/lotfi-v14/issues)
- **Documentation** : Consulter les fichiers MD dans le projet

## 🔄 Versions

### v14 (Actuelle)
- ✅ Workflow complet d'analyse
- ✅ Interface utilisateur modernisée
- ✅ Intégration Supabase complète
- ✅ Gestion multi-sites
- ✅ Archivage automatique

### Roadmap
- 🔄 Notifications en temps réel
- 🔄 Rapports PDF automatiques
- 🔄 API REST complète
- 🔄 Application mobile

---

**Développé avec ❤️ pour l'industrie agroalimentaire** 