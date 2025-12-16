import { useMemo } from 'react';
import { useBacteriaSettingsStore } from '@/stores/bacteriaSettingsStore';

// Interface pour la compatibilité avec l'ancien code
export interface Bacteria {
  id: string;
  name: string;
  delai: string;
}

// Hook pour convertir les paramètres du store vers l'ancien format
export const useBacteriaCompat = () => {
  const { bacteria } = useBacteriaSettingsStore();

  const compatBacteria = useMemo(() => {
    return bacteria
      .filter(b => b.enabled)
      .map((b): Bacteria => ({
        id: b.id,
        name: b.name,
        delai: b.delayDisplay
      }));
  }, [bacteria]);

  return {
    bacteria: compatBacteria,
    BACTERIES: compatBacteria, // Pour compatibilité avec BACTERIES constant
    isLoading: false, // Le store Zustand est synchrone, pas de loading
    error: null // Pas de gestion d'erreur pour le moment
  };
};

// Fonction pour obtenir les informations d'une bactérie par nom
export const getBacteriaInfo = (name: string) => {
  const { getBacteriaByName } = useBacteriaSettingsStore.getState();
  const bacteria = getBacteriaByName(name);
  
  if (bacteria) {
    return {
      name: bacteria.name,
      delay: bacteria.delayDisplay,
      delayHours: bacteria.delayHours,
      color: bacteria.color
    };
  }
  
  // Fallback pour les noms non trouvés
  return {
    name: name,
    delay: '24h',
    delayHours: 24,
    color: 'bg-gray-100 border-gray-300 text-gray-800'
  };
};

// Mapping des délais en heures pour les différents types de bactéries
export const getBacteriaDelayHours = (bacteriaName: string): number => {
  const { getBacteriaByName } = useBacteriaSettingsStore.getState();
  const bacteria = getBacteriaByName(bacteriaName);
  return bacteria?.delayHours || 24;
}; 