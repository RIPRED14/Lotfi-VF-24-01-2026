import { useMemo } from 'react';

// Mapping des bactéries vers leurs géloses correspondantes
export const GELOSE_MAPPING: Record<string, string> = {
  entero: "VRBG",
  levures3j: "SYMPHONY",
  levures5j: "YGC",
  coliformes: "VRBL",
  flores: "PCA",
  staphylocoques: "EASY STAPH",
  ecoli: "TBX",
  leuconostoc: "MAYEUX, SANDINE et ELLIKER"
};

// Mapping des bactéries vers leurs normes ISO (optionnel)
export const ISO_MAPPING: Record<string, string> = {
  entero: "ISO 21528-2",
  levures3j: "ISO 21527-1",
  levures5j: "ISO 21527-1",
  coliformes: "ISO 4832",
  flores: "ISO 4833-1",
  staphylocoques: "ISO 6888-1",
  ecoli: "ISO 16649-2",
  leuconostoc: "Méthode interne"
};

/**
 * Hook personnalisé pour gérer l'auto-remplissage des géloses
 * @param selectedBacteria Tableau des IDs de bactéries sélectionnées
 * @returns Objet contenant la liste des géloses formatée et un indicateur si des géloses sont présentes
 */
export default function useGelosesAutoFill(selectedBacteria: string[]) {
  // Calcul des géloses correspondantes aux bactéries sélectionnées
  const geloses = useMemo(() => {
    if (!selectedBacteria || selectedBacteria.length === 0) {
      return '';
    }
    
    // Récupérer toutes les géloses uniques correspondant aux bactéries sélectionnées
    const uniqueGeloses = new Set<string>();
    selectedBacteria.forEach(bacteriaId => {
      if (GELOSE_MAPPING[bacteriaId]) {
        uniqueGeloses.add(GELOSE_MAPPING[bacteriaId]);
      }
    });
    
    // Convertir le Set en tableau et joindre avec des virgules
    return Array.from(uniqueGeloses).join(', ');
  }, [selectedBacteria]);

  // Indicateur pour savoir si des géloses sont présentes
  const hasGeloses = geloses.length > 0;

  // Récupération des normes ISO pour les bactéries sélectionnées
  const isoNorms = useMemo(() => {
    if (!selectedBacteria || selectedBacteria.length === 0) {
      return '';
    }
    
    const uniqueNorms = new Set<string>();
    selectedBacteria.forEach(bacteriaId => {
      if (ISO_MAPPING[bacteriaId]) {
        uniqueNorms.add(ISO_MAPPING[bacteriaId]);
      }
    });
    
    return Array.from(uniqueNorms).join(', ');
  }, [selectedBacteria]);

  return {
    geloses,
    hasGeloses,
    isoNorms
  };
} 