import { useMemo } from 'react';
import { addHours, addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useBacteriaSettingsStore } from '@/stores/bacteriaSettingsStore';

export interface BacteriaReadingSchedule {
  bacteriaId: string;
  bacteriaName: string;
  seedingDate: Date;
  readingDate: Date;
  readingDay: string;
  delayDisplay: string;
  delayHours: number;
  isReady: boolean;
  timeUntilReady?: string;
}

export const useBacteriaDateCalculation = () => {
  const { bacteria, getBacteriaById, getBacteriaByName } = useBacteriaSettingsStore();

  // Calculer la date de lecture pour une bactérie donnée
  const calculateReadingDate = (bacteriaId: string, seedingDate: Date): Date => {
    const bacterium = getBacteriaById(bacteriaId);
    if (!bacterium) return seedingDate;
    
    return addHours(seedingDate, bacterium.delayHours);
  };

  // Calculer le planning de lecture pour plusieurs bactéries
  const calculateReadingSchedule = (selectedBacteriaIds: string[], seedingDate: Date = new Date()): BacteriaReadingSchedule[] => {
    const now = new Date();
    
    return selectedBacteriaIds.map(bacteriaId => {
      const bacterium = getBacteriaById(bacteriaId);
      if (!bacterium) {
        return {
          bacteriaId,
          bacteriaName: 'Inconnue',
          seedingDate,
          readingDate: seedingDate,
          readingDay: format(seedingDate, 'EEEE', { locale: fr }),
          delayDisplay: '24h',
          delayHours: 24,
          isReady: false
        };
      }

      const readingDate = addHours(seedingDate, bacterium.delayHours);
      const isReady = now >= readingDate;
      
      let timeUntilReady;
      if (!isReady) {
        const timeDiff = readingDate.getTime() - now.getTime();
        const hoursLeft = Math.ceil(timeDiff / (1000 * 60 * 60));
        
        if (hoursLeft < 24) {
          timeUntilReady = `${hoursLeft}h restantes`;
        } else {
          const daysLeft = Math.ceil(hoursLeft / 24);
          timeUntilReady = `${daysLeft}j restants`;
        }
      }

      return {
        bacteriaId,
        bacteriaName: bacterium.name,
        seedingDate,
        readingDate,
        readingDay: format(readingDate, 'EEEE', { locale: fr }),
        delayDisplay: bacterium.delayDisplay,
        delayHours: bacterium.delayHours,
        isReady,
        timeUntilReady
      };
    });
  };

  // Grouper les bactéries par jour de lecture
  const groupByReadingDay = (schedules: BacteriaReadingSchedule[]) => {
    return schedules.reduce((groups, schedule) => {
      const day = schedule.readingDay;
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(schedule);
      return groups;
    }, {} as Record<string, BacteriaReadingSchedule[]>);
  };

  // Vérifier si une bactérie est prête pour la lecture
  const isBacteriaReady = (bacteriaId: string, seedingDate: Date): boolean => {
    const bacterium = getBacteriaById(bacteriaId);
    if (!bacterium) return false;
    
    const readingDate = addHours(seedingDate, bacterium.delayHours);
    return new Date() >= readingDate;
  };

  // Obtenir les bactéries prêtes pour une date donnée
  const getReadyBacteria = (selectedBacteriaIds: string[], seedingDate: Date): string[] => {
    return selectedBacteriaIds.filter(id => isBacteriaReady(id, seedingDate));
  };

  // Obtenir les informations d'une bactérie pour les délais de lecture
  const getBacteriaDelay = (bacteriaName: string) => {
    const bacterium = getBacteriaByName(bacteriaName);
    if (bacterium) {
      return {
        hours: bacterium.delayHours,
        display: bacterium.delayDisplay,
        name: bacterium.name
      };
    }
    
    // Fallback
    return {
      hours: 24,
      display: '24h',
      name: bacteriaName
    };
  };

  return {
    calculateReadingDate,
    calculateReadingSchedule,
    groupByReadingDay,
    isBacteriaReady,
    getReadyBacteria,
    getBacteriaDelay,
    availableBacteria: bacteria.filter(b => b.enabled)
  };
}; 