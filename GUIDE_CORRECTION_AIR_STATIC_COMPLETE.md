# Guide pour corriger la table air_static_locations

## Problème
La colonne "site" n'existe pas dans la table `air_static_locations`, mais le code l'utilise. La structure de la table ne correspond pas à ce qui est attendu.

## Solution

### Option 1 : Script simple (RECOMMANDÉ si vous voulez repartir de zéro)

**Fichier : `fix_air_static_locations_SIMPLE_FINAL.sql`**

Ce script :
1. Sauvegarde les données existantes (si elles existent)
2. Supprime l'ancienne table
3. Crée une nouvelle table avec la bonne structure
4. Insère les données correctes

**Comment utiliser :**
1. Ouvrez Supabase Dashboard : https://vwecfxtgqyuydhlvutvg.supabase.co
2. Allez dans **SQL Editor**
3. Ouvrez le fichier `fix_air_static_locations_SIMPLE_FINAL.sql`
4. **MODIFIEZ les valeurs** dans la section INSERT selon vos données réelles
5. Exécutez le script

### Option 2 : Vérifier d'abord la structure existante

**Fichier : `check_air_static_locations_structure.sql`**

Ce script vous permet de voir :
- Si la table existe
- Quelles colonnes existent
- Quelles données sont actuellement dans la table

**Comment utiliser :**
1. Exécutez d'abord `check_air_static_locations_structure.sql` dans Supabase SQL Editor
2. Copiez les résultats et partagez-les avec moi pour créer un script de conversion personnalisé

### Option 3 : Script complet avec récupération de données

**Fichier : `fix_air_static_locations_FINAL.sql`**

Ce script vous permet de :
1. Vérifier la structure actuelle
2. Exporter les données existantes
3. Convertir et réinsérer les données si nécessaire

## Structure correcte de la table

La table `air_static_locations` doit avoir ces colonnes :

| Colonne | Type | Description |
|---------|------|------------|
| `id` | UUID | Identifiant unique (généré automatiquement) |
| `site` | TEXT | Nom du site (ex: "Laiterie Collet (R1)") |
| `lieu` | TEXT | Nom du lieu (ex: "PSM I", "PSM II") |
| `zone` | TEXT | Zone du lieu (ex: "Zone de production") |
| `volume_prelevement` | NUMERIC(10,2) | Volume en litres (ex: 1.0) |
| `limite_max` | NUMERIC(10,2) | Limite maximale en UFC/m³ (ex: 10, 50, 0) |
| `comparison_operator` | TEXT | Opérateur de comparaison ("<", "=", etc.) |
| `is_active` | BOOLEAN | Statut actif (true/false) |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de modification |

## Données à insérer

**IMPORTANT** : Les valeurs dans les scripts sont des EXEMPLES. Vous devez les remplacer par vos vraies données :

1. **Sites** : Les noms exacts de vos sites
   - "Laiterie Collet (R1)"
   - "Végétal Santé (R2)"
   - "Laiterie Baiko"
   - Ou autres selon votre cas

2. **Lieux** : Liste complète de tous les lieux pour chaque site
   - "PSM I"
   - "PSM II"
   - "INTERIEUR CONDITIONNEUSE ATIA"
   - Autres lieux selon votre cas

3. **Zones** : Zones correspondantes
   - "Zone de production"
   - "Zone de conditionnement"
   - "Zone d'emballage"
   - Autres zones selon votre cas

4. **Volumes** : Volumes de prélèvement réels (en litres)
   - Exemple : 1.0, 2.5, etc.

5. **Limites** : Limites maximales réelles (en UFC/m³)
   - Exemple : 10, 50, 100
   - Pour absence totale : 0 avec `comparison_operator = '='`

6. **Opérateurs** :
   - `"<"` pour valeurs inférieures à la limite
   - `"="` pour absence totale (quand limite_max = 0)

## Exemple de données correctes

```sql
-- Lieu avec limite standard
INSERT INTO air_static_locations (site, lieu, zone, volume_prelevement, limite_max, comparison_operator, is_active)
VALUES
  ('Laiterie Collet (R1)', 'PSM I', 'Zone de production', 1.0, 10, '<', true);

-- Lieu avec absence totale requise
INSERT INTO air_static_locations (site, lieu, zone, volume_prelevement, limite_max, comparison_operator, is_active)
VALUES
  ('Laiterie Collet (R1)', 'INTERIEUR CONDITIONNEUSE ATIA', 'Zone de conditionnement', 1.0, 0, '=', true);
```

## Vérification après correction

Exécutez cette requête pour vérifier :

```sql
SELECT 
    id,
    site,
    lieu,
    zone,
    volume_prelevement,
    limite_max,
    comparison_operator,
    is_active
FROM air_static_locations
WHERE is_active = true
ORDER BY site, zone, lieu;
```

## Si vous avez des données existantes à récupérer

Si vous avez des données dans la table backup et que vous voulez les convertir :

1. D'abord, vérifiez la structure de la table backup :
```sql
SELECT * FROM air_static_locations_backup LIMIT 5;
```

2. Ensuite, adaptez cette requête selon les noms de colonnes réels :
```sql
INSERT INTO air_static_locations (site, lieu, zone, volume_prelevement, limite_max, comparison_operator, is_active)
SELECT 
    COALESCE(site, 'Site par défaut') AS site,  -- Adaptez selon votre structure
    COALESCE(lieu, lieu_nom) AS lieu,  -- Adaptez selon votre structure
    COALESCE(zone, zone_nom) AS zone,  -- Adaptez selon votre structure
    COALESCE(volume_prelevement::numeric, 1.0) AS volume_prelevement,
    COALESCE(limite_max::numeric, 10) AS limite_max,
    COALESCE(comparison_operator, '<') AS comparison_operator,
    COALESCE(is_active, true) AS is_active
FROM air_static_locations_backup;
```

## Support

Si vous avez besoin d'aide :
1. Exécutez d'abord `check_air_static_locations_structure.sql` pour voir la structure actuelle
2. Partagez les résultats avec moi
3. Je pourrai créer un script de conversion personnalisé exact









