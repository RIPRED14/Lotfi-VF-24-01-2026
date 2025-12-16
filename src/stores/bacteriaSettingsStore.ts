import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BacteriaSettings {
  id: string;
  name: string;
  delayHours: number;
  delayDisplay: string;
  color: string;
  enabled: boolean;
  description?: string;
}

interface BacteriaSettingsState {
  bacteria: BacteriaSettings[];
  updateBacteriaDelay: (id: string, delayHours: number) => void;
  updateBacteriaSettings: (id: string, settings: Partial<BacteriaSettings>) => void;
  getBacteriaByName: (name: string) => BacteriaSettings | undefined;
  getBacteriaById: (id: string) => BacteriaSettings | undefined;
  resetToDefaults: () => void;
}

// Configuration par défaut des bactéries
const defaultBacteria: BacteriaSettings[] = [
  {
    id: 'entero',
    name: 'Entérobactéries',
    delayHours: 24,
    delayDisplay: '24h',
    color: 'bg-red-100 border-red-300 text-red-800',
    enabled: true,
    description: 'Famille de bactéries Gram-négatives'
  },
  {
    id: 'ecoli',
    name: 'Escherichia coli',
    delayHours: 24,
    delayDisplay: '24h',
    color: 'bg-red-200 border-red-400 text-red-900',
    enabled: true,
    description: 'Bactérie indicatrice de contamination fécale'
  },
  {
    id: 'coliformes',
    name: 'Coliformes totaux',
    delayHours: 24,
    delayDisplay: '24h',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    enabled: true,
    description: 'Indicateurs de contamination générale'
  },
  {
    id: 'staphylocoques',
    name: 'Staphylocoques',
    delayHours: 24,
    delayDisplay: '24h',
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    enabled: true,
    description: 'Bactéries à Gram positif'
  },
  {
    id: 'listeria',
    name: 'Listeria',
    delayHours: 48,
    delayDisplay: '48h',
    color: 'bg-purple-100 border-purple-300 text-purple-800',
    enabled: true,
    description: 'Pathogène dangereux pour les femmes enceintes'
  },
  {
    id: 'levures3j',
    name: 'Levures/Moisissures (3j)',
    delayHours: 72,
    delayDisplay: '3j',
    color: 'bg-green-100 border-green-300 text-green-800',
    enabled: true,
    description: 'Lecture rapide des levures et moisissures'
  },
  {
    id: 'flores',
    name: 'Flore totales',
    delayHours: 72,
    delayDisplay: '72h',
    color: 'bg-orange-100 border-orange-300 text-orange-800',
    enabled: true,
    description: 'Flore microbienne globale'
  },
  {
    id: 'leuconostoc',
    name: 'Leuconostoc',
    delayHours: 96,
    delayDisplay: '4j',
    color: 'bg-pink-100 border-pink-300 text-pink-800',
    enabled: true,
    description: 'Bactéries lactiques spécifiques'
  },
  {
    id: 'levures5j',
    name: 'Levures/Moisissures (5j)',
    delayHours: 120,
    delayDisplay: '5j',
    color: 'bg-green-200 border-green-400 text-green-900',
    enabled: true,
    description: 'Lecture complète des levures et moisissures'
  }
];

const formatDelayDisplay = (hours: number): string => {
  if (hours < 24) {
    return `${hours}h`;
  } else if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days}j`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}j${remainingHours}h`;
  }
};

export const useBacteriaSettingsStore = create<BacteriaSettingsState>()(
  persist(
    (set, get) => ({
      bacteria: defaultBacteria,
      
      updateBacteriaDelay: (id: string, delayHours: number) => {
        set((state) => ({
          bacteria: state.bacteria.map((bacteria) =>
            bacteria.id === id
              ? {
                  ...bacteria,
                  delayHours,
                  delayDisplay: formatDelayDisplay(delayHours)
                }
              : bacteria
          )
        }));
      },
      
      updateBacteriaSettings: (id: string, settings: Partial<BacteriaSettings>) => {
        set((state) => ({
          bacteria: state.bacteria.map((bacteria) =>
            bacteria.id === id
              ? {
                  ...bacteria,
                  ...settings,
                  delayDisplay: settings.delayHours 
                    ? formatDelayDisplay(settings.delayHours)
                    : bacteria.delayDisplay
                }
              : bacteria
          )
        }));
      },
      
      getBacteriaByName: (name: string) => {
        return get().bacteria.find((bacteria) => bacteria.name === name);
      },
      
      getBacteriaById: (id: string) => {
        return get().bacteria.find((bacteria) => bacteria.id === id);
      },
      
      resetToDefaults: () => {
        set({ bacteria: defaultBacteria });
      }
    }),
    {
      name: 'bacteria-settings-store',
      version: 1
    }
  )
); 