// ============================================================
// Script Node.js pour migrer toutes les données
// entre l'ancienne et la nouvelle base Supabase
// ============================================================
// Usage: node migrate-all-data.js
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================
// ⚠️ MODIFIEZ CES VALEURS avec vos URLs et clés

const OLD_SUPABASE_URL = 'https://VOTRE-ANCIEN-PROJECT-ID.supabase.co';
const OLD_SUPABASE_KEY = 'VOTRE-ANCIEN-ANON-KEY';

const NEW_SUPABASE_URL = 'https://vwecfxtgqyuydhlvutvg.supabase.co';
const NEW_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZWNmeHRncXl1eWRobHZ1dHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzY5OTQsImV4cCI6MjA3NzMxMjk5NH0.6oZR5-NV8XDxQgIJlm4R7zarf5kFg0-tN26ko_kpye8';

// Créer les clients Supabase
const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newClient = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

// ============================================================
// FONCTION DE MIGRATION
// ============================================================
async function migrateTable(tableName, orderBy = 'id') {
  console.log(`\n🔄 Migration de la table: ${tableName}`);
  
  try {
    // 1. Lire depuis l'ancienne base
    console.log(`   📥 Lecture depuis l'ancienne base...`);
    const { data, error: readError } = await oldClient
      .from(tableName)
      .select('*')
      .order(orderBy);
    
    if (readError) {
      console.error(`   ❌ Erreur lecture: ${readError.message}`);
      return { success: false, error: readError };
    }
    
    if (!data || data.length === 0) {
      console.log(`   ⚠️  Table vide, rien à migrer`);
      return { success: true, count: 0 };
    }
    
    console.log(`   ✅ ${data.length} lignes trouvées`);
    
    // 2. Insérer dans la nouvelle base
    console.log(`   📤 Insertion dans la nouvelle base...`);
    
    // Diviser en lots de 1000 pour éviter les limites
    const batchSize = 1000;
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error: insertError } = await newClient
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        console.error(`   ❌ Erreur insertion lot ${i / batchSize + 1}: ${insertError.message}`);
        
        // Essayer d'insérer ligne par ligne pour identifier les problèmes
        if (batch.length > 1) {
          console.log(`   🔍 Tentative insertion ligne par ligne...`);
          for (const row of batch) {
            const { error: singleError } = await newClient
              .from(tableName)
              .insert(row);
            
            if (singleError) {
              console.error(`   ❌ Erreur ligne: ${JSON.stringify(row).substring(0, 100)}...`);
              console.error(`   ❌ Détails: ${singleError.message}`);
            } else {
              inserted++;
            }
          }
        }
        
        return { success: false, error: insertError };
      }
      
      inserted += batch.length;
      console.log(`   ✅ ${inserted}/${data.length} lignes insérées...`);
    }
    
    console.log(`   ✅ Migration terminée: ${inserted} lignes insérées`);
    return { success: true, count: inserted };
    
  } catch (error) {
    console.error(`   💥 Erreur générale: ${error.message}`);
    return { success: false, error };
  }
}

// ============================================================
// ORDRE DE MIGRATION (important pour les clés étrangères)
// ============================================================
const migrationOrder = [
  { table: 'sites', orderBy: 'id' },
  { table: 'bacteries_types', orderBy: 'id' },
  { table: 'product_thresholds', orderBy: 'id' }, // IMPORTANT pour les produits!
  { table: 'ufc_count_levures_moisissures', orderBy: 'id' },
  { table: 'form_bacteria_selections', orderBy: 'id' },
  { table: 'batch_numbers', orderBy: 'id' },
  { table: 'produits', orderBy: 'id' },
  { table: 'produit_bacteries', orderBy: 'id' },
  { table: 'samples', orderBy: 'id' },
  { table: 'sample_forms', orderBy: 'id' },
  { table: 'form_samples', orderBy: 'id' },
  { table: 'analyses_planifiees', orderBy: 'id' },
  { table: 'notifications', orderBy: 'id' },
  { table: 'change_history', orderBy: 'id' },
  { table: 'audit_logs', orderBy: 'id' },
  { table: 'air_static_locations', orderBy: 'id' },
];

// ============================================================
// FONCTION PRINCIPALE
// ============================================================
async function main() {
  console.log('🚀 Début de la migration complète');
  console.log('=====================================\n');
  
  const results = [];
  
  for (const { table, orderBy } of migrationOrder) {
    const result = await migrateTable(table, orderBy);
    results.push({ table, ...result });
    
    // Petite pause entre les tables
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Résumé
  console.log('\n=====================================');
  console.log('📊 RÉSUMÉ DE LA MIGRATION');
  console.log('=====================================\n');
  
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalRows = 0;
  
  results.forEach(({ table, success, count, error }) => {
    if (success) {
      console.log(`✅ ${table}: ${count || 0} lignes`);
      totalSuccess++;
      totalRows += count || 0;
    } else {
      console.log(`❌ ${table}: ÉCHEC - ${error?.message || 'Erreur inconnue'}`);
      totalFailed++;
    }
  });
  
  console.log('\n=====================================');
  console.log(`✅ Tables migrées avec succès: ${totalSuccess}`);
  console.log(`❌ Tables en échec: ${totalFailed}`);
  console.log(`📊 Total lignes migrées: ${totalRows}`);
  console.log('=====================================\n');
  
  if (totalFailed > 0) {
    console.log('⚠️  Certaines tables ont échoué. Vérifiez les erreurs ci-dessus.');
    process.exit(1);
  } else {
    console.log('🎉 Migration terminée avec succès!');
    process.exit(0);
  }
}

// Exécuter
main().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});









