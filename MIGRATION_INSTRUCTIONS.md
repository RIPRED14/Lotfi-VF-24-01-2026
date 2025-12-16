# 🦠 MIGRATION COMPLÈTE DES BACTÉRIES

## 📋 ÉTAPES À SUIVRE

### 1. 🌐 Aller sur Supabase Dashboard
- Allez sur [supabase.com](https://supabase.com)
- Connectez-vous à votre projet
- Naviguez vers **Table Editor** > **samples**

### 2. 🗄️ Copier/coller ces commandes SQL

Allez dans **SQL Editor** et exécutez **TOUTES** ces commandes d'un coup :

```sql
-- Bactéries avec colonnes dédiées
ALTER TABLE samples ADD COLUMN IF NOT EXISTS escherichia_coli_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS total_flora_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS leuconostoc_count INTEGER;

-- Variants de levures/moisissures
ALTER TABLE samples ADD COLUMN IF NOT EXISTS yeast_mold_3j_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS yeast_mold_5j_count INTEGER;

-- Autres bactéries communes
ALTER TABLE samples ADD COLUMN IF NOT EXISTS salmonella_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS campylobacter_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS clostridium_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS bacillus_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS pseudomonas_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS lactobacillus_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS streptococcus_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS enterococcus_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS vibrio_count INTEGER;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS shigella_count INTEGER;
```

### 3. ✅ Vérification

Pour vérifier que toutes les colonnes ont été créées :

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'samples' 
AND column_name LIKE '%_count'
ORDER BY column_name;
```

### 4. 🔄 Redémarrer l'application

```bash
npm run dev
```

## 📊 RÉSULTAT ATTENDU

**AVANT** : Plusieurs bactéries partagent les mêmes champs
**APRÈS** : Chaque bactérie a son propre champ dédié

### 🎯 Bactéries maintenant indépendantes :
- ✅ **Entérobactéries** → `enterobacteria_count`
- ✅ **Escherichia coli** → `escherichia_coli_count` (NOUVEAU)
- ✅ **Flore totales** → `total_flora_count` (NOUVEAU)
- ✅ **Leuconostoc** → `leuconostoc_count` (NOUVEAU)
- ✅ **Levures/Moisissures** → `yeast_mold_count`
- ✅ **Levures/Moisissures (3j)** → `yeast_mold_3j_count` (NOUVEAU)
- ✅ **Levures/Moisissures (5j)** → `yeast_mold_5j_count` (NOUVEAU)

## 🧪 TEST

1. Créez un nouveau formulaire
2. Sélectionnez **plusieurs bactéries** (ex: Entérobactéries + Escherichia coli)
3. Remplissez des **valeurs différentes** pour chaque bactérie
4. Sauvegardez
5. **Résultat** : Chaque bactérie doit conserver sa propre valeur ! 🎉 