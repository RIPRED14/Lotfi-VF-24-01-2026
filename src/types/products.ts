// Types pour la gestion des produits - Workflow simplifié
import { z } from 'zod';

// Schéma de validation avec Zod - Workflow: Site → Type → PH → Bactéries → Seuils
export const ProductSchema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1, 'Le nom du produit est obligatoire'),
  type_produit: z.enum(['lait', 'yaourt', 'fromage', 'dessert', 'autre']),
  
  description: z.string().optional(),
  
  // PH simplifié (seuil unique)
  ph_seuil: z.string()
    .min(1, 'Le seuil PH est obligatoire')
    .max(20, 'Le seuil PH ne peut pas dépasser 20 caractères')
    .regex(/^[<>≤≥=0-9.\s]+$/, 'Format de seuil PH invalide (ex: < 7, > 6.5)'),
  
  actif: z.boolean().default(true),
  site_id: z.string().optional(),
  thresholds: z.array(z.any()).optional()
});

export type ProductData = z.infer<typeof ProductSchema>;

// Schéma pour les bactéries sélectionnées
export const BacterieSelectionSchema = z.object({
  bacterie_id: z.string().uuid('ID de bactérie invalide'),
  nom: z.string().min(1, 'Nom de bactérie obligatoire'),
  seuil: z.string()
    .min(1, 'Le seuil est obligatoire')
    .max(50, 'Le seuil ne peut pas dépasser 50 caractères')
    .regex(/^[<>≤≥=0-9.\s]+$/, 'Format de seuil invalide (ex: < 10, > 5)'),
  actif: z.boolean().default(true)
});

export type BacterieSelection = z.infer<typeof BacterieSelectionSchema>;

// Types pour les sites
export interface Site {
  id: string;
  nom: string;
  adresse?: string;
  responsable?: string;
  created_at: string;
  updated_at: string;
}

// Types pour les bactéries disponibles
export interface BacterieType {
  id: string;
  nom: string;
  nom_technique?: string;
  description?: string;
  unite: string;
  actif: boolean;
  created_at: string;
}

// Types pour les bactéries d'un produit
export interface ProduitBacterie {
  id: string;
  produit_id: string;
  bacterie_id: string;
  seuil: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
  bacterie?: BacterieType;
}

// Types pour les produits avec relations
export interface Product extends ProductData {
  id: string;
  site_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  site?: Site;
  bacteries?: ProduitBacterie[];
}

// Types pour l'audit
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: string;
  change_reason?: string;
  change_category?: string;
  impact_level?: string;
}

// Types pour les erreurs de validation
export interface ValidationErrors {
  [key: string]: string;
}

// Types pour les réponses API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
