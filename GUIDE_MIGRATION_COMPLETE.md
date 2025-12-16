# Guide : Pourquoi les tables sont vides et comment les remplir

## Pourquoi les tables sont vides ?

### Problème identifié

Vous avez exécuté **uniquement** le script de création de `air_static_locations` avec ses données INSERT. 

**Les autres tables** ont été créées **SANS données** parce que :

1. Le script de création des tables (`CREATE TABLE`) crée seulement la **structure** (colonnes, types, contraintes)
2. Il n'y a **PAS de INSERT statements** dans le script de création que vous avez fourni
3. Les tables `sites`, `bacteries_types`, `product_thresholds`, `samples`, etc. sont **vides** car aucun INSERT n'a été exécuté

### Script de création vs Script de données

Le script que vous avez fourni crée seulement les tables :

```sql
CREATE TABLE sites (...);  -- ✅ Crée la table
-- ❌ PAS de INSERT INTO sites VALUES (...);
```

Pour avoir des données, il faut **exécuter des INSERT** après la création des tables.

## Solution : Migrer les données de l'ancienne base

Vous avez **3 options** pour migrer les données :

### Option 1 : Script Node.js (RECOMMANDÉ) ⭐

**Fichier : `migrate-all-data.js`**

Ce script :
- Se connecte à l'ancienne base
- Lit toutes les données
- Les insère dans la nouvelle base
- Gère les erreurs et affiche un résumé

**Comment utiliser :**

1. Installez les dépendances :
```bash
npm install @supabase/supabase-js
```

2. Modifiez le script avec vos URLs :
   - Ouvrez `migrate-all-data.js`
   - Remplacez `OLD_SUPABASE_URL` et `OLD_SUPABASE_KEY` par vos valeurs de l'ancienne base

3. Exécutez :
```bash
node migrate-all-data.js
```

### Option 2 : Utiliser pg_dump (via ligne de commande)

Si vous avez accès en ligne de commande à PostgreSQL :

```bash
# 1. Exporter depuis l'ancienne base
pg_dump -h db.ANCIEN-PROJECT-ID.supabase.co \
        -U postgres \
        -d postgres \
        --data-only \
        --inserts \
        > export.sql

# 2. Modifier export.sql pour pointer vers la nouvelle base
# 3. Importer dans la nouvelle base
psql -h db.vwecfxtgqyuydhlvutvg.supabase.co \
     -U postgres \
     -d postgres \
     -f export.sql
```

### Option 3 : Export/Import manuel via Supabase Dashboard

1. **Dans l'ancienne base** :
   - Allez dans **Table Editor**
   - Pour chaque table, cliquez sur **Export** > **CSV**
   - Téléchargez les fichiers CSV

2. **Dans la nouvelle base** :
   - Allez dans **Table Editor**
   - Pour chaque table, cliquez sur **Insert** > **Import from CSV**
   - Sélectionnez le fichier CSV correspondant

**Ordre d'importation important :**
1. `sites` (3 lignes)
2. `bacteries_types` (9 lignes)
3. `product_thresholds` (74 lignes) ⚠️ **CRITIQUE pour les produits**
4. `ufc_count_levures_moisissures` (151 lignes)
5. `form_bacteria_selections` (27 lignes)
6. `batch_numbers` (2 lignes)
7. `samples` (57 lignes)
8. `notifications` (1,664 lignes)
9. `change_history` (11,528 lignes)
10. `audit_logs` (214 lignes)
11. Autres tables...

## Vérification après migration

Exécutez ce script dans votre nouvelle base pour vérifier :

```sql
SELECT 
    'sites' AS table_name,
    COUNT(*) AS nombre_lignes
FROM sites
UNION ALL
SELECT 'bacteries_types', COUNT(*) FROM bacteries_types
UNION ALL
SELECT 'product_thresholds', COUNT(*) FROM product_thresholds
UNION ALL
SELECT 'samples', COUNT(*) FROM samples
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'change_history', COUNT(*) FROM change_history
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'ufc_count_levures_moisissures', COUNT(*) FROM ufc_count_levures_moisissures
UNION ALL
SELECT 'form_bacteria_selections', COUNT(*) FROM form_bacteria_selections
UNION ALL
SELECT 'batch_numbers', COUNT(*) FROM batch_numbers;
```

Vous devriez voir :
- sites: **3**
- bacteries_types: **9**
- product_thresholds: **74** ⚠️ **Si 0, les produits ne s'afficheront pas!**
- samples: **57**
- notifications: **1,664**
- change_history: **11,528**
- audit_logs: **214**
- ufc_count_levures_moisissures: **151**
- form_bacteria_selections: **27**
- batch_numbers: **2**

## Points critiques

### ⚠️ Product_thresholds est CRITIQUE

L'application charge les produits depuis `product_thresholds`, **PAS** depuis `produits`!

Si `product_thresholds` est vide ou contient `is_active = false`, **aucun produit ne s'affichera** dans l'application.

Après migration, vérifiez :
```sql
SELECT COUNT(*) FROM product_thresholds WHERE is_active = true;
-- Doit être > 0
```

## Résumé

1. **Problème** : Tables créées mais vides (pas d'INSERT)
2. **Solution** : Migrer les données de l'ancienne base
3. **Méthode recommandée** : Script Node.js `migrate-all-data.js`
4. **Important** : `product_thresholds` doit contenir des données avec `is_active = true`









