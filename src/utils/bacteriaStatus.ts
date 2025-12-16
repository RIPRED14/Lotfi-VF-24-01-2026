import { format, differenceInHours } from 'date-fns';

// Interface pour le statut d'une bactérie
export interface BacteriaStatus {
  status: 'ready' | 'completed' | 'waiting';
  color: string;
  textColor: string;
  borderColor: string;
  icon: string;
  label: string;
  description: string;
}

// Délais des bactéries en heures
export const BACTERIA_DELAYS: Record<string, number> = {
  'Entérobactéries': 24,
  'Escherichia coli': 24,
  'Coliformes totaux': 24,
  'Staphylocoques': 24,
  'Listeria': 48,
  'Levures/Moisissures (3j)': 72,
  'Flore totales': 72,
  'Leuconostoc': 96,
  'Levures/Moisissures (5j)': 120
};

// Couleurs selon le statut
export const STATUS_COLORS = {
  ready: {
    color: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: '🔴',
    label: 'À remplir',
    description: 'Délai écoulé - Lecture requise'
  },
  completed: {
    color: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: '✅',
    label: 'Terminé',
    description: 'Lecture terminée'
  },
  waiting: {
    color: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    icon: '⏳',
    label: 'En attente',
    description: 'Délai d\'incubation en cours'
  }
};

/**
 * Détermine le statut d'une bactérie selon sa date d'ensemencement et son état de lecture
 */
export function getBacteriaStatus(
  bacteriaName: string,
  seedingDate: string | Date,
  readingCompleted: boolean = false
): BacteriaStatus {
  
  // Si la lecture est déjà terminée
  if (readingCompleted) {
    return {
      status: 'completed',
      ...STATUS_COLORS.completed
    };
  }

  const seedingDateTime = new Date(seedingDate);
  const now = new Date();
  const hoursElapsed = differenceInHours(now, seedingDateTime);
  
  // Obtenir le délai requis pour cette bactérie
  const requiredHours = BACTERIA_DELAYS[bacteriaName] || 24;
  
  // Si le délai est écoulé, la bactérie est prête pour lecture
  if (hoursElapsed >= requiredHours) {
    return {
      status: 'ready',
      ...STATUS_COLORS.ready
    };
  }
  
  // Sinon, elle est en attente
  return {
    status: 'waiting',
    ...STATUS_COLORS.waiting
  };
}

/**
 * Calcule le temps restant avant qu'une bactérie soit prête pour lecture
 */
export function getTimeRemaining(bacteriaName: string, seedingDate: string | Date): string {
  const seedingDateTime = new Date(seedingDate);
  const now = new Date();
  const hoursElapsed = differenceInHours(now, seedingDateTime);
  const requiredHours = BACTERIA_DELAYS[bacteriaName] || 24;
  
  if (hoursElapsed >= requiredHours) {
    return 'Prêt pour lecture';
  }
  
  const hoursRemaining = requiredHours - hoursElapsed;
  
  if (hoursRemaining > 24) {
    const daysRemaining = Math.ceil(hoursRemaining / 24);
    return `${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''}`;
  }
  
  return `${hoursRemaining}h restante${hoursRemaining > 1 ? 's' : ''}`;
}

/**
 * Formate l'affichage du délai d'une bactérie
 */
export function formatBacteriaDelay(bacteriaName: string): string {
  const hours = BACTERIA_DELAYS[bacteriaName] || 24;
  
  if (hours >= 24) {
    const days = hours / 24;
    return `${days}j`;
  }
  
  return `${hours}h`;
}

/**
 * Groupe les bactéries par leur statut
 */
export function groupBacteriaByStatus(
  bacteriaList: Array<{
    name: string;
    seedingDate: string | Date;
    readingCompleted: boolean;
  }>
): Record<'ready' | 'completed' | 'waiting', typeof bacteriaList> {
  
  const grouped = {
    ready: [] as typeof bacteriaList,
    completed: [] as typeof bacteriaList,
    waiting: [] as typeof bacteriaList
  };
  
  bacteriaList.forEach(bacteria => {
    const status = getBacteriaStatus(bacteria.name, bacteria.seedingDate, bacteria.readingCompleted);
    grouped[status.status].push(bacteria);
  });
  
  return grouped;
} 