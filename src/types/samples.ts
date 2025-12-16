export interface Sample {
  id: string;
  number: string;
  product: string;
  readyTime?: string;
  fabrication?: string;
  dlc?: string;
  ajDlc?: string;
  smell?: 'N' | 'C' | 'NA' | 'A' | 'B' | 'D' | string;
  texture?: 'N' | 'C' | 'NA' | 'A' | 'B' | 'D' | string;
  taste?: 'N' | 'C' | 'NA' | 'A' | 'B' | 'D' | string;
  aspect?: 'N' | 'C' | 'NA' | 'A' | 'B' | 'D' | string;
  ph?: string;
  of_value?: string;
  acidity?: string;
  parfum?: string;
  enterobacteria?: string;
  yeastMold?: string;
  // Nouveaux champs pour les résultats microbiologiques
  enterobacteria_count?: number;
  yeast_mold_count?: number;
  listeria_count?: number;
  coliforms_count?: number;
  staphylococcus_count?: number;
  reading_comments?: string;
  reading_technician?: string;
  reading_date?: string;
  // Champ pour les résultats de lecture (nouvelle colonne à ajouter)
  resultat?: string | null;
  createdAt?: string;
  modifiedAt?: string;
  modifiedBy?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'draft' | 'analyses_en_cours' | 'waiting_reading' | 'cancelled';
  // Propriétés pour le formulaire
  program?: string;
  label?: string;
  nature?: string;
  labComment?: string;
  additionalDetails?: string;
  temperature?: string;
  analysisDate?: string;
  storageTemp?: string;
  breakDate?: string;
  assignedTo?: string;
  reportTitle?: string;
  brand?: string;
  site?: string; // Site (R1, R2 ou BAIKO)
  // Ajout de champs pour les lectures microbiologiques
  entero_reading_due?: string;
  yeast_reading_due?: string;
  // Propriété pour le mode hors ligne
  isLocalOnly?: boolean;
  formId?: string; // Identifiant du formulaire parent
  analysisType?: 'Analyse initiale' | 'Contre-analyse' | string; // Type d'analyse
}

export interface SupabaseSample {
  id: string;
  number: string;
  product: string;
  ready_time: string;
  fabrication: string;
  dlc: string;
  aj_dlc: string;
  smell: string;
  texture: string;
  taste: string;
  aspect: string;
  ph: string | null;
  of_value: string | null;
  acidity: string | null;
  parfum: string | null;
  enterobacteria: string | null;
  yeast_mold: string | null;
  created_at: string;
  modified_at: string;
  modified_by: string | null;
  status: string;
  entero_reading_due: string | null;
  yeast_reading_due: string | null;
  assigned_to: string | null;
  report_title: string | null;
  brand: string | null;
  site: string | null;
  form_id: string | null;
  notification_sent: boolean | null;
  enterobacteria_count: number | null;
  yeast_mold_count: number | null;
  listeria_count: number | null;
  coliforms_count: number | null;
  staphylococcus_count: number | null;
  reading_comments: string | null;
  reading_technician: string | null;
  reading_date: string | null;
  lab_comment: string | null;
  // Champ pour les résultats de lecture (nouvelle colonne à ajouter)
  resultat: string | null;
  analysis_type?: string | null; // Type d'analyse (Analyse initiale ou Contre-analyse)
}

export interface BatchNumbers {
  id: string;
  reportId: string;
  waterPeptone?: string;
  petriDishes?: string;
  VRBGGel?: string;
  YGCGel?: string;
  createdAt: string;
}

// Nouvelle interface pour les formulaires
export interface SampleForm {
  id: string;
  title: string;
  date: string;
  brand?: string;
  site?: string;
  sampleCount?: number;
}
