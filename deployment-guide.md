# 🚀 Guide de Déploiement - Lotfi v8

## 📋 **Prérequis**

### **Environnement**
- Node.js >= 18.0.0
- npm >= 8.0.0 ou pnpm >= 7.0.0
- Git configuré
- Compte Supabase

### **Services Externes**
- **Supabase** : Base de données + Auth + Realtime
- **GitHub** : Repository et déploiement
- **Vercel/Netlify** : Hébergement (optionnel)

---

## 🔧 **Configuration Supabase**

### **1. Créer un Nouveau Projet**
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé anonyme

### **2. Variables d'Environnement**
```bash
# Copier et configurer
cp .env.example .env

# Éditer avec vos valeurs
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### **3. Configuration Base de Données**
```sql
-- Activer RLS (Row Level Security)
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Créer les policies de sécurité
CREATE POLICY "Users can view own data" ON samples
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON samples
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 🏗️ **Installation & Build**

### **Installation Locale**
```bash
# Cloner le projet
git clone https://github.com/RIPRED14/lotfi-v8.git
cd lotfi-v8

# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev
```

### **Build Production**
```bash
# Build optimisé
npm run build

# Prévisualiser le build
npm run preview

# Tests (si configurés)
npm run test
```

---

## 🌐 **Déploiement**

### **Option 1 : Vercel (Recommandé)**
```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement dans l'interface Vercel
```

### **Option 2 : Netlify**
```bash
# Installer Netlify CLI
npm i -g netlify-cli

# Build et déploiement
npm run build
netlify deploy --prod --dir=dist
```

### **Option 3 : Server Classique**
```bash
# Build
npm run build

# Copier le dossier dist/ sur votre serveur
# Configurer nginx/apache pour servir les fichiers statiques
```

---

## 🔐 **Configuration de Sécurité**

### **Variables d'Environnement Production**
```bash
# Ne JAMAIS exposer ces clés côté client
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Variables de production
VITE_DEV_MODE=false
VITE_DEBUG_LOGS=false
```

### **Supabase RLS Policies**
```sql
-- Exemple de policy pour les échantillons
CREATE POLICY "Coordinators can manage all samples" ON samples
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'coordinator'
  )
);
```

---

## 📊 **Monitoring & Analytics**

### **Supabase Dashboard**
- Surveiller les requêtes dans l'onglet "API"
- Vérifier les logs d'auth
- Monitorer les performances

### **Application Logs**
```typescript
// Logs de production désactivés automatiquement
if (import.meta.env.VITE_DEBUG_LOGS === 'true') {
  console.log('Debug info');
}
```

---

## 🔄 **Maintenance & Updates**

### **Backup Base de Données**
```bash
# Export des données (via Supabase Dashboard)
# Ou utiliser pg_dump si accès direct
```

### **Déploiement Continu**
```bash
# GitHub Actions (exemple)
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - uses: vercel/action@v1
```

---

## 🚨 **Troubleshooting**

### **Erreurs Communes**

**❌ "Supabase client not configured"**
```bash
# Vérifier .env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

**❌ "Build failed"**
```bash
# Nettoyer le cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

**❌ "Auth errors"**
```bash
# Vérifier les policies RLS sur Supabase
# Vérifier les rôles utilisateurs
```

### **Performance**
- Utiliser React DevTools pour identifier les re-renders
- Vérifier les requêtes Supabase redondantes
- Optimiser les images et assets

---

## 📞 **Support**

### **Documentation**
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
- [React Docs](https://react.dev)

### **Contact**
- GitHub Issues : [lotfi-v8/issues](https://github.com/RIPRED14/lotfi-v8/issues)
- Email : support@collet.fr (si configuré)

---

**✅ Guide mis à jour - Janvier 2025** 