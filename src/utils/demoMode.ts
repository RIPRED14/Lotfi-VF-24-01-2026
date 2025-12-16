// Utilitaires pour le mode démo
export const isDemoMode = (): boolean => {
  // Vérifier d'abord la variable d'environnement
  if ((import.meta as any).env?.VITE_MODE_DEMO === 'true') {
    return true;
  }
  
  // Vérifier le localStorage pour un toggle manuel
  const localDemo = localStorage.getItem('DEMO_MODE');
  return localDemo === 'true';
};

// Activer/désactiver le mode démo manuellement
export const toggleDemoMode = (enabled: boolean): void => {
  localStorage.setItem('DEMO_MODE', enabled.toString());
  // Recharger la page pour appliquer les changements
  window.location.reload();
};

// Délais des bactéries en mode démo (en minutes au lieu d'heures)
export const DEMO_BACTERIA_DELAYS: Record<string, number> = {
  'Entérobactéries': 1,              // 24h → 1 min
  'Escherichia coli': 1,             // 24h → 1 min
  'Coliformes totaux': 1,            // 24h → 1 min
  'Staphylocoques': 1,               // 24h → 1 min
  'Listeria': 2,                     // 48h → 2 min
  'Levures/Moisissures (3j)': 3,     // 3j → 3 min
  'Levures/Moisissures': 3,          // 3j → 3 min
  'Flore totales': 3,                // 72h → 3 min
  'Leuconostoc': 4,                  // 4j → 4 min
  'Levures/Moisissures (5j)': 5      // 5j → 5 min
};

// Obtenir le délai d'une bactérie (en minutes pour le mode démo, en heures sinon)
export const getBacteriaDelay = (bacteriaName: string): number => {
  if (isDemoMode()) {
    return DEMO_BACTERIA_DELAYS[bacteriaName] || 1; // minutes
  }
  
  // Délais normaux en heures (importés depuis bacteriaStatus.ts)
  const normalDelays: Record<string, number> = {
    'Entérobactéries': 24,
    'Escherichia coli': 24,
    'Coliformes totaux': 24,
    'Staphylocoques': 24,
    'Listeria': 48,
    'Levures/Moisissures (3j)': 72,
    'Levures/Moisissures': 72,
    'Flore totales': 72,
    'Leuconostoc': 96,
    'Levures/Moisissures (5j)': 120
  };
  
  return normalDelays[bacteriaName] || 24; // heures
};

// Formater l'affichage du délai
export const formatBacteriaDelay = (bacteriaName: string): string => {
  const delay = getBacteriaDelay(bacteriaName);
  
  if (isDemoMode()) {
    return `${delay}min`;
  }
  
  if (delay >= 24) {
    const days = delay / 24;
    return `${days}j`;
  }
  
  return `${delay}h`;
};

// Calculer la date de lecture d'une bactérie
export const calculateReadingDate = (bacteriaName: string, seedingDate: Date): Date => {
  const delay = getBacteriaDelay(bacteriaName);
  const readingDate = new Date(seedingDate);
  
  if (isDemoMode()) {
    // Ajouter les minutes
    readingDate.setMinutes(readingDate.getMinutes() + delay);
  } else {
    // Ajouter les heures
    readingDate.setHours(readingDate.getHours() + delay);
  }
  
  return readingDate;
};

// Vérifier si une bactérie est prête pour lecture
export const isBacteriaReady = (bacteriaName: string, seedingDate: Date): boolean => {
  const readingDate = calculateReadingDate(bacteriaName, seedingDate);
  return new Date() >= readingDate;
};

// Obtenir le temps restant avant lecture
export const getTimeRemaining = (bacteriaName: string, seedingDate: Date): string => {
  const readingDate = calculateReadingDate(bacteriaName, seedingDate);
  const now = new Date();
  
  if (now >= readingDate) {
    return 'Prêt pour lecture';
  }
  
  const diffMs = readingDate.getTime() - now.getTime();
  
  if (isDemoMode()) {
    const minutesRemaining = Math.ceil(diffMs / (1000 * 60));
    return `${minutesRemaining}min restante${minutesRemaining > 1 ? 's' : ''}`;
  }
  
  const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
  
  if (hoursRemaining > 24) {
    const daysRemaining = Math.ceil(hoursRemaining / 24);
    return `${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''}`;
  }
  
  return `${hoursRemaining}h restante${hoursRemaining > 1 ? 's' : ''}`;
}; 