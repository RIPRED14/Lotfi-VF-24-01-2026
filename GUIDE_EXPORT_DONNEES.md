# Guide pour récupérer toutes les données de l'ancienne base

## Fichiers créés

1. **`export_all_data_INSERT.sql`** - Script principal
   - Génère des INSERT statements pour toutes les tables
   - Gère correctement les valeurs NULL et les guillemets
   - Utilise `quote_literal()` pour sécuriser les chaînes

## Comment utiliser

### Étape 1 : Exécuter dans l'ancienne base

1. Connectez-vous à votre **ANCIENNE base de données Supabase**
2. Ouvrez le **SQL Editor**
3. Ouvrez le fichier `export_all_data_INSERT.sql`
4. Exécutez chaque section de SELECT (une table à la fois)
5. Copiez les résultats (les INSERT statements)

### Étape 2 : Exécuter dans la nouvelle base

1. Connectez-vous à votre **NOUVELLE base de données Supabase** : https://vwecfxtgqyuydhlvutvg.supabase.co
2. Assurez-vous que les tables sont créées (exécutez le script de création fourni)
3. Dans le **SQL Editor**, collez les INSERT statements copiés
4. Exécutez-les dans l'ordre :
   - D'abord `sites` et `bacteries_types`
   - Ensuite `product_thresholds` (IMPORTANT pour les produits!)
   - Puis les autres tables
   - Enfin `change_history` et `notifications` (tables volumineuses)

### Ordre recommandé d'importation

1. **sites** (3 lignes)
2. **bacteries_types** (9 lignes)
3. **product_thresholds** (74 lignes) ⚠️ **IMPORTANT** - C'est ici que sont les produits!
4. **ufc_count_levures_moisissures** (151 lignes)
5. **form_bacteria_selections** (27 lignes)
6. **batch_numbers** (2 lignes)
7. **produits** (si non vide)
8. **produit_bacteries** (si non vide)
9. **samples** (57 lignes)
10. **sample_forms** (si non vide)
11. **form_samples** (si non vide)
12. **analyses_planifiees** (si non vide)
13. **notifications** (1,664 lignes)
14. **change_history** (11,528 lignes) - Peut prendre du temps
15. **audit_logs** (214 lignes)
16. **air_static_locations** (si existe)

## Points importants

### 1. Produits dans product_thresholds
⚠️ **CRITIQUE** : Les produits sont stockés dans `product_thresholds`, pas dans `produits`!
- L'application charge les produits depuis `product_thresholds`
- Assurez-vous que cette table est bien migrée avec `is_active = true`

### 2. Gestion des erreurs
Si vous obtenez des erreurs de contrainte :
- Vérifiez que les tables dépendantes sont importées en premier
- Vérifiez les clés étrangères (foreign keys)

### 3. Vérification après import
Exécutez ce script pour vérifier :

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
- sites: 3
- bacteries_types: 9
- product_thresholds: 74
- samples: 57
- notifications: 1,664
- change_history: 11,528
- audit_logs: 214
- ufc_count_levures_moisissures: 151
- form_bacteria_selections: 27
- batch_numbers: 2

## Alternative : Utiliser le script Node.js

Si vous préférez utiliser le script Node.js mentionné (`migrate-13729-lignes-final.cjs`), assurez-vous qu'il :
1. Se connecte à l'ancienne base
2. Lit toutes les données
3. Se connecte à la nouvelle base
4. Insère toutes les données dans le bon ordre

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'erreur dans Supabase
2. Vérifiez que les tables sont créées avec la bonne structure
3. Vérifiez l'ordre d'importation
4. Partagez les erreurs spécifiques pour assistance









