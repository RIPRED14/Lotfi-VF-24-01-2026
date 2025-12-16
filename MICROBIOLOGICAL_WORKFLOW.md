# Système de Contrôle Microbiologique - Documentation

## Vue d'ensemble

Ce système de contrôle microbiologique permet la gestion complète du processus d'analyse microbiologique, de la création de formulaires jusqu'à la saisie des résultats finaux.

## Architecture du Workflow

### 1. États des Formulaires (FormStatus)

Le système utilise les statuts suivants pour le suivi des formulaires :

- **`draft`** : Formulaire en brouillon
- **`in_progress`** : Analyses en cours (analyses de base)
- **`waiting_reading`** : En attente de lecture microbiologique
- **`completed`** : Analyses terminées
- **`cancelled`** : Formulaire annulé

### 2. Workflow Complet

```
1. Coordinateur → Crée formulaire (draft)
2. Coordinateur → Lance analyses (in_progress)
3. Technicien → Complète analyses de base + sélectionne bactéries + planifie lecture
4. Système → Change statut (waiting_reading)
5. Technicien → Effectue lectures microbiologiques
6. Système → Change statut (completed)
```

## Pages du Système

### 1. Page de Contrôle Qualité (`/quality-control`)
**Point d'entrée principal**
- Sélection du site et date d'analyse
- Accès rapide aux différentes fonctionnalités
- Différenciation des rôles (Coordinateur vs Technicien)

### 2. Page d'Analyses en Cours (`/analyses-en-cours`)
**Pour les techniciens**
- Vue des formulaires nécessitant une intervention
- Regroupement par `form_id`
- Accès direct aux formulaires pour analyse

### 3. Page de Gestion des Échantillons (`/gestion-echantillons`)
**Suivi détaillé**
- Filtrages par statut, site, terme de recherche
- Barre de progression des analyses de base
- Informations détaillées sur chaque échantillon

### 4. Calendrier des Lectures (`/lecture-calendar`)
**Planification des lectures**
- Organisation par type de bactérie et jour
- Calcul automatique des délais de lecture
- Navigation par semaine
- Accès direct à la saisie des résultats

### 5. Page de Saisie des Résultats (`/saisie-resultats`)
**Saisie des résultats microbiologiques**
- Interface spécialisée par type de bactérie
- Saisie en UFC/g (Unités Formant Colonies par gramme)
- Commentaires et observations
- Validation et sauvegarde automatique

### 6. Page d'Entrée d'Échantillons (`/sample-entry`)
**Saisie des échantillons**
- Formulaire principal enrichi avec système de statuts
- Analyses de base (odeur, texture, goût, aspect, pH)
- Planification des lectures microbiologiques
- Gestion des statuts de formulaire

## Types de Bactéries Supportées

Le système supporte l'analyse de 5 types principaux de micro-organismes :

1. **Entérobactéries** (Délai : 1 jour)
2. **Levures/Moisissures** (Délai : 5 jours)
3. **Listeria** (Délai : 2 jours)
4. **Coliformes totaux** (Délai : 1 jour)
5. **Staphylocoques** (Délai : 2 jours)

## Base de Données

### Tables Principales

#### Table `samples`
Champs ajoutés pour le workflow microbiologique :

```sql
-- Workflow et planification
reading_day TEXT                -- Jour planifié pour la lecture
analysis_type TEXT             -- Type d'analyse microbiologique
reading_date TEXT              -- Date effective de lecture

-- Résultats microbiologiques (UFC/g)
enterobacteria_count INTEGER   -- Entérobactéries
yeast_mold_count INTEGER       -- Levures/Moisissures
listeria_count INTEGER         -- Listeria
coliforms_count INTEGER        -- Coliformes totaux
staphylococcus_count INTEGER   -- Staphylocoques

-- Métadonnées de lecture
reading_comments TEXT          -- Commentaires du technicien
reading_technician TEXT        -- Nom du technicien ayant effectué la lecture

-- Statuts étendus
status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'draft', 'waiting_reading', 'cancelled'))
```

### Migrations SQL

Deux migrations sont disponibles :
1. `add_microbiological_workflow_fields.sql` - Champs de base du workflow
2. `add_microbiological_results_fields.sql` - Champs de résultats spécialisés

## Composants Clés

### FormStatusCard
Composant de gestion des statuts de formulaire :
- Affichage du statut actuel
- Transitions de statut possibles
- Actions contextuelles selon le statut

### ReadingCalendarPage
Composant de planification des lectures :
- Vue par bactérie ou par jour
- Calcul automatique des échéances
- Navigation temporelle

## Rôles et Permissions

### Coordinateur
- Création de nouveaux formulaires
- Gestion complète du workflow
- Accès à toutes les fonctionnalités
- Visualisation des statistiques

### Technicien
- Accès aux formulaires existants
- Saisie des analyses de base
- Saisie des résultats de lecture
- Pas de création de formulaire

## Utilisation

### Pour un Coordinateur

1. **Créer un nouveau formulaire**
   - Aller sur `/quality-control`
   - Sélectionner site et date
   - Cliquer sur "Créer une nouvelle analyse"

2. **Suivre l'avancement**
   - Utiliser `/gestion-echantillons` pour le suivi global
   - Consulter `/lecture-calendar` pour les planifications

### Pour un Technicien

1. **Accéder aux analyses en cours**
   - Aller sur `/analyses-en-cours`
   - Sélectionner un formulaire à analyser

2. **Compléter les analyses de base**
   - Remplir odeur, texture, goût, aspect, pH
   - Sélectionner les types de bactéries à analyser
   - Planifier la date de lecture

3. **Effectuer les lectures**
   - Utiliser `/lecture-calendar` pour voir les lectures du jour
   - Cliquer sur "Saisir résultats" pour un formulaire
   - Entrer les comptages en UFC/g

## Performance et Optimisation

Le système inclut des indexes sur :
- `form_id` (regroupement des échantillons)
- `status` (filtrage par statut)
- `reading_date` (requêtes temporelles)
- `reading_technician` (suivi par technicien)

## Évolutions Futures

- Notifications automatiques pour les échéances
- Génération de rapports PDF
- Intégration avec systèmes LIMS
- Alertes pour les résultats hors normes
- Dashboard temps réel avec métriques

## Support Technique

Pour toute question technique ou demande d'évolution, consulter la documentation du code source dans `/src/pages/` et `/src/components/`. 