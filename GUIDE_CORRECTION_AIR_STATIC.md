# Guide de correction de la table air_static_locations

## Problème
La table `air_static_locations` contient des données incorrectes.

## Solution

### Option 1 : Script complet (recommandé)
Utilisez le fichier `fix_air_static_locations.sql` qui :
- Désactive les anciennes données (garde l'historique)
- Insère les nouvelles données correctes

### Option 2 : Script simple
Utilisez le fichier `fix_air_static_locations_SIMPLE.sql` qui :
- Supprime toutes les données existantes
- Insère les nouvelles données correctes

## Structure de la table

La table `air_static_locations` doit contenir :
- **id** : UUID (généré automatiquement)
- **site** : Nom du site (ex: "Laiterie Collet (R1)", "Végétal Santé (R2)", "Laiterie Baiko")
- **lieu** : Nom du lieu (ex: "PSM I", "PSM II", "INTERIEUR CONDITIONNEUSE ATIA")
- **zone** : Zone du lieu (ex: "Zone de production", "Zone de conditionnement")
- **volume_prelevement** : Volume en litres (ex: 1.0)
- **limite_max** : Limite maximale en UFC/m³ (ex: 10, 50, 100, ou 0 pour absence totale)
- **comparison_operator** : Opérateur de comparaison ("<", "<=", "=", ">", ">=")
- **is_active** : Statut actif (true/false)

## Comment utiliser le script

### Méthode 1 : Via Supabase Dashboard
1. Connectez-vous à votre projet Supabase : https://vwecfxtgqyuydhlvutvg.supabase.co
2. Allez dans **SQL Editor**
3. Ouvrez le fichier `fix_air_static_locations.sql` ou `fix_air_static_locations_SIMPLE.sql`
4. **MODIFIEZ les valeurs** selon vos données réelles
5. Copiez-collez le script dans l'éditeur SQL
6. Cliquez sur **Run** ou **Exécuter**

### Méthode 2 : Via psql (ligne de commande)
```bash
psql -h db.vwecfxtgqyuydhlvutvg.supabase.co -U postgres -d postgres -f fix_air_static_locations.sql
```

## Données à modifier

**IMPORTANT** : Les valeurs dans les scripts sont des EXEMPLES. Vous devez les remplacer par vos vraies données :

1. **Sites** : Vérifiez les noms exacts des sites dans votre application
2. **Lieux** : Liste complète de tous les lieux pour chaque site
3. **Zones** : Zones correspondantes à chaque lieu
4. **Volumes** : Volumes de prélèvement réels (en litres)
5. **Limites** : Limites maximales réelles (en UFC/m³)
6. **Opérateurs** : 
   - `=` pour absence totale (limite_max = 0)
   - `<` pour valeurs inférieures à la limite

## Exemple de données correctes

Pour un lieu avec limite d'absence totale :
```sql
INSERT INTO air_static_locations (id, site, lieu, zone, volume_prelevement, limite_max, comparison_operator, is_active)
VALUES
  (gen_random_uuid(), 'Laiterie Collet (R1)', 'INTERIEUR CONDITIONNEUSE ATIA', 'Zone de conditionnement', 1.0, 0, '=', true);
```

Pour un lieu avec limite standard :
```sql
INSERT INTO air_static_locations (id, site, lieu, zone, volume_prelevement, limite_max, comparison_operator, is_active)
VALUES
  (gen_random_uuid(), 'Laiterie Collet (R1)', 'PSM I', 'Zone de production', 1.0, 10, '<', true);
```

## Vérification après correction

Exécutez cette requête pour vérifier :
```sql
SELECT 
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

## Support

Si vous avez besoin d'aide pour identifier les bonnes données :
1. Vérifiez les données existantes dans Supabase Dashboard
2. Consultez vos documents de référence (normes, procédures)
3. Vérifiez les données correctes dans l'ancienne base de données si disponible









