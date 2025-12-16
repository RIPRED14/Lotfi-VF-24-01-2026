# Configuration Supabase - Guide Complet

## Problème Détecté

❌ **Erreur : "Invalid API key"**

Cela signifie que :
- La clé API Supabase est expirée ou invalide
- Le projet Supabase n'existe plus ou a été supprimé
- Les permissions ont changé

## Solution : Créer un Nouveau Projet Supabase

### 1. Créer un Compte et Projet Supabase

1. **Aller sur [supabase.com](https://supabase.com)**
2. **Se connecter** ou créer un compte
3. **Cliquer sur "New Project"**
4. **Remplir les informations :**
   - Organization : Sélectionner ou créer
   - Project name : `microbiological-control` (ou votre choix)
   - Database password : Générer un mot de passe sécurisé
   - Region : Choisir la plus proche (ex: Europe West)
5. **Cliquer sur "Create new project"**

⏳ **Attendre** que le projet soit prêt (2-3 minutes)

### 2. Récupérer les Clés d'API

1. **Dans votre projet Supabase**, aller dans **Settings > API**
2. **Copier les informations suivantes :**

```env
# Project URL
VITE_SUPABASE_URL=https://[votre-project-id].supabase.co

# Anon/Public Key
VITE_SUPABASE_ANON_KEY=[votre-clé-anonyme]
```

### 3. Mettre à Jour la Configuration

1. **Ouvrir le fichier `.env.local`**
2. **Remplacer** les valeurs par les nouvelles :

```env
# Configuration Supabase - NOUVELLES VALEURS
VITE_SUPABASE_URL=https://[VOTRE-NOUVEAU-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[VOTRE-NOUVELLE-CLÉ-ANONYME]
```

### 4. Créer la Structure de Base de Données

Dans l'éditeur SQL de Supabase (**SQL Editor**), exécuter ce script :

```sql
-- 1. Créer la table samples
CREATE TABLE IF NOT EXISTS samples (
  id SERIAL PRIMARY KEY,
  form_id TEXT NOT NULL,
  report_title TEXT,
  brand TEXT,
  site TEXT,
  sample_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_by TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'draft', 'waiting_reading', 'cancelled')),
  
  -- Analyses de base
  odeur TEXT,
  texture TEXT,
  gout TEXT,
  aspect TEXT,
  ph DECIMAL(3,2),
  
  -- Workflow microbiologique
  reading_day TEXT,
  analysis_type TEXT,
  reading_date TEXT,
  
  -- Résultats microbiologiques (UFC/g)
  enterobacteria_count INTEGER,
  yeast_mold_count INTEGER,
  listeria_count INTEGER,
  coliforms_count INTEGER,
  staphylococcus_count INTEGER,
  
  -- Métadonnées de lecture
  reading_comments TEXT,
  reading_technician TEXT
);

-- 2. Créer les indexes pour performance
CREATE INDEX IF NOT EXISTS idx_samples_form_id ON samples(form_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_reading_date ON samples(reading_date);
CREATE INDEX IF NOT EXISTS idx_samples_reading_technician ON samples(reading_technician);

-- 3. Créer les tables annexes pour les analyses planifiées
CREATE TABLE IF NOT EXISTS analyses_planifiees (
  id SERIAL PRIMARY KEY,
  bacterie TEXT NOT NULL,
  delai TEXT NOT NULL,
  jour TEXT NOT NULL,
  semaine INTEGER NOT NULL,
  date_analyse TEXT NOT NULL,
  site TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Créer la table des analyses en cours
CREATE TABLE IF NOT EXISTS analyses_en_cours (
  id SERIAL PRIMARY KEY,
  bacterie TEXT NOT NULL,
  delai TEXT NOT NULL,
  date_analyse TEXT NOT NULL,
  site TEXT NOT NULL,
  status TEXT DEFAULT 'en_cours',
  sample_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Activer Row Level Security (optionnel pour le développement)
-- ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analyses_planifiees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analyses_en_cours ENABLE ROW LEVEL SECURITY;

-- Message de confirmation
SELECT 'Base de données initialisée avec succès!' as message;
```

### 5. Configurer l'Authentification (Optionnel)

1. **Aller dans Authentication > Settings**
2. **Configurer les providers souhaités :**
   - Email/Password (activé par défaut)
   - Google, GitHub, etc. (optionnel)
3. **Configurer les URLs :**
   - Site URL : `http://localhost:5173` (développement)
   - Redirect URLs : `http://localhost:5173/**`

### 6. Tester la Nouvelle Configuration

1. **Redémarrer le serveur de développement :**
```bash
npm run dev
```

2. **Tester via l'application :**
   - Aller sur `http://localhost:5173/test-supabase`
   - Cliquer sur "Tester la Connexion"

3. **Tester via le script :**
```bash
node test-supabase-connection.js
```

## Vérification de la Configuration

### ✅ Configuration Correcte :
```
Configuration:
- URL: ✅ https://[votre-project-id].supabase.co
- Clé: ✅ eyJhbGciOiJIUzI1NiIs...

Test 1: Connexion de base...
✅ Connexion réussie!
```

### ❌ Configuration Incorrecte :
```
❌ Erreur: Invalid API key
❌ Erreur: Invalid JWT
❌ Erreur: relation "samples" does not exist
```

## Résolution des Problèmes Courants

### Erreur : "Invalid API key"
- ✅ Vérifier que la clé dans `.env.local` correspond à celle dans Supabase
- ✅ Vérifier que l'URL du projet est correcte
- ✅ Redémarrer le serveur de développement

### Erreur : "relation does not exist"
- ✅ Exécuter le script de création de base de données
- ✅ Vérifier dans l'onglet "Table Editor" de Supabase

### Erreur : "JWT expired"
- ✅ Régénérer une nouvelle clé API dans Supabase
- ✅ Mettre à jour le fichier `.env.local`

## Scripts Utiles

```bash
# Tester la connexion
node test-supabase-connection.js

# Lancer l'app avec test intégré
npm run dev
# Puis aller sur http://localhost:5173/test-supabase

# Build de production
npm run build
```

## Support

- 📖 [Documentation Supabase](https://supabase.com/docs)
- 🎯 [Guide JavaScript/TypeScript](https://supabase.com/docs/reference/javascript)
- 💬 [Communauté Discord](https://discord.supabase.com/)

---

**Note :** Gardez vos clés API confidentielles et ne les commitez jamais dans Git ! 