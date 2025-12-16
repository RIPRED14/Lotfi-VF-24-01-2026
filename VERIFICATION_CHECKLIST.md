# ✅ CHECKLIST DE VÉRIFICATION

## 🔧 1. Colonnes ajoutées dans Supabase ?
- [ ] Vous avez exécuté les commandes SQL dans Supabase Dashboard
- [ ] Les nouvelles colonnes sont visibles dans Table Editor > samples

## 🔄 2. Application redémarrée ?
- [ ] Vous avez redémarré l'app avec `npm run dev`
- [ ] L'application s'ouvre sur http://localhost:8081

## 🧪 3. Test fonctionnel
- [ ] Connexion avec demo.demandeur@collet.fr / demo123
- [ ] Création d'un nouveau formulaire
- [ ] Sélection de **2+ bactéries différentes** (ex: Entérobactéries + Escherichia coli)
- [ ] Saisie de **valeurs différentes** pour chaque bactérie
- [ ] Sauvegarde réussie
- [ ] Vérification : chaque bactérie garde sa propre valeur

## 🔍 4. Test des formulaires archivés
- [ ] Ouverture d'un ancien formulaire avec plusieurs bactéries
- [ ] **TOUTES** les bactéries s'affichent (pas seulement une)
- [ ] Chaque bactérie montre sa valeur correcte

---

## 🎯 RÉSULTAT ATTENDU

**AVANT** :
- Saisie de 5 dans Entérobactéries → Escherichia coli affiche aussi 5
- Dans les archives : seulement 1 bactérie visible sur 3

**APRÈS** :
- Saisie de 5 dans Entérobactéries, 8 dans Escherichia coli → chacune garde sa valeur
- Dans les archives : TOUTES les bactéries visibles avec leurs valeurs

---

## 🚨 Si quelque chose ne marche pas

1. **Erreur de colonne manquante** → Vérifiez que toutes les commandes SQL ont été exécutées
2. **Application ne démarre pas** → Vérifiez les erreurs dans la console
3. **Même valeur encore** → Les colonnes ne sont pas créées ou mapping incorrect
4. **Une seule bactérie dans archives** → Problème de logique résolue dans le code

**Dites-moi quel point ne marche pas !** 🔍 