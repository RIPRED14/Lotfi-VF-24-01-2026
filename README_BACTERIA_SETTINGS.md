# 🦠 Système de Paramètres des Bactéries

## 🎯 Objectif

Permettre aux coordinateurs de modifier les **délais d'incubation des bactéries** directement depuis l'interface web, sans intervention du développeur.

## ⚡ Utilisation rapide

### Pour les coordinateurs
1. **Accès** : Page Contrôle Qualité → Bouton "Paramètres"
2. **Modification** : Utilisez les boutons prédéfinis (12h, 24h, 48h, etc.) ou saisissez manuellement
3. **Application** : Les changements sont appliqués immédiatement dans toute l'application

### Pour les développeurs
```typescript
// Récupérer les paramètres
import { useBacteriaSettingsStore } from '@/stores/bacteriaSettingsStore';

const { bacteria, updateBacteriaDelay } = useBacteriaSettingsStore();

// Compatibilité avec l'ancien code
import { useBacteriaCompat } from '@/hooks/useBacteriaCompat';

const { BACTERIES } = useBacteriaCompat(); // Format identique à l'ancien système
```

## 📊 Paramètres configurables

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| **Délai d'incubation** | Temps avant lecture (en heures) | `24` → 24h, `48` → 2j |
| **Nom d'affichage** | Nom visible dans l'interface | "Entérobactéries" |
| **Statut** | Activé/Désactivé | ✅ Actif, ❌ Inactif |
| **Description** | Information supplémentaire | "Méthode ISO 21528-2" |

## 🛠️ Fichiers créés

### Core System
- `src/stores/bacteriaSettingsStore.ts` - Store Zustand principal
- `src/pages/BacteriaSettingsPage.tsx` - Interface de configuration
- `src/hooks/useBacteriaCompat.ts` - Compatibilité ancien/nouveau
- `src/hooks/useBacteriaDateCalculation.ts` - Calculs de planning

### Composants
- `src/components/BacteriaStatusDisplay.tsx` - Affichage des paramètres
- Mise à jour de `BacteriaSelector.tsx` et `ReadingCalendarPage.tsx`

### Documentation
- `BACTERIA_SETTINGS_GUIDE.md` - Guide d'utilisation complet
- `BACTERIA_SETTINGS_CHANGELOG.md` - Historique des changements

## 🎨 Interface utilisateur

### Page de paramètres (`/bacteria-settings`)
- **Modificateurs rapides** : Boutons +12h, +24h, -12h, -24h
- **Délais prédéfinis** : 12h, 24h, 48h, 3j, 5j, 7j
- **Configuration détaillée** : Nom, délai, description, activation
- **Statistiques** : Nombre total, activées, désactivées, délai moyen
- **Réinitialisation** : Retour aux valeurs par défaut

### Composant de statut
```typescript
<BacteriaStatusDisplay />          // Affichage complet
<BacteriaStatusDisplay compact />  // Mode compact
```

## 🔄 Migration et compatibilité

### ✅ Rétrocompatibilité totale
Tous les composants existants continuent de fonctionner sans modification grâce aux hooks de compatibilité.

### Avant (codé en dur)
```typescript
const BACTERIES = [
  { id: "entero", name: "Entérobactéries", delai: "24h" }
];
```

### Maintenant (configurable)
```typescript
const { BACTERIES } = useBacteriaCompat(); // Même format, valeurs configurables !
```

## 📈 Avantages

- **🚀 Flexibilité** : Modification sans redéploiement
- **🎯 Centralisation** : Une seule source de vérité
- **💾 Persistance** : Paramètres sauvegardés localement
- **🔄 Temps réel** : Mise à jour immédiate dans toute l'app
- **📱 Responsive** : Interface adaptée mobile/desktop
- **🛡️ Sécurité** : Validation des saisies + réinitialisation

## 🔧 Configuration par défaut

Les bactéries suivantes sont **activées** par défaut :
- Entérobactéries (24h)
- Escherichia coli (24h)
- Coliformes totaux (24h)
- Levures/Moisissures 3j (72h)
- Flore totales (72h)
- Staphylococcus aureus (24h)
- Listeria monocytogenes (48h)

Les bactéries suivantes sont **désactivées** par défaut :
- Flore totale 30°C (72h)
- Flore totale 22°C (72h)

## 🧪 Tests et validation

### ✅ Testé et validé
- [x] Modification des délais en temps réel
- [x] Activation/désactivation des bactéries
- [x] Persistance des paramètres (localStorage)
- [x] Compatibilité avec tous les composants existants
- [x] Calculs de dates de lecture corrects
- [x] Interface responsive
- [x] Compilation sans erreurs TypeScript

### 🎯 Prêt pour la production
L'application compile sans erreurs et tous les composants sont compatibles.

## 📞 Support

- **Guide complet** : `BACTERIA_SETTINGS_GUIDE.md`
- **Changelog** : `BACTERIA_SETTINGS_CHANGELOG.md`
- **Code source** : Répertoire `src/stores`, `src/hooks`, `src/components`

---

**🎉 Le système est opérationnel ! Les coordinateurs peuvent maintenant configurer les délais des bactéries directement depuis l'interface web.** 