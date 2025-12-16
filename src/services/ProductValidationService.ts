// Service de validation des produits
import { ProductSchema, ProductData, ValidationErrors } from '../types/products';

export class ProductValidationService {
  static validateProduct(data: any): { isValid: boolean; errors: ValidationErrors } {
    const errors: ValidationErrors = {};
    
    // Validation simplifiée - seulement les champs essentiels
    if (!data.nom || data.nom.trim() === '') {
      errors.nom = 'Le nom du produit est obligatoire';
    }
    
    if (!data.site_id || data.site_id.trim() === '') {
      errors.site_id = 'Le site est obligatoire';
    }
    
    // Validation du format PH seulement si renseigné (optionnel)
    if (data.ph_seuil && data.ph_seuil.trim() !== '') {
      const phPattern = /^[<>≤≥=0-9.\s-]+$/;
      if (!phPattern.test(data.ph_seuil)) {
        errors.ph_seuil = 'Format invalide (ex: <= 7, < 5, 4.5-6.8)';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  static validateField(field: string, value: any, allData: any = {}): string | null {
    try {
      const fieldSchema = ProductSchema.shape[field];
      fieldSchema.parse(value);
      
      // Validation croisée si nécessaire
      if (field === 'ph_maximum' && allData.ph_minimum) {
        if (value <= allData.ph_minimum) {
          return 'PH maximum doit être supérieur au PH minimum';
        }
      }
      
      if (field === 'ph_optimal' && allData.ph_minimum && allData.ph_maximum) {
        if (value < allData.ph_minimum || value > allData.ph_maximum) {
          return 'PH optimal doit être entre PH minimum et maximum';
        }
      }
      
      if (field === 'seuil_coliformes' && allData.seuil_enterobacteries) {
        if (value > allData.seuil_enterobacteries) {
          return 'Les coliformes ne peuvent pas dépasser les entérobactéries';
        }
      }
      
      if (field === 'seuil_ecoli' && allData.seuil_coliformes) {
        if (value > allData.seuil_coliformes) {
          return 'E.coli ne peut pas dépasser les coliformes';
        }
      }
      
      return null;
    } catch (error) {
      return error.errors[0]?.message || 'Valeur invalide';
    }
  }
  
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
  
  static sanitizeProductName(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>'";&()]/g, '')      // Supprimer caractères dangereux
      .replace(/\s+/g, ' ')            // Normaliser les espaces
      .substring(0, 100);              // Limiter la longueur
  }
}
