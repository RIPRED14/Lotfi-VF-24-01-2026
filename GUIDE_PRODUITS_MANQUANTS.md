# Guide pour résoudre le problème des produits manquants

## Problème
Après avoir fermé l'application, il n'y a plus aucun produit qui existe.

## Cause du problème

L'application charge les produits depuis la table **`product_thresholds`**, pas depuis la table `produits`.

Dans le code (`useProductsNew.ts`), la fonction `loadProducts()` charge les produits ainsi :
```typescript
const { data: thresholdsData } = await supabase
  .from('product_thresholds')
  .select('*')
  .eq('is_active', true)
  .order('product_brand');
```

## Solutions

### Option 1 : Vérifier si les données existent

**Fichier : `check_products_issue.sql`**

Exécutez ce script pour diagnostiquer :
1. Si `product_thresholds` contient des données
2. Si les produits sont actifs (`is_active = true`)
3. Si les sites correspondent entre `sites` et `product_thresholds`

### Option 2 : Corriger les produits

**Fichier : `fix_products_issue.sql`**

Ce script va :
1. Ajouter les colonnes manquantes dans `sites` si nécessaire
2. Réactiver tous les produits dans `product_thresholds`
3. Vérifier la correspondance entre les sites

### Option 3 : Migrer les données

Si la table `product_thresholds` est vide, vous devez exécuter le script de migration :
```bash
node migrate-13729-lignes-final.cjs
```

## Structure attendue

### Table `sites`
- `id` (TEXT PRIMARY KEY)
- `site` (TEXT)
- `nom` (TEXT) - **IMPORTANT** : L'application utilise `sites.nom` pour chercher dans `product_thresholds.site`
- `numero` (TEXT)
- `adresse` (TEXT) - optionnel
- `responsable` (TEXT) - optionnel
- `actif` (BOOLEAN) - optionnel
- `created_at` (TIMESTAMP) - optionnel
- `updated_at` (TIMESTAMP) - optionnel

### Table `product_thresholds`
- `id` (TEXT PRIMARY KEY)
- `site` (TEXT) - **DOIT correspondre à `sites.nom`**
- `product_brand` (TEXT) - Nom du produit
- `parameter_type` (TEXT) - Type de paramètre (ex: "pH", "E. coli", etc.)
- `min_value` (DECIMAL)
- `max_value` (DECIMAL)
- `comparison_operator` (TEXT)
- `is_active` (BOOLEAN) - **DOIT être `true` pour que le produit soit visible**
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Points critiques

1. **Correspondance des sites** : 
   - `product_thresholds.site` doit correspondre à `sites.nom`
   - Si vous avez "R1" dans `product_thresholds.site`, vous devez avoir "R1" dans `sites.nom`

2. **Produits actifs** :
   - Tous les produits dans `product_thresholds` doivent avoir `is_active = true`
   - Sinon, ils ne seront pas chargés par l'application

3. **Données migrées** :
   - Si la table `product_thresholds` est vide, les produits n'ont pas été migrés
   - Il faut exécuter le script de migration des données

## Étapes de résolution

1. **Diagnostic** :
   ```sql
   -- Exécutez dans Supabase SQL Editor
   SELECT COUNT(*) FROM product_thresholds WHERE is_active = true;
   ```

2. **Si le résultat est 0** :
   - Les données n'ont pas été migrées
   - Exécutez : `node migrate-13729-lignes-final.cjs`

3. **Si le résultat est > 0 mais pas de produits visibles** :
   - Vérifiez la correspondance des sites
   - Exécutez `fix_products_issue.sql`

4. **Vérification dans l'application** :
   - Ouvrez la console du navigateur (F12)
   - Regardez les logs qui commencent par "🔍 DEBUG"
   - Vous devriez voir les produits chargés

## Vérification finale

Dans Supabase SQL Editor, exécutez :

```sql
SELECT 
    site,
    product_brand,
    COUNT(*) AS nombre_seuils,
    STRING_AGG(DISTINCT parameter_type, ', ') AS parametres
FROM product_thresholds
WHERE is_active = true
GROUP BY site, product_brand
ORDER BY site, product_brand;
```

Vous devriez voir tous vos produits avec leurs seuils.

## Support

Si le problème persiste :
1. Partagez le résultat de `check_products_issue.sql`
2. Partagez les logs de la console du navigateur
3. Je pourrai créer un script de correction personnalisé









