import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Fonction pour générer une clé localStorage spécifique au formulaire
const getStorageKey = (formId?: string) => {
  return formId ? `lotfiv2-bacteria-selection-${formId}` : 'lotfiv2-bacteria-selection-default';
};

// Fonction pour lire le localStorage spécifique au formulaire
const getStoredSelection = (formId?: string): string[] => {
  try {
    const storageKey = getStorageKey(formId);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.warn('Erreur lecture localStorage bacteria selection:', error);
  }
  return [];
};

// Fonction pour sauvegarder dans le localStorage spécifique au formulaire
const saveToStorage = (selection: string[], formId?: string) => {
  try {
    const storageKey = getStorageKey(formId);
    localStorage.setItem(storageKey, JSON.stringify(selection));
    console.log(`💾 Bacteria selection sauvegardée pour ${formId || 'default'}:`, selection);
  } catch (error) {
    console.warn('Erreur sauvegarde localStorage bacteria selection:', error);
  }
};

// Mapping des IDs vers les noms complets et délais
const bacteriaMapping: Record<string, { name: string; delay: string; delayHours: number }> = {
  'entero': { name: 'Entérobactéries', delay: '24h', delayHours: 24 },
  'ecoli': { name: 'Escherichia coli', delay: '24h', delayHours: 24 },
  'coliformes': { name: 'Coliformes totaux', delay: '24h', delayHours: 24 },
  'staphylocoques': { name: 'Staphylocoques', delay: '24h', delayHours: 24 },
  'listeria': { name: 'Listeria', delay: '48h', delayHours: 48 },
  'levures3j': { name: 'Levures/Moisissures (3j)', delay: '3j', delayHours: 72 },
  'flores': { name: 'Flore totales', delay: '72h', delayHours: 72 },
  'leuconostoc': { name: 'Leuconostoc', delay: '4j', delayHours: 96 },
  'levures5j': { name: 'Levures/Moisissures (5j)', delay: '5j', delayHours: 120 }
};

// Fonction pour calculer le jour de lecture
const calculateReadingDay = (delayHours: number): string => {
  const now = new Date();
  const readingDate = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return dayNames[readingDate.getDay()];
};

// Fonction pour charger les bactéries depuis la base de données
const loadBacteriaFromDB = async (formId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('form_bacteria_selections')
      .select('bacteria_name')
      .eq('form_id', formId);

    if (error) {
      console.error('❌ Erreur chargement bactéries depuis DB:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convertir les noms complets en IDs
    const bacteriaIds = data.map(item => {
      const entry = Object.entries(bacteriaMapping).find(
        ([_, info]) => info.name === item.bacteria_name
      );
      return entry ? entry[0] : null;
    }).filter(Boolean) as string[];

    console.log(`✅ Bactéries chargées depuis DB pour ${formId}:`, bacteriaIds);
    return bacteriaIds;
  } catch (error) {
    console.error('❌ Exception lors du chargement des bactéries:', error);
    return [];
  }
};

// Fonction pour sauvegarder les bactéries dans la base de données
const saveBacteriaToDBDirect = async (formId: string, selectedBacteriaIds: string[]): Promise<boolean> => {
  try {
    console.log('💾 Sauvegarde immédiate dans DB pour', formId, ':', selectedBacteriaIds);
    
    // 1. Supprimer les anciennes sélections pour ce formulaire
    const { error: deleteError } = await supabase
      .from('form_bacteria_selections')
      .delete()
      .eq('form_id', formId);

    if (deleteError) {
      console.error('❌ Erreur suppression anciennes bactéries:', deleteError);
      return false;
    }

    // 2. Si aucune bactérie sélectionnée, on s'arrête ici
    if (selectedBacteriaIds.length === 0) {
      console.log('ℹ️ Aucune bactérie à sauvegarder');
      return true;
    }

    // 3. Préparer les données à insérer
    const bacteriaToInsert = selectedBacteriaIds.map(bacteriaId => {
      const bacteriaInfo = bacteriaMapping[bacteriaId];
      if (!bacteriaInfo) {
        console.warn(`⚠️ Bactérie inconnue: ${bacteriaId}`);
        return null;
      }

      const readingDay = calculateReadingDay(bacteriaInfo.delayHours);

      return {
        form_id: formId,
        bacteria_name: bacteriaInfo.name,
        bacteria_delay: bacteriaInfo.delay,
        reading_day: readingDay,
        status: 'pending'
      };
    }).filter(Boolean);

    // 4. Insérer les nouvelles sélections
    if (bacteriaToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('form_bacteria_selections')
        .insert(bacteriaToInsert);

      if (insertError) {
        console.error('❌ Erreur insertion bactéries:', insertError);
        return false;
      }

      console.log('✅ Bactéries sauvegardées dans DB avec succès');
      return true;
    }

    return true;
  } catch (error) {
    console.error('❌ Exception lors de la sauvegarde des bactéries:', error);
    return false;
  }
};

export function useBacteriaSelection(formId?: string) {
  const [selectedBacteria, setSelectedBacteria] = useState<string[]>([]);
  
  // Références pour éviter les boucles infinies
  const isLoadingFromDB = useRef(false);
  const lastSyncedData = useRef<string[]>([]);
  const isInitialized = useRef(false);
  const currentFormId = useRef(formId);

  // Mettre à jour le formId de référence si il change
  useEffect(() => {
    if (formId !== currentFormId.current) {
      currentFormId.current = formId;
      isInitialized.current = false; // Réinitialiser pour recharger les données
    }
  }, [formId]);

  // Charger depuis la base de données au démarrage (UNE SEULE FOIS par formId)
  useEffect(() => {
    if (!isInitialized.current && formId) {
      console.log(`📂 Chargement bacteria selection depuis DB pour ${formId}...`);
      isLoadingFromDB.current = true;
      
      loadBacteriaFromDB(formId).then(bacteriaIds => {
        if (bacteriaIds.length > 0) {
          console.log(`✅ Bactéries chargées depuis DB pour ${formId}:`, bacteriaIds);
          setSelectedBacteria(bacteriaIds);
          lastSyncedData.current = [...bacteriaIds];
        } else {
          console.log(`📂 Aucune bactérie trouvée dans DB pour ${formId}, utilisation sélection vide`);
          setSelectedBacteria([]);
          lastSyncedData.current = [];
        }
        isLoadingFromDB.current = false;
        isInitialized.current = true;
      }).catch(error => {
        console.error('❌ Erreur lors du chargement depuis DB:', error);
        isLoadingFromDB.current = false;
        isInitialized.current = true;
        setSelectedBacteria([]);
        lastSyncedData.current = [];
      });
    }
  }, [formId]);

  // Sauvegarder dans la base de données quand la sélection change (SAUF si chargement depuis DB)
  useEffect(() => {
    // ⚠️ PROTECTION : Ne JAMAIS sauvegarder si le formId est invalide
    if (!formId || formId.trim() === '' || formId === 'undefined' || formId === 'null') {
      console.warn('⚠️ formId invalide, sauvegarde annulée:', formId);
      return;
    }
    
    // ⚠️ PROTECTION : Ne JAMAIS sauvegarder si le formId ne commence pas par "form-"
    if (!formId.startsWith('form-')) {
      console.error('🚨 formId suspect détecté (ne commence pas par "form-"):', formId);
      console.error('🚨 Sauvegarde bloquée pour éviter les doublons !');
      return;
    }
    
    if (isInitialized.current && !isLoadingFromDB.current && formId) {
      // Vérifier si les données ont vraiment changé
      const currentDataStr = JSON.stringify([...selectedBacteria].sort());
      const lastSyncedStr = JSON.stringify([...lastSyncedData.current].sort());
      
      if (currentDataStr !== lastSyncedStr) {
        console.log(`💾 Changement détecté, sauvegarde dans DB pour ${formId}`);
        
        // Sauvegarder dans la base de données
        saveBacteriaToDBDirect(formId, selectedBacteria).then(success => {
          if (success) {
            lastSyncedData.current = [...selectedBacteria];
            // Aussi sauvegarder dans localStorage comme backup
            saveToStorage(selectedBacteria, formId);
            // Notification de confirmation
            toast.success('Bactéries sauvegardées dans la base de données', {
              duration: 2000,
              position: 'bottom-right'
            });
          } else {
            console.error('❌ Échec de la sauvegarde dans DB');
            toast.error('Erreur lors de la sauvegarde des bactéries', {
              duration: 3000
            });
          }
        });
      }
    }
  }, [selectedBacteria, formId]);

  const toggleBacteria = (id: string) => {
    if (isLoadingFromDB.current) return; // Éviter les modifications pendant le chargement DB
    
    setSelectedBacteria(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(b => b !== id)
        : [...prev, id];
      console.log(`🦠 Toggle bacteria pour ${formId || 'default'}:`, id, 'New selection:', newSelection);
      return newSelection;
    });
  };

  const addBacteria = (id: string) => {
    if (isLoadingFromDB.current) return;
    
    setSelectedBacteria(prev => {
      if (!prev.includes(id)) {
        const newSelection = [...prev, id];
        console.log(`🦠 Add bacteria pour ${formId || 'default'}:`, id, 'New selection:', newSelection);
        return newSelection;
      }
      return prev;
    });
  };

  const removeBacteria = (id: string) => {
    if (isLoadingFromDB.current) return;
    
    setSelectedBacteria(prev => {
      const newSelection = prev.filter(b => b !== id);
      console.log(`🦠 Remove bacteria pour ${formId || 'default'}:`, id, 'New selection:', newSelection);
      return newSelection;
    });
  };

  const resetToDefaults = () => {
    isLoadingFromDB.current = false;
    setSelectedBacteria([]);
    if (formId) {
      localStorage.removeItem(getStorageKey(formId));
    }
    lastSyncedData.current = [];
    console.log(`🦠 Reset bacteria selection pour ${formId || 'default'}`);
  };

  // Fonction pour définir une sélection complète
  const setBacteriaSelection = (bacteria: string[]) => {
    if (isLoadingFromDB.current) return;
    
    setSelectedBacteria(bacteria);
    console.log(`🦠 Set bacteria selection pour ${formId || 'default'}:`, bacteria);
  };

  // Fonction pour synchroniser avec la base de données (version améliorée)
  const syncBacteriaSelection = (bacteriaFromDB: string[]) => {
    console.log(`🔄 Synchronisation avec la base pour ${formId || 'default'}:`, bacteriaFromDB);
    
    // Vérifier si les données ont vraiment changé
    const currentDataStr = JSON.stringify([...selectedBacteria].sort());
    const newDataStr = JSON.stringify([...bacteriaFromDB].sort());
    
    if (currentDataStr === newDataStr) {
      console.log('✅ Données identiques, pas de synchronisation nécessaire');
      return;
    }
    
    // Marquer qu'on charge depuis la DB pour éviter la sauvegarde automatique
    isLoadingFromDB.current = true;
    
    // Mettre à jour l'état
    setSelectedBacteria(bacteriaFromDB);
    lastSyncedData.current = [...bacteriaFromDB];
    
    // Sauvegarder dans DB et localStorage après un délai et démarquer le chargement
    setTimeout(() => {
      if (formId) {
        saveToStorage(bacteriaFromDB, formId);
        saveBacteriaToDBDirect(formId, bacteriaFromDB).then(() => {
          isLoadingFromDB.current = false;
          console.log(`✅ Synchronisation terminée et sauvegardée pour ${formId || 'default'}`);
        });
      } else {
        isLoadingFromDB.current = false;
      }
    }, 200); // Augmenter le délai pour éviter les conflits
  };

  // Fonction pour vérifier si les données sont synchronisées
  const isDataSynced = () => {
    const currentDataStr = JSON.stringify([...selectedBacteria].sort());
    const lastSyncedStr = JSON.stringify([...lastSyncedData.current].sort());
    return currentDataStr === lastSyncedStr;
  };

  return {
    selectedBacteria,
    toggleBacteria,
    addBacteria,
    removeBacteria,
    resetToDefaults,
    setBacteriaSelection,
    syncBacteriaSelection,
    isDataSynced,
    isLoadingFromDB: isLoadingFromDB.current
  };
} 