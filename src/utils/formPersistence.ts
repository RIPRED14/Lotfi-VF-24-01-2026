// Utilitaire pour gérer la persistance des données de formulaire
export interface FormData {
  formId: string;
  reportTitle?: string;
  brand?: string;
  site?: string;
  sampleDate?: string;
  reference?: string;
  bacterie?: string;
  jour?: string;
  delai?: string;
  samples?: any[];
  selectedBacteria?: string[];
  waterPeptone?: string;
  petriDishes?: string;
  geloseLots?: Record<string, string>;
  lastModified: string;
}

const STORAGE_KEY_PREFIX = 'lotfiv2-form-';
const STORAGE_EXPIRY_HOURS = 24; // Expiration après 24h

// Fonction pour sauvegarder les données du formulaire
export const saveFormData = (formId: string, data: Partial<FormData>): void => {
  try {
    const formData: FormData = {
      formId,
      ...data,
      lastModified: new Date().toISOString()
    };

    const storageKey = `${STORAGE_KEY_PREFIX}${formId}`;
    localStorage.setItem(storageKey, JSON.stringify(formData));
    
    console.log('💾 Données du formulaire sauvegardées:', formId);
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde du formulaire:', error);
  }
};

// Fonction pour charger les données du formulaire
export const loadFormData = (formId: string): FormData | null => {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${formId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      return null;
    }

    const formData: FormData = JSON.parse(stored);
    
    // Vérifier l'expiration
    const lastModified = new Date(formData.lastModified);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > STORAGE_EXPIRY_HOURS) {
      console.log('🗑️ Données expirées, suppression:', formId);
      deleteFormData(formId);
      return null;
    }

    console.log('📂 Données du formulaire chargées:', formId);
    return formData;
  } catch (error) {
    console.warn('Erreur lors du chargement du formulaire:', error);
    return null;
  }
};

// Fonction pour supprimer les données du formulaire
export const deleteFormData = (formId: string): void => {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${formId}`;
    localStorage.removeItem(storageKey);
    console.log('🗑️ Données du formulaire supprimées:', formId);
  } catch (error) {
    console.warn('Erreur lors de la suppression du formulaire:', error);
  }
};

// Fonction pour nettoyer les données expirées
export const cleanExpiredFormData = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const formData: FormData = JSON.parse(stored);
            const lastModified = new Date(formData.lastModified);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff > STORAGE_EXPIRY_HOURS) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // Si on ne peut pas parser, supprimer la clé
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log(`🧹 ${keysToRemove.length} formulaire(s) expiré(s) supprimé(s)`);
    }
  } catch (error) {
    console.warn('Erreur lors du nettoyage des formulaires expirés:', error);
  }
};

// Fonction pour lister tous les formulaires sauvegardés
export const listSavedForms = (): FormData[] => {
  const forms: FormData[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const formData: FormData = JSON.parse(stored);
            forms.push(formData);
          }
        } catch (error) {
          console.warn('Erreur lors du parsing du formulaire:', key, error);
        }
      }
    }
    
    // Trier par date de modification (plus récent en premier)
    forms.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  } catch (error) {
    console.warn('Erreur lors de la liste des formulaires:', error);
  }
  
  return forms;
};

// Hook pour la persistance automatique
export const useFormPersistence = (formId: string) => {
  const saveData = (data: Partial<FormData>) => {
    if (formId) {
      saveFormData(formId, data);
    }
  };

  const loadData = (): FormData | null => {
    if (formId) {
      return loadFormData(formId);
    }
    return null;
  };

  const clearData = () => {
    if (formId) {
      deleteFormData(formId);
    }
  };

  return {
    saveData,
    loadData,
    clearData
  };
}; 