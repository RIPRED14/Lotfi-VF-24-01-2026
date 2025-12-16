# Guide de Déploiement - Système de Contrôle Microbiologique

## Prérequis

- Compte Supabase actif
- Hébergeur web (Netlify, Vercel, ou serveur web classique)
- Node.js 18+ pour le build

## 1. Configuration Supabase

### Créer un nouveau projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL du projet et la clé anonyme

### Appliquer les migrations

Exécuter les scripts SQL suivants dans l'éditeur SQL de Supabase :

#### Migration 1 : Champs de workflow
```sql
-- Contenu de src/migrations/add_microbiological_workflow_fields.sql
```

#### Migration 2 : Champs de résultats
```sql
-- Contenu de src/migrations/add_microbiological_results_fields.sql
```

### Configuration de l'authentification

1. Aller dans **Authentication > Settings**
2. Configurer les providers souhaités (Email, Google, etc.)
3. Définir les URLs de redirection pour votre domaine

### Politiques de sécurité (RLS)

Activer Row Level Security sur la table `samples` :

```sql
-- Activer RLS
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés
CREATE POLICY "Users can view their own samples" ON samples
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Politique pour l'insertion
CREATE POLICY "Users can insert samples" ON samples
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Politique pour la mise à jour
CREATE POLICY "Users can update samples" ON samples
    FOR UPDATE USING (auth.uid() IS NOT NULL);
```

## 2. Build de Production

### Préparer l'environnement

1. **Copier le fichier d'environnement**
```bash
cp .env.example .env.local
```

2. **Configurer les variables**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Générer le build

```bash
# Installer les dépendances
npm install

# Générer le build de production
npm run build
```

Le dossier `dist/` contient les fichiers prêts pour le déploiement.

## 3. Déploiement

### Option A : Netlify

1. **Via l'interface web**
   - Glisser-déposer le dossier `dist/` sur netlify.com
   - Configurer les variables d'environnement dans Site Settings

2. **Via Git (recommandé)**
   - Connecter votre repository GitHub
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Variables d'environnement dans Site Settings > Environment variables

### Option B : Vercel

1. **Installation CLI**
```bash
npm i -g vercel
```

2. **Déploiement**
```bash
vercel --prod
```

3. **Configuration**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Variables d'environnement dans le dashboard Vercel

### Option C : Serveur Web Classique

1. **Upload des fichiers**
   - Transférer le contenu de `dist/` vers votre serveur web
   - Configurer le serveur pour servir `index.html` pour toutes les routes

2. **Configuration Apache (.htaccess)**
```apache
RewriteEngine On
RewriteBase /

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

3. **Configuration Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

## 4. Configuration Post-Déploiement

### Variables d'environnement

Configurer sur votre plateforme de déploiement :

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### URLs de redirection Supabase

Dans Supabase > Authentication > Settings > URL Configuration :

- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/**`

### Test de fonctionnement

1. **Accès à l'application** : Vérifier que l'URL fonctionne
2. **Authentification** : Tester la connexion/inscription
3. **Base de données** : Vérifier les opérations CRUD
4. **Navigation** : Tester toutes les routes

## 5. Monitoring et Maintenance

### Logs Supabase

- Surveiller les logs dans le dashboard Supabase
- Configurer des alertes pour les erreurs

### Performance

- Utiliser les outils de développement du navigateur
- Surveiller les métriques Core Web Vitals
- Optimiser les images et assets si nécessaire

### Sauvegardes

- Configurer les sauvegardes automatiques dans Supabase
- Exporter régulièrement les données critiques

## 6. Mise à Jour

### Processus de mise à jour

1. **Développement local**
```bash
git pull origin main
npm install
npm run build
```

2. **Test en staging** (recommandé)
   - Déployer sur un environnement de test
   - Valider les fonctionnalités

3. **Déploiement production**
   - Déployer via votre méthode choisie
   - Vérifier le bon fonctionnement

### Migrations de base de données

Pour les nouvelles migrations :

1. Créer le script SQL dans `/src/migrations/`
2. Tester en développement
3. Appliquer en production via l'interface Supabase

## 7. Dépannage

### Erreurs communes

**Build qui échoue**
- Vérifier les variables d'environnement
- Vérifier les dépendances avec `npm install`

**Erreurs de connexion Supabase**
- Vérifier l'URL et la clé dans les variables d'environnement
- Vérifier les politiques RLS

**Routes qui ne fonctionnent pas**
- Configurer la redirection vers `index.html`
- Vérifier la configuration du serveur web

### Support

- Documentation Supabase : [docs.supabase.com](https://docs.supabase.com)
- Documentation Vite : [vitejs.dev](https://vitejs.dev)
- Issues GitHub du projet

---

**Note** : Ce guide suppose une configuration standard. Adaptez selon vos besoins spécifiques. 