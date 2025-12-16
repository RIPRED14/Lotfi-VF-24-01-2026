// Service de validation des produits avec Zod - Workflow simplifié
import { ProductData, BacterieSelection, ValidationErrors } from '../types/products';
import { ProductSchema, BacterieSelectionSchema } from '../types/products';

export class ProductValidationServiceNew {
  /**
   * Valide un produit complet
   */
  static validateProduct(data: Partial<ProductData>): { isValid: boolean; errors: ValidationErrors } {
    try {
      ProductSchema.parse(data);
      return { isValid: true, errors: {} };
    } catch (error: any) {
      const errors: ValidationErrors = {};
      
      if (error.errors) {
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
      }
      
      return { isValid: false, errors };
    }
  }
  
  /**
   * Valide un champ spécifique
   */
  static validateField(field: keyof ProductData, value: any, context: Partial<ProductData>): string | null {
    try {
      const fieldSchema = ProductSchema.shape[field];
      fieldSchema.parse(value);
      
      // Validation spécifique pour le PH
      if (field === 'ph_seuil') {
        if (typeof value === 'string' && value.trim()) {
          const phPattern = /^[<>≤≥=0-9.\s\-]+$/;
          if (!phPattern.test(value)) {
            return 'Format de seuil PH invalide (ex: < 7, > 6.5)';
          }
        }
      }
      
      return null;
    } catch (error: any) {
      return error.message || 'Valeur invalide';
    }
  }
  
  /**
   * Valide les bactéries sélectionnées
   */
  static validateBacteries(bacteries: BacterieSelection[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (bacteries.length === 0) {
      errors.push('Au moins une bactérie doit être sélectionnée');
    }
    
    bacteries.forEach((bacterie, index) => {
      try {
        BacterieSelectionSchema.parse(bacterie);
        
        // Validation du seuil
        if (!bacterie.seuil || bacterie.seuil.trim() === '') {
          errors.push(`Seuil manquant pour ${bacterie.nom}`);
        } else {
          const seuilPattern = /^[<>≤≥=0-9.\s\-]+$/;
          if (!seuilPattern.test(bacterie.seuil)) {
            errors.push(`Format de seuil invalide pour ${bacterie.nom} (ex: < 10, > 5)`);
          }
        }
      } catch (error: any) {
        errors.push(`Erreur de validation pour ${bacterie.nom}: ${error.message}`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Valide les contraintes métier
   */
  static validateBusinessRules(data: ProductData, bacteries: BacterieSelection[]): string[] {
    const warnings: string[] = [];
    
    // Vérifier la cohérence des seuils PH
    if (data.ph_seuil) {
      const phValue = parseFloat(data.ph_seuil.replace(/[<>≤≥=]/g, ''));
      if (phValue < 0 || phValue > 14) {
        warnings.push('Valeur PH en dehors de la plage normale (0-14)');
      }
    }
    
    // Vérifier la cohérence des seuils microbiologiques
    bacteries.forEach(bacterie => {
      const seuilValue = parseFloat(bacterie.seuil.replace(/[<>≤≥=]/g, ''));
      if (seuilValue < 0) {
        warnings.push(`Seuil négatif pour ${bacterie.nom}`);
      }
      if (seuilValue > 1000000) {
        warnings.push(`Seuil très élevé pour ${bacterie.nom} (${seuilValue})`);
      }
    });
    
    return warnings;
  }
  
  /**
   * Nettoie et formate les données
   */
  static sanitizeData(data: Partial<ProductData>): Partial<ProductData> {
    return {
      ...data,
      nom: data.nom?.trim(),
      description: data.description?.trim(),
      ph_seuil: data.ph_seuil?.trim()
    };
  }
  
  /**
   * Nettoie et formate les bactéries
   */
  static sanitizeBacteries(bacteries: BacterieSelection[]): BacterieSelection[] {
    return bacteries.map(bacterie => ({
      ...bacterie,
      nom: bacterie.nom.trim(),
      seuil: bacterie.seuil.trim()
    }));
  }
  
  /**
   * Nettoie les entrées utilisateur
   */
  static sanitizeInput(input: string, maxLength: number = 100): string {
    if (!input) return '';
    
    return input
      .trim()                           // Supprimer espaces en début/fin
      .replace(/[<>]/g, '')             // Supprimer caractères HTML
      .replace(/['"]/g, '')             // Supprimer guillemets
      .replace(/[&]/g, '&amp;')         // Échapper les &
      .replace(/[;]/g, '')              // Supprimer les points-virgules
      .substring(0, maxLength);         // Limiter la longueur
  }
  
  /**
   * Nettoie le nom du produit
   */
  static sanitizeProductName(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>'";&()]/g, '')      // Supprimer caractères dangereux
      .replace(/\s+/g, ' ')            // Normaliser les espaces
      .substring(0, 100);              // Limiter la longueur
  }
}
