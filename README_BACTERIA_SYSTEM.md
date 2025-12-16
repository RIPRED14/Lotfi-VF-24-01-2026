# Système de Gestion des Bactéries - Documentation

## Vue d'ensemble

Ce système permet de gérer de manière centralisée les paramètres des bactéries, leurs délais de lecture, et d'afficher leur statut avec un système de couleurs intuitif.

## ✨ Fonctionnalités principales

### 1. 🔧 Gestion centralisée des paramètres
- **Store Zustand** : Stockage des paramètres dans le navigateur avec persistance
- **Configuration des délais** : Personnalisation des délais de lecture pour chaque bactérie
- **Activation/Désactivation** : Contrôle de l'affichage des bactéries dans l'interface

### 2. 🎨 Système de couleurs par statut
- **🔴 Rouge** : Prêt à lire (délai écoulé)
- **🟢 Vert** : Terminé/Complété
- **🔵 Bleu** : En cours de traitement
- **⚪ Gris** : En attente (délai non écoulé)
- **🟠 Orange** : En retard (délai dépassé depuis >24h)

### 3. 📊 Widgets et composants réutilisables
- **BacteriaStatusBadge** : Badge avec couleur et icône selon le statut
- **BacteriaCalendarWidget** : Vue calendrier des lectures
- **BacteriaStatusDisplay** : Affichage des paramètres actuels
- **BacteriaSelector** : Sélecteur avec compatibilité ancienne version

## 📁 Structure des fichiers

```
src/
├── stores/
│   └── bacteriaSettingsStore.ts          # Store Zustand central
├── hooks/
│   └── useBacteriaDateCalculation.ts     # Calculs de dates et groupements
├── components/
│   ├── BacteriaStatusBadge.tsx           # Badge avec statut coloré
│   ├── BacteriaCalendarWidget.tsx        # Widget calendrier
│   ├── BacteriaStatusDisplay.tsx         # Affichage des paramètres
│   └── BacteriaSelector.tsx              # Sélecteur (modifié)
├── pages/
│   ├── BacteriaSettingsPage.tsx          # Page de paramètres
│   ├── BacteriaExamplePage.tsx           # Page de démonstration
│   ├── PendingReadingsPage.tsx           # Page intégrée avec couleurs
│   └── ReadingCalendarPage.tsx           # Page intégrée avec store
└── hooks/
    └── useSamples.ts                     # Hook corrigé (erreur 400)
```

## 🚀 Utilisation

### Configuration des paramètres
```typescript
import { useBacteriaSettingsStore } from '@/stores/bacteriaSettingsStore';

const { bacteria, updateBacteriaDelay, toggleBacteriaEnabled } = useBacteriaSettingsStore();

// Modifier le délai d'une bactérie
updateBacteriaDelay('ecoli', 24);

// Activer/désactiver une bactérie
toggleBacteriaEnabled('ecoli');
```

### Affichage avec couleurs
```typescript
import { BacteriaStatusBadge } from '@/components/BacteriaStatusBadge';

const bacteria = {
  id: 'ecoli-1',
  name: 'E. coli',
  type: 'ecoli',
  sampleDate: '2024-01-15T10:00:00Z',
  readingDate: '2024-01-16T10:00:00Z',
  status: 'ready',
  delayHours: 24
};

<BacteriaStatusBadge bacteria={bacteria} onClick={handleClick} />
```

### Widget calendrier
```typescript
import { BacteriaCalendarWidget } from '@/components/BacteriaCalendarWidget';

<BacteriaCalendarWidget 
  bacteria={bacteriaList} 
  onBacteriaClick={handleBacteriaClick}
  compact={true}
/>
```

## 🎯 Pages intégrées

### 1. Page de démonstration : `/bacteria-demo`
- **4 onglets** : Vue d'ensemble, Calendrier, Liste détaillée, Paramètres
- **Données simulées** : Génération automatique d'échantillons
- **Statistiques** : Compteurs par statut
- **Paramètres rapides** : Modification directe des délais

### 2. Page de paramètres : `/bacteria-settings`
- **Configuration complète** : Délais, activation, noms
- **Prévisualisations** : Aperçu des changements
- **Sauvegarde automatique** : Persistance dans le navigateur

### 3. Pages existantes mises à jour
- **PendingReadingsPage** : Intégration du système de couleurs
- **ReadingCalendarPage** : Utilisation du store central

## 🔧 Types et interfaces

### BacteriaItem
```typescript
interface BacteriaItem {
  id: string;
  name: string;
  type: string;
  sampleDate: string;
  readingDate: string;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'overdue';
  delayHours: number;
}
```

### BacteriaSettings
```typescript
interface BacteriaSettings {
  id: string;
  name: string;
  delayHours: number;
  enabled: boolean;
}
```

## 🛠️ Fonctions utilitaires

### Calcul de dates
```typescript
import { calculateReadingDate, groupByReadingDay } from '@/hooks/useBacteriaDateCalculation';

// Calculer la date de lecture
const readingDate = calculateReadingDate(sampleDate, delayHours);

// Grouper par jour
const groupedBacteria = groupByReadingDay(bacteriaList);
```

### Hook de statut
```typescript
import { useBacteriaStatus } from '@/components/BacteriaStatusBadge';

const bacteriaByStatus = useBacteriaStatus(bacteriaList);
// Retourne: { ready: [], pending: [], completed: [], overdue: [], inProgress: [] }
```

## 🐛 Corrections apportées

### 1. Erreur 400 Supabase
- **Validation des IDs** : Vérification avant les requêtes
- **Gestion d'erreurs** : Messages d'erreur explicites
- **Fonction updateSample** : Correction de la logique de mise à jour

### 2. Compatibilité ancienne version
- **Hook useBacteriaCompat** : Adaptation des anciens formats
- **BacteriaSelector** : Maintien de la compatibilité

### 3. Types et performances
- **Interfaces TypeScript** : Typage strict pour tous les composants
- **Optimisations** : Mémorisation des calculs coûteux

## 🎨 Thème et design

### Couleurs par statut
```css
/* Prêt à lire */
.status-ready { 
  background: #fef3c7; /* bg-yellow-100 */
  border: #f59e0b;     /* border-yellow-500 */
  color: #92400e;      /* text-yellow-800 */
}

/* Terminé */
.status-completed {
  background: #dcfce7; /* bg-green-100 */
  border: #22c55e;     /* border-green-500 */
  color: #166534;      /* text-green-800 */
}

/* En cours */
.status-in-progress {
  background: #dbeafe; /* bg-blue-100 */
  border: #3b82f6;     /* border-blue-500 */
  color: #1e40af;      /* text-blue-800 */
}

/* En attente */
.status-pending {
  background: #f3f4f6; /* bg-gray-100 */
  border: #9ca3af;     /* border-gray-400 */
  color: #374151;      /* text-gray-700 */
}

/* En retard */
.status-overdue {
  background: #fee2e2; /* bg-red-100 */
  border: #ef4444;     /* border-red-500 */
  color: #991b1b;      /* text-red-800 */
}
```

## 🚦 Tests et validation

### Points de test recommandés
1. **Modification des paramètres** : Vérifier la persistance
2. **Calculs de dates** : Tester avec différents délais
3. **Affichage des couleurs** : Valider tous les statuts
4. **Performance** : Vérifier avec de grandes listes
5. **Compatibilité** : Tester avec les anciennes données

### URLs de test
- `/bacteria-demo` : Démonstration complète
- `/bacteria-settings` : Configuration
- `/pending-readings` : Page intégrée
- `/lecture-calendar` : Calendrier intégré

## 📝 Notes de développement

### Persistance des données
- Les paramètres sont sauvegardés automatiquement dans `localStorage`
- Compatibilité avec les anciennes versions maintenue
- Possibilité d'exporter/importer les configurations

### Extensibilité
- Facile d'ajouter de nouvelles bactéries
- Système de couleurs configurable
- Widgets réutilisables dans d'autres pages

### Performance
- Calculs optimisés avec mémorisation
- Rendu conditionnel pour les grandes listes
- Lazy loading des composants complexes

---

**Développé avec ❤️ pour améliorer l'efficacité du laboratoire** 