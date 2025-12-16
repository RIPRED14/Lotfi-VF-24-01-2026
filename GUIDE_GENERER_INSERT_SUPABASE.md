# Guide : Générer les INSERT SQL depuis Supabase

## Oui, Supabase peut générer du SQL INSERT !

Il y a **3 méthodes** pour transformer vos tables en code SQL INSERT :

### Méthode 1 : Script SQL simple (RECOMMANDÉ) ⭐

**Fichier : `generate_inserts_SIMPLE.sql`**

1. **Dans l'ancienne base Supabase** :
   - Ouvrez le **SQL Editor**
   - Copiez-collez chaque section du script (une table à la fois)
   - Exécutez la requête
   - **Copiez les résultats** (les INSERT statements)

2. **Dans la nouvelle base Supabase** :
   - Ouvrez le **SQL Editor**
   - Collez les INSERT statements copiés
   - Exécutez-les

**Avantages :**
- ✅ Simple et direct
- ✅ Pas besoin d'installer quoi que ce soit
- ✅ Fonctionne directement dans Supabase SQL Editor

### Méthode 2 : Fonction PostgreSQL automatique

**Fichier : `generate_insert_statements.sql`**

Ce script crée une fonction qui génère automatiquement tous les INSERT.

1. **Dans l'ancienne base** :
   - Exécutez le script complet
   - Il génère automatiquement tous les INSERT

**Avantages :**
- ✅ Automatique
- ✅ Gère tous les types de données

**Inconvénients :**
- ⚠️ Peut être lent pour les très grandes tables (>10,000 lignes)

### Méthode 3 : Export CSV puis import

1. **Dans l'ancienne base Supabase** :
   - Allez dans **Table Editor**
   - Sélectionnez une table
   - Cliquez sur **Export** > **CSV**
   - Téléchargez le fichier

2. **Dans la nouvelle base Supabase** :
   - Allez dans **Table Editor**
   - Sélectionnez la table correspondante
   - Cliquez sur **Insert** > **Import from CSV**
   - Sélectionnez le fichier CSV

**Avantages :**
- ✅ Interface graphique simple
- ✅ Pas besoin de SQL

**Inconvénients :**
- ⚠️ Doit être fait table par table
- ⚠️ Peut ne pas fonctionner pour les très grandes tables

## Ordre recommandé d'export/import

1. **sites** (3 lignes)
2. **bacteries_types** (9 lignes)
3. **product_thresholds** (74 lignes) ⚠️ **CRITIQUE**
4. **ufc_count_levures_moisissures** (151 lignes)
5. **form_bacteria_selections** (27 lignes)
6. **batch_numbers** (2 lignes)
7. **samples** (57 lignes)
8. **notifications** (1,664 lignes)
9. **change_history** (11,528 lignes) - Par lots de 1000
10. **audit_logs** (214 lignes)

## Pour les très grandes tables (change_history)

Pour `change_history` avec 11,528 lignes, exécutez par lots :

```sql
-- Lot 1: Lignes 1-1000
SELECT ... FROM change_history ORDER BY id LIMIT 1000 OFFSET 0;

-- Lot 2: Lignes 1001-2000
SELECT ... FROM change_history ORDER BY id LIMIT 1000 OFFSET 1000;

-- Continuez jusqu'à la fin...
```

## Exemple d'utilisation

### Étape 1 : Générer les INSERT

Dans l'**ancienne base**, exécutez :

```sql
SELECT 
    'INSERT INTO sites (id, site, nom, numero) VALUES (' ||
    COALESCE('''' || REPLACE(id::text, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(site, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(nom, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(numero, '''', '''''') || '''', 'NULL') || ');' AS insert_statement
FROM sites
ORDER BY id;
```

**Résultat :**
```
INSERT INTO sites (id, site, nom, numero) VALUES ('1', 'R1', 'Laiterie Collet (R1)', '123');
INSERT INTO sites (id, site, nom, numero) VALUES ('2', 'R2', 'Végétal Santé (R2)', '456');
INSERT INTO sites (id, site, nom, numero) VALUES ('3', 'BAIKO', 'Laiterie Baiko', '789');
```

### Étape 2 : Exécuter dans la nouvelle base

Copiez-collez les INSERT statements dans la **nouvelle base** et exécutez-les.

## Vérification après import

```sql
SELECT 
    'sites' AS table_name,
    COUNT(*) AS nombre_lignes
FROM sites
UNION ALL
SELECT 'product_thresholds', COUNT(*) FROM product_thresholds
UNION ALL
SELECT 'samples', COUNT(*) FROM samples;
```

## Astuce : Copier plusieurs résultats à la fois

Dans Supabase SQL Editor :
1. Exécutez la requête
2. Cliquez sur les résultats
3. Sélectionnez tout (Ctrl+A)
4. Copiez (Ctrl+C)
5. Collez dans la nouvelle base (Ctrl+V)

## Résumé

✅ **Méthode recommandée** : `generate_inserts_SIMPLE.sql`  
✅ **Plus simple** : Export CSV via Table Editor  
✅ **Plus automatique** : Fonction PostgreSQL `generate_insert_statements`

**Toutes les méthodes fonctionnent directement dans Supabase sans installation supplémentaire !**









