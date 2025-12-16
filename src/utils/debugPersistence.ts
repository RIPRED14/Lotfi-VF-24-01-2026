// Utilitaire de debug pour la persistance des données
export interface DebugInfo {
  timestamp: string;
  action: string;
  formId?: string;
  data?: any;
  source: string;
}

const DEBUG_KEY = 'lotfiv2-debug-persistence';
const MAX_DEBUG_ENTRIES = 50;

// Fonction pour logger les actions de persistance
export const logPersistenceAction = (action: string, data?: any, source: string = 'unknown', formId?: string) => {
  const debugInfo: DebugInfo = {
    timestamp: new Date().toISOString(),
    action,
    formId,
    data: data ? JSON.stringify(data).substring(0, 200) : undefined,
    source
  };

  try {
    const existing = localStorage.getItem(DEBUG_KEY);
    const debugLog: DebugInfo[] = existing ? JSON.parse(existing) : [];
    
    debugLog.unshift(debugInfo);
    
    // Garder seulement les dernières entrées
    if (debugLog.length > MAX_DEBUG_ENTRIES) {
      debugLog.splice(MAX_DEBUG_ENTRIES);
    }
    
    localStorage.setItem(DEBUG_KEY, JSON.stringify(debugLog));
    
    // Logger aussi dans la console avec un préfixe coloré
    const emoji = getActionEmoji(action);
    console.log(`${emoji} [${source}] ${action}`, formId ? `(Form: ${formId})` : '', data ? data : '');
  } catch (error) {
    console.warn('Erreur lors du logging de debug:', error);
  }
};

// Fonction pour obtenir l'emoji selon l'action
const getActionEmoji = (action: string): string => {
  const emojiMap: Record<string, string> = {
    'FORM_LOAD': '📂',
    'FORM_SAVE': '💾',
    'FORM_CLEAR': '🗑️',
    'BACTERIA_LOAD': '🦠',
    'BACTERIA_SYNC': '🔄',
    'SAMPLES_LOAD': '🧪',
    'NAVIGATION': '🧭',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'SUCCESS': '✅'
  };
  
  return emojiMap[action] || '📝';
};

// Fonction pour obtenir le log de debug
export const getDebugLog = (): DebugInfo[] => {
  try {
    const stored = localStorage.getItem(DEBUG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Erreur lors de la lecture du log de debug:', error);
    return [];
  }
};

// Fonction pour nettoyer le log de debug
export const clearDebugLog = () => {
  try {
    localStorage.removeItem(DEBUG_KEY);
    console.log('🧹 Log de debug nettoyé');
  } catch (error) {
    console.warn('Erreur lors du nettoyage du log de debug:', error);
  }
};

// Fonction pour analyser les problèmes potentiels
export const analyzePersistenceIssues = (): string[] => {
  const issues: string[] = [];
  const debugLog = getDebugLog();
  
  if (debugLog.length === 0) {
    return ['Aucun log de debug disponible'];
  }
  
  // Analyser les 10 dernières entrées
  const recentEntries = debugLog.slice(0, 10);
  
  // Vérifier les erreurs récentes
  const recentErrors = recentEntries.filter(entry => entry.action === 'ERROR');
  if (recentErrors.length > 0) {
    issues.push(`${recentErrors.length} erreur(s) récente(s) détectée(s)`);
  }
  
  // Vérifier les chargements sans sauvegarde
  const loads = recentEntries.filter(entry => entry.action === 'FORM_LOAD');
  const saves = recentEntries.filter(entry => entry.action === 'FORM_SAVE');
  if (loads.length > saves.length + 2) {
    issues.push('Plus de chargements que de sauvegardes - possible perte de données');
  }
  
  // Vérifier les synchronisations multiples
  const syncs = recentEntries.filter(entry => entry.action === 'BACTERIA_SYNC');
  if (syncs.length > 3) {
    issues.push('Synchronisations multiples détectées - possible race condition');
  }
  
  // Vérifier les navigations rapides
  const navigations = recentEntries.filter(entry => entry.action === 'NAVIGATION');
  if (navigations.length > 2) {
    const timeDiffs = navigations.slice(0, -1).map((nav, index) => {
      const nextNav = navigations[index + 1];
      return new Date(nav.timestamp).getTime() - new Date(nextNav.timestamp).getTime();
    });
    
    const rapidNavigations = timeDiffs.filter(diff => diff < 2000); // Moins de 2 secondes
    if (rapidNavigations.length > 0) {
      issues.push('Navigation rapide détectée - possible interruption de sauvegarde');
    }
  }
  
  if (issues.length === 0) {
    issues.push('Aucun problème détecté dans les logs récents');
  }
  
  return issues;
};

// Fonction pour afficher un rapport de debug dans la console
export const printDebugReport = () => {
  console.group('🔍 Rapport de Debug - Persistance des Données');
  
  const debugLog = getDebugLog();
  console.log(`📊 Total d'entrées: ${debugLog.length}`);
  
  if (debugLog.length > 0) {
    console.log(`⏰ Dernière activité: ${debugLog[0].timestamp}`);
    
    // Grouper par action
    const actionCounts = debugLog.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📈 Actions par type:');
    Object.entries(actionCounts).forEach(([action, count]) => {
      console.log(`  ${getActionEmoji(action)} ${action}: ${count}`);
    });
    
    // Analyser les problèmes
    const issues = analyzePersistenceIssues();
    console.log('⚠️ Problèmes détectés:');
    issues.forEach(issue => console.log(`  • ${issue}`));
    
    // Afficher les dernières entrées
    console.log('📝 Dernières activités:');
    debugLog.slice(0, 5).forEach(entry => {
      console.log(`  ${getActionEmoji(entry.action)} ${entry.timestamp} - ${entry.action} (${entry.source})`);
    });
  }
  
  console.groupEnd();
};

// Hook pour utiliser le debug de persistance
export const usePersistenceDebug = (source: string) => {
  const log = (action: string, data?: any, formId?: string) => {
    logPersistenceAction(action, data, source, formId);
  };
  
  return { log };
}; 