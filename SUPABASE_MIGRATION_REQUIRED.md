# 🚨 MIGRATION REQUISE : COLONNES SPÉCIALES

## 📍 SITUATION ACTUELLE

Vous avez lancé l'application mais **les colonnes spéciales ne sont pas visibles** car elles n'existent pas encore dans la base de données Supabase.

## ⚡ SOLUTION SIMPLE (2 minutes)

### 1️⃣ Aller dans Supabase Dashboard

**Ouvrir :** https://supabase.com/dashboard

### 2️⃣ Sélectionner votre projet

Cliquer sur votre projet `microbiological-control`

### 3️⃣ Aller dans SQL Editor

Dans le menu de gauche, cliquer sur **"SQL Editor"**

### 4️⃣ Copier-coller exactement ce code :

```sql
ALTER TABLE samples ADD COLUMN IF NOT EXISTS of_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS autoclave_number VARCHAR(50);
ALTER TABLE samples ADD COLUMN IF NOT EXISTS grid_number VARCHAR(50);
ALTER TABLE samples ADD COLUMN IF NOT EXISTS acidity DECIMAL(5,2);
```

### 5️⃣ Cliquer sur "Run"

Le bouton bleu "Run" en haut à droite

## ✅ VÉRIFICATION

Une fois exécuté, retourner sur votre application : **http://localhost:8080/sample-entry**

### Vous devriez maintenant voir :

#### 🧀 Pour "Fromage pasteurisé" :
- **Colonne OF** (orange) entre Produit et Heure

#### 🥛 Pour "Lait" :
- **Acidité** au lieu de pH (bleu)

#### 🍯 Pour "Aliments Santé AS" :
- **N° Autoclave** + **N° Grille** (violet)

## 🧪 TEST RAPIDE

Pour tester, créez un échantillon avec comme produit :
- `"Fromage pasteurisé Comté"` → Vous verrez la colonne OF
- `"Lait UHT demi-écrémé"` → Vous verrez Acidité au lieu de pH
- `"Aliments Santé bio"` → Vous verrez Autoclave + Grille

---

**🎯 IMPORTANT : Faites la migration Supabase d'abord, PUIS testez l'application !**

# ⚠️ MIGRATION SUPABASE REQUISE

## Migration de la colonne commentaire (lab_comment)

**Date** : Mars 2025  
**Problème identifié** : La colonne `lab_comment` n'existe pas dans la table `samples` de Supabase.

### Scripts SQL à exécuter

```sql
-- Ajouter la colonne lab_comment à la table samples
ALTER TABLE samples 
ADD COLUMN lab_comment TEXT NULL;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN samples.lab_comment IS 'Commentaires laboratoire pour les échantillons';

-- Créer un index pour améliorer les performances de recherche (optionnel)
CREATE INDEX idx_samples_lab_comment ON samples(lab_comment) WHERE lab_comment IS NOT NULL;
```

## 🆕 Migration des nouvelles colonnes technicien (OF et Acidité)

**Date** : Mars 2025  
**Nouvelles colonnes** : Ajout de `of_value` et `acidity` pour les techniciens.

### Scripts SQL supplémentaires à exécuter

```sql
-- Ajouter la colonne OF (valeur OF)
ALTER TABLE samples 
ADD COLUMN of_value TEXT NULL;

-- Ajouter la colonne Acidité
ALTER TABLE samples 
ADD COLUMN acidity TEXT NULL;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN samples.of_value IS 'Valeur OF saisie par le technicien';
COMMENT ON COLUMN samples.acidity IS 'Valeur acidité saisie par le technicien';
```

### Vérification après migration

```sql
-- Vérifier que toutes les colonnes ont été ajoutées
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'samples' 
AND column_name IN ('lab_comment', 'of_value', 'acidity');

-- Tester une insertion avec toutes les nouvelles colonnes
INSERT INTO samples (number, product, ready_time, fabrication, dlc, smell, texture, taste, aspect, ph, of_value, acidity, lab_comment)
VALUES ('TEST-001', 'Test Product', '10:00', '2025-03-01', '2025-03-15', 'C', 'C', 'C', 'C', '7.2', '5.8', '0.15', 'Test commentaire complet');

-- Vérifier l'insertion
SELECT number, ph, of_value, acidity, lab_comment FROM samples WHERE number = 'TEST-001';

-- Nettoyer le test
DELETE FROM samples WHERE number = 'TEST-001';
```

### Impact sur l'application

- ✅ La colonne commentaire sera maintenant visible dans tous les tableaux
- ✅ **NOUVEAU** : La colonne OF sera visible pour les techniciens (vert)
- ✅ **NOUVEAU** : La colonne Acidité sera visible pour les techniciens (vert)
- ✅ Les nouvelles colonnes suivent le même modèle que pH
- ✅ Pas d'impact sur les données existantes (colonnes nullables)

### Pages mises à jour

- ✅ `ReadingResultsPage.tsx` - Colonnes commentaire, OF et Acidité ajoutées
- ✅ `SamplesTable.tsx` - Colonnes OF et Acidité ajoutées dans l'en-tête
- ✅ `TechnicianFields.tsx` - Gestion complète des colonnes OF et Acidité implémentée
- ✅ `SampleTableRow.tsx` - Colonne commentaire déjà présente
- ✅ Types Supabase et TypeScript mis à jour

---

## 🔧 Instructions pour l'administrateur

1. **Se connecter à Supabase Dashboard**
2. **Aller dans SQL Editor**
3. **Exécuter TOUS les scripts ci-dessus (commentaire + OF + acidité)**
4. **Vérifier que les 3 colonnes sont créées**
5. **Redémarrer l'application pour prendre en compte les changements**

## 🧪 Tests après migration

### Test 1 : Colonnes technicien (vertes)
1. Ouvrir un formulaire d'échantillon
2. Vérifier que les colonnes pH, OF, Acidité sont visibles en vert
3. Saisir des valeurs dans chaque colonne
4. Vérifier que les valeurs se sauvegardent

### Test 2 : Colonne commentaire (grise)
1. Ouvrir un formulaire d'échantillon  
2. Vérifier que la colonne Commentaire est visible en gris
3. Saisir un commentaire
4. Vérifier que le commentaire se sauvegarde

### Test 3 : Page de résultats de lecture
1. Aller sur "Lectures en attente"
2. Ouvrir une lecture
3. Vérifier que TOUTES les colonnes sont visibles : pH, OF, Acidité, Commentaire
4. Vérifier que les valeurs s'affichent correctement

**🎯 Résultat attendu** : 3 nouvelles colonnes fonctionnelles (OF, Acidité, Commentaire) 