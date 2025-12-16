# Guide d'utilisation - Système de Paramètres des Bactéries

## 📋 Vue d'ensemble

Le système de paramètres des bactéries permet de configurer de manière centralisée tous les délais d'incubation et propriétés des micro-organismes utilisés dans le laboratoire. Plus besoin de modifier le code pour changer un délai !

## 🎯 Fonctionnalités

### ✅ Ce qui est configurable
- **Délais d'incubation** (en heures, avec affichage automatique en jours/heures)
- **Noms des bactéries** 
- **Descriptions**
- **Couleurs d'affichage**
- **Activation/désactivation** de chaque bactérie
- **Réinitialisation** aux valeurs par défaut

### 📍 Accès aux paramètres
1. **Page Contrôle Qualité** → Bouton "Paramètres" (coordinateurs seulement)
2. **URL directe** : `/bacteria-settings`

## 🔧 Interface de paramètrage

### Actions rapides
- **Modificateurs de délai** pour les bactéries les plus courantes
- **Boutons prédefinis** (12h, 24h, 48h, 3j, 5j, etc.)
- **Application immédiate** des changements

### Configuration détaillée
- **Nom** : Modifier le nom d'affichage
- **Délai** : Définir en heures (conversion automatique)
- **Description** : Ajouter des détails sur la bactérie
- **Activation** : Basculer l'état actif/inactif

### Sécurité
- **Réinitialisation** vers les valeurs par défaut du laboratoire
- **Validation** des valeurs saisies
- **Persistance** locale dans le navigateur

## 💻 Utilisation dans le code

### 1. Hook principal - `useBacteriaSettingsStore`

```typescript
import { useBacteriaSettingsStore } from '@/stores/bacteriaSettingsStore';

function MonComposant() {
  const { 
    bacteria,
    updateBacteriaDelay,
    getBacteriaByName,
    getBacteriaById
  } = useBacteriaSettingsStore();
  
  // Accéder aux bactéries activées
  const enabledBacteria = bacteria.filter(b => b.enabled);
  
  // Modifier un délai
  const changerDelai = () => {
    updateBacteriaDelay('entero', 36); // 36 heures
  };
}
```

### 2. Hook de compatibilité - `useBacteriaCompat`

Pour maintenir la compatibilité avec l'ancien code :

```typescript
import { useBacteriaCompat } from '@/hooks/useBacteriaCompat';

function ComposantExistant() {
  const { bacteria, BACTERIES } = useBacteriaCompat();
  
  // Utilisation identique à l'ancien système
  bacteria.map(b => ({ id: b.id, name: b.name, delai: b.delai }))
}
```

### 3. Calculs de dates - `useBacteriaDateCalculation`

```typescript
import { useBacteriaDateCalculation } from '@/hooks/useBacteriaDateCalculation';

function PlanificationLectures() {
  const { 
    calculateReadingSchedule,
    isBacteriaReady,
    getReadyBacteria
  } = useBacteriaDateCalculation();
  
  // Calculer le planning
  const schedule = calculateReadingSchedule(['entero', 'coliformes']);
  
  // Vérifier si prêt
  const estPret = isBacteriaReady('entero', dateSemis);
}
```

### 4. Fonctions utilitaires

```typescript
import { getBacteriaInfo, getBacteriaDelayHours } from '@/hooks/useBacteriaCompat';

// Obtenir les infos d'une bactérie
const info = getBacteriaInfo('Entérobactéries');
// → { name: 'Entérobactéries', delay: '24h', delayHours: 24, color: '...' }

// Obtenir le délai en heures
const delai = getBacteriaDelayHours('Listeria');
// → 48
```

## 🎨 Composants d'affichage

### BacteriaStatusDisplay

Affiche l'état actuel des paramètres :

```typescript
import BacteriaStatusDisplay from '@/components/BacteriaStatusDisplay';

// Affichage complet
<BacteriaStatusDisplay />

// Affichage compact
<BacteriaStatusDisplay compact={true} />

// Sans bouton paramètres
<BacteriaStatusDisplay showSettings={false} />
```

### BacteriaSelector

Sélecteur de bactéries mis à jour automatiquement :

```typescript
import BacteriaSelector from '@/components/BacteriaSelector';

<BacteriaSelector
  selectedBacteria={selection}
  onToggle={handleToggle}
/>
```

## 📊 Structure des données

### Interface BacteriaSettings

```typescript
interface BacteriaSettings {
  id: string;              // 'entero', 'coliformes', etc.
  name: string;            // 'Entérobactéries'
  delayHours: number;      // 24
  delayDisplay: string;    // '24h' ou '2j'
  color: string;           // Classes CSS Tailwind
  enabled: boolean;        // true/false
  description?: string;    // Description optionnelle
}
```

### Interface BacteriaReadingSchedule

```typescript
interface BacteriaReadingSchedule {
  bacteriaId: string;
  bacteriaName: string;
  seedingDate: Date;
  readingDate: Date;
  readingDay: string;      // 'Lundi', 'Mardi', etc.
  delayDisplay: string;    // '24h', '2j', etc.
  delayHours: number;
  isReady: boolean;
  timeUntilReady?: string; // '5h restantes'
}
```

## 🔄 Migration depuis l'ancien système

### Avant (codé en dur)
```typescript
const BACTERIES = [
  { id: "entero", name: "Entérobactéries", delai: "24h" },
  { id: "coliformes", name: "Coliformes totaux", delai: "24h" }
];
```

### Maintenant (configurable)
```typescript
import { useBacteriaCompat } from '@/hooks/useBacteriaCompat';

function MonComposant() {
  const { BACTERIES } = useBacteriaCompat();
  // BACTERIES est maintenant généré dynamiquement depuis les paramètres !
}
```

## ⚡ Bonnes pratiques

### 1. Utilisez les hooks appropriés
- `useBacteriaSettingsStore` → Accès direct au store
- `useBacteriaCompat` → Compatibilité avec l'ancien code
- `useBacteriaDateCalculation` → Calculs de dates et planning

### 2. Gestion des erreurs
```typescript
const bacterium = getBacteriaById('inexistant');
if (!bacterium) {
  // Fallback approprié
  return { delayHours: 24, name: 'Inconnue' };
}
```

### 3. Performance
Les paramètres sont persistés localement et mis à jour en temps réel dans tous les composants.

### 4. Tests
Vérifiez toujours que les bactéries existent avant de les utiliser :
```typescript
const enabledBacteria = bacteria.filter(b => b.enabled);
if (enabledBacteria.length === 0) {
  // Aucune bactérie activée
}
```

## 🐛 Dépannage

### Problème : Les changements ne s'appliquent pas
- **Solution** : Vérifiez que vous utilisez `useBacteriaSettingsStore` et non une constante statique

### Problème : Bactérie non trouvée
- **Solution** : Utilisez les fonctions `getBacteriaInfo` qui ont des fallbacks

### Problème : Délais incorrects
- **Solution** : Vérifiez que `delayHours` est bien un nombre et non une chaîne

### Problème : Interface non mise à jour
- **Solution** : Les hooks React se mettent à jour automatiquement. Vérifiez les dépendances.

## 📈 Exemples d'utilisation

### Modifier plusieurs délais rapidement
```typescript
const { updateBacteriaDelay } = useBacteriaSettingsStore();

// Passer tous les délais à 48h
['entero', 'coliformes', 'listeria'].forEach(id => {
  updateBacteriaDelay(id, 48);
});
```

### Calculer un planning complet
```typescript
const { calculateReadingSchedule, groupByReadingDay } = useBacteriaDateCalculation();

const schedule = calculateReadingSchedule(['entero', 'coliformes', 'levures5j']);
const planning = groupByReadingDay(schedule);

// planning = {
//   'Mardi': [{ bacteriaName: 'Entérobactéries', ... }],
//   'Jeudi': [{ bacteriaName: 'Coliformes totaux', ... }],
//   'Dimanche': [{ bacteriaName: 'Levures/Moisissures (5j)', ... }]
// }
```

### Afficher les bactéries prêtes
```typescript
const { getReadyBacteria } = useBacteriaDateCalculation();

const ready = getReadyBacteria(['entero', 'coliformes'], dateEnsemencement);
// → ['entero'] si seules les entérobactéries sont prêtes
```

---

**💡 Conseil** : Pour tester le système, modifiez quelques délais dans `/bacteria-settings` et observez les changements dans les autres pages du système ! 