import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye, Clock, Calendar, ArrowLeft, Filter, Search, Download, Building, Tag, Trash2 } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ExcelJS from 'exceljs';

// Fonction pour normaliser une date vers le format AAAA-MM-JJ
const normalizeDate = (dateString: string | null | undefined): string | null => {
  if (!dateString || dateString.trim() === '') return null;
  
  // Nettoyer la chaîne (enlever espaces, tirets parasites à la fin)
  let cleaned = dateString.trim().replace(/[-\/]+$/, '').trim();
  
  // Si déjà au bon format YYYY-MM-DD, vérifier et retourner
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) return cleaned;
  }
  
  // Si format YYYY/MM/DD, convertir en YYYY-MM-DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleaned)) {
    const converted = cleaned.replace(/\//g, '-');
    const date = new Date(converted);
    if (!isNaN(date.getTime())) return converted;
  }
  
  let day: number, month: number, year: number;
  
  // Format JJ/MM/AAAA ou JJ-MM-AAAA (français)
  const frenchFull = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (frenchFull) {
    day = parseInt(frenchFull[1], 10);
    month = parseInt(frenchFull[2], 10);
    year = parseInt(frenchFull[3], 10);
  }
  // Format JJ/MM/AA ou JJ-MM-AA (français court)
  else {
    const frenchShort = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (frenchShort) {
      day = parseInt(frenchShort[1], 10);
      month = parseInt(frenchShort[2], 10);
      year = parseInt(frenchShort[3], 10);
      // Convertir année courte: 00-30 -> 2000-2030, 31-99 -> 1931-1999
      year = year <= 30 ? 2000 + year : 1900 + year;
    }
    // Format AAAA/MM/JJ ou AAAA-MM-JJ (ISO)
    else {
      const isoFormat = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (isoFormat) {
        year = parseInt(isoFormat[1], 10);
        month = parseInt(isoFormat[2], 10);
        day = parseInt(isoFormat[3], 10);
      } else {
        // Dernier recours: essayer Date.parse
        const parsed = Date.parse(cleaned);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        console.warn('Format de date non reconnu:', dateString);
        return null;
      }
    }
  }
  
  // Valider les valeurs
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    console.warn('Date invalide après parsing:', dateString, { day, month, year });
    return null;
  }
  
  // Retourner au format YYYY-MM-DD
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Fonction pour formater une date pour l'affichage (JJ/MM/AAAA)
const formatDateForDisplay = (dateString: string | null | undefined): string => {
  const normalized = normalizeDate(dateString);
  if (!normalized) return 'Non spécifiée';
  
  try {
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return 'Date invalide';
    return format(date, 'dd/MM/yyyy', { locale: fr });
  } catch {
    return 'Erreur date';
  }
};

// Fonction pour formater une date pour Excel (AAAA-MM-JJ)
const formatDateForExcel = (dateString: string | null | undefined): string => {
  const normalized = normalizeDate(dateString);
  return normalized || 'Non spécifiée';
};

interface FormEntry {
  id: string;
  title: string;
  date: string;
  brand: string;
  site: string;
  sample_count: number;
  fabrication?: string;
  analysisType?: string;
}

const FormsHistoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [forms, setForms] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  useEffect(() => {
    loadFormsHistory();
  }, []);

  // Fonction pour formater automatiquement la saisie (ajouter les /)
  const formatDateInput = (value: string): string => {
    // Supprimer tout ce qui n'est pas un chiffre
    const numbers = value.replace(/\D/g, '');
    
    // Limiter à 8 chiffres (JJMMAAAA)
    const limited = numbers.substring(0, 8);
    
    // Ajouter les / automatiquement
    if (limited.length >= 5) {
      return `${limited.substring(0, 2)}/${limited.substring(2, 4)}/${limited.substring(4)}`;
    } else if (limited.length >= 3) {
      return `${limited.substring(0, 2)}/${limited.substring(2)}`;
    } else {
      return limited;
    }
  };

  // Fonction pour convertir le format JJ/MM/AAAA vers AAAA-MM-JJ
  const parseInputDate = (inputDate: string): string | null => {
    if (!inputDate || inputDate.length !== 10) return null;
    
    const parts = inputDate.split('/');
    if (parts.length !== 3) return null;
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Validation basique
    if (year.length !== 4 || parseInt(month) > 12 || parseInt(day) > 31 || parseInt(month) < 1 || parseInt(day) < 1) return null;
    
    return `${year}-${month}-${day}`;
  };

  // Vérifier si le format de date est valide
  const isValidDateFormat = (dateString: string): boolean => {
    if (!dateString.trim()) return true; // Vide = valide (pas de filtre)
    return parseInputDate(dateString) !== null;
  };

  // Filtrer les formulaires par date, site et marque
  const getFilteredForms = () => {
    let filteredForms = forms;

    // Filtre par intervalle de date de création
    const startDate = startDateFilter.trim() ? parseInputDate(startDateFilter) : null;
    const endDate = endDateFilter.trim() ? parseInputDate(endDateFilter) : null;
    
    if (startDate || endDate) {
      filteredForms = filteredForms.filter(form => {
        if (!form.date) return false;
        const formDate = form.date.split('T')[0]; // AAAA-MM-JJ
        
        // Si seulement date début : formulaires >= date début
        if (startDate && !endDate) {
          return formDate >= startDate;
        }
        
        // Si seulement date fin : formulaires <= date fin
        if (!startDate && endDate) {
          return formDate <= endDate;
        }
        
        // Si les deux dates : formulaires entre les deux (intervalle fermé)
        if (startDate && endDate) {
          return formDate >= startDate && formDate <= endDate;
        }
        
        return true;
      });
    }

    // Filtre par site
    if (siteFilter !== 'all') {
      filteredForms = filteredForms.filter(form => form.site === siteFilter);
    }

    // Filtre par marque (dépend du site sélectionné)
    if (brandFilter !== 'all') {
      filteredForms = filteredForms.filter(form => form.brand === brandFilter);
    }

    return filteredForms;
  };

  // Obtenir la liste des sites uniques
  const getUniqueSites = () => {
    const sites = [...new Set(forms.map(form => form.site).filter(site => site))];
    return sites.sort();
  };

  // Obtenir la liste des marques uniques pour un site donné
  const getUniqueBrandsForSite = (site: string) => {
    if (site === 'all') {
      return [...new Set(forms.map(form => form.brand).filter(brand => brand))].sort();
    }
    const brands = [...new Set(
      forms
        .filter(form => form.site === site)
        .map(form => form.brand)
        .filter(brand => brand)
    )];
    return brands.sort();
  };

  // Gérer le changement de site (réinitialiser le filtre marque)
  const handleSiteChange = (site: string) => {
    setSiteFilter(site);
    setBrandFilter('all'); // Réinitialiser le filtre marque
  };

  const loadFormsHistory = async () => {
    try {
      setLoading(true);
      
      // 1. Récupérer tous les formulaires avec des bactéries complétées
      console.log('🔍 Chargement des formulaires pour l\'historique...');
      
      // D'abord récupérer toutes les bactéries
      const { data: bacteriaData, error: bacteriaError } = await supabase
        .from('form_bacteria_selections')
        .select('*');
        
      if (bacteriaError) {
        console.error("Erreur lors du chargement des bactéries:", bacteriaError);
        toast({
          title: "Erreur",
          description: "Impossible de charger les bactéries",
          variant: "destructive",
          duration: 3000
        });
        setLoading(false);
        return;
      }

      // Grouper les bactéries par form_id et identifier les formulaires entièrement complétés
      const bacteriaByFormId = bacteriaData?.reduce((acc, bacteria) => {
        const formId = bacteria.form_id;
        if (!acc[formId]) {
          acc[formId] = [];
        }
        acc[formId].push(bacteria);
        return acc;
      }, {}) || {};

      // Trouver les formulaires où toutes les bactéries sont complétées
      const fullyCompletedFormIds = Object.entries(bacteriaByFormId)
        .filter(([formId, bacteriaList]: [string, any[]]) => 
          bacteriaList.length > 0 && bacteriaList.every(bacteria => bacteria.status === 'completed')
        )
        .map(([formId]) => formId);

      console.log('📋 Formulaires entièrement complétés:', fullyCompletedFormIds.length);

      // 2. Récupérer les échantillons archivés ET les formulaires entièrement complétés
      const { data: archivedData, error: archivedError } = await supabase
        .from('samples')
        .select('*')
        .eq('status', 'archived')
        .order('created_at', { ascending: false });

      const { data: completedFormsData, error: completedError } = fullyCompletedFormIds.length > 0 
        ? await supabase
            .from('samples')
            .select('*')
            .in('form_id', fullyCompletedFormIds)
            .order('created_at', { ascending: false })
        : { data: [], error: null };
        
      if (archivedError || completedError) {
        console.error("Erreur lors du chargement des formulaires:", archivedError || completedError);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'historique des formulaires",
          variant: "destructive",
          duration: 3000
        });
        setLoading(false);
        return;
      }
      
      // Combiner les données archivées et les formulaires complétés
      const allHistoryData = [
        ...(archivedData || []),
        ...(completedFormsData || [])
      ];

      // Supprimer les doublons basés sur l'ID
      const uniqueHistoryData = allHistoryData.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );
      
      console.log("Données d'historique combinées:", uniqueHistoryData.length);
      
      // Regrouper les données par formulaire
      const formMap = new Map<string, FormEntry>();
      
      if (uniqueHistoryData && uniqueHistoryData.length > 0) {
        // Afficher tous les form_id pour déboguer
        console.log("Tous les form_id trouvés:", uniqueHistoryData.map(item => item.form_id));
        
        // Premier passage pour collecter les informations de base
        uniqueHistoryData.forEach(item => {
          if (item.form_id) {
            console.log("Traitement form_id:", item.form_id, "Type:", typeof item.form_id);
            
            if (!formMap.has(item.form_id)) {
              // Créer une nouvelle entrée de formulaire
              formMap.set(item.form_id, {
                id: item.form_id,
                title: item.report_title || `Formulaire du ${format(new Date(item.created_at), 'dd/MM/yyyy', { locale: fr })}`,
                date: item.created_at,
                brand: item.brand || '',
                site: item.site || '',
                sample_count: 1,
                fabrication: item.fabrication || null, // Ajouter la date de fabrication
                analysisType: item.analysis_type || 'Analyse initiale'
              });
            } else {
              // Incrémenter le compteur d'échantillons pour un formulaire existant
              const form = formMap.get(item.form_id);
              if (form) {
                form.sample_count += 1;
                // Si pas de fabrication dans l'entrée existante, essayer d'ajouter celle-ci
                if (!form.fabrication && item.fabrication) {
                  form.fabrication = item.fabrication;
                }
              }
            }
          }
        });
      } else {
        console.log("Aucun échantillon trouvé dans l'historique");
      }
      
      // Convertir la Map en tableau pour l'affichage
      const formsList = Array.from(formMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setForms(formsList);
      
      console.log("✅ Historique des formulaires chargé:", formsList.length);
      
      if (formsList.length === 0) {
        toast({
          title: "Information",
          description: "Aucun formulaire trouvé dans la base de données",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique des formulaires:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement de l'historique",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour créer un échantillon de test avec un form_id
  const createTestSample = async () => {
    try {
      setLoading(true);
      
      // Créer un form_id unique
      const testFormId = `test-form-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Créer un échantillon de test
      const testSample = {
        number: '01',
        product: 'Produit Test',
        ready_time: '12:00',
        fabrication: (() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday.toISOString().split('T')[0];
        })(),
        dlc: new Date().toISOString().split('T')[0],
        smell: 'A',
        texture: 'A',
        taste: 'A',
        aspect: 'A',
        status: 'pending',
        brand: 'Test Brand',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
        notification_sent: false,
        form_id: testFormId, // Ceci est important pour le test
        report_title: `Formulaire test ${new Date().toLocaleTimeString()}`
      };
      
      console.log("Création d'un échantillon de test avec form_id:", testFormId);
      
      // Insérer dans Supabase
      const { data, error } = await supabase
        .from('samples')
        .insert([testSample])
        .select();
        
      if (error) {
        console.error("Erreur lors de la création de l'échantillon de test:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer l'échantillon de test",
          variant: "destructive",
          duration: 3000
        });
      } else {
        console.log("Échantillon de test créé avec succès:", data);
        toast({
          title: "Succès",
          description: "Échantillon de test créé avec ID de formulaire: " + testFormId,
          duration: 5000
        });
        
        // Recharger la liste des formulaires
        await loadFormsHistory();
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'échantillon de test:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewForm = (formId: string) => {
    // Naviguer vers la page de visualisation des résultats avec l'ID du formulaire
    navigate(`/saisie-resultats?formId=${formId}&viewMode=archived&bacteriaName=Toutes&readingDay=Terminé`);
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      setLoading(true);
      console.log('🗑️ Suppression du formulaire:', formId);

      // Étape 1: Supprimer les sélections de bactéries liées au formulaire
      const { error: bacteriaError } = await supabase
        .from('form_bacteria_selections')
        .delete()
        .eq('form_id', formId);

      if (bacteriaError) {
        console.error('Erreur suppression bactéries:', bacteriaError);
        throw bacteriaError;
      }
      console.log('✅ Bactéries supprimées');

      // Étape 2: Supprimer les échantillons du formulaire (form_samples)
      const { error: formSamplesError } = await supabase
        .from('form_samples')
        .delete()
        .eq('report_id', formId);

      if (formSamplesError) {
        console.error('Erreur suppression form_samples:', formSamplesError);
        throw formSamplesError;
      }
      console.log('✅ form_samples supprimés');

      // Étape 3: Supprimer les échantillons liés (samples avec form_id)
      const { error: samplesError } = await supabase
        .from('samples')
        .delete()
        .eq('form_id', formId);

      if (samplesError) {
        console.error('Erreur suppression samples:', samplesError);
        throw samplesError;
      }
      console.log('✅ Samples supprimés');

      // Étape 4: Supprimer le formulaire lui-même (sample_forms)
      // Note: le formId peut être soit report_id soit id
      const { error: formError1 } = await supabase
        .from('sample_forms')
        .delete()
        .eq('report_id', formId);

      const { error: formError2 } = await supabase
        .from('sample_forms')
        .delete()
        .eq('id', formId);

      if (formError1 && formError2) {
        console.error('Erreur suppression sample_forms:', formError1 || formError2);
        throw formError1 || formError2;
      }
      console.log('✅ Formulaire supprimé');

      toast({
        title: "Formulaire supprimé",
        description: "Le formulaire et toutes ses données ont été supprimés avec succès.",
        duration: 4000
      });

      // Recharger la liste des formulaires
      await loadFormsHistory();
    } catch (error) {
      console.error('Erreur lors de la suppression du formulaire:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le formulaire. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setDeleteFormId(null);
    }
  };

  const confirmDeleteForm = (formId: string) => {
    setDeleteFormId(formId);
    setShowDeleteDialog(true);
  };

  const getBrandName = (brand: string): string => {
    switch(brand) {
      case '1': 
      case 'grand_frais': return 'Grand Frais';
      case '2': return "L'Atelier Dessy";
      case '3': return 'BAIKO';
      case 'fromage_pasteurises': return 'Fromage pasteurises (FP)';
      case 'lait': return 'LAIT';
      case 'gyma_0': return 'GYMA 0%';
      case 'aliments_sante': return 'Aliments Sante (AS)';
      case 'creme_dessert_collet': return 'Créme Dessert Collet';
      case 'dessert_vegetal_non_fermente': return 'Dessert végétal non fermenté';
      case 'eaux_de_rincage': return 'Eaux de rincage';
      case 'mains': return 'Mains';
      case 'air_statique': return 'Air Statique';
      case 'materiel': return 'Materiel';
      default: return brand;
    }
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      const workbook = new ExcelJS.Workbook();
      
      // FEUILLE 1: Liste des formulaires
      const summaryWorksheet = workbook.addWorksheet('Liste des Formulaires');
      summaryWorksheet.columns = [
        { header: 'Titre', key: 'title', width: 40 },
        { header: 'Date de création', key: 'date', width: 20 },
        { header: 'Date de fabrication', key: 'fabrication', width: 20 },
        { header: 'Marque', key: 'brand', width: 25 },
        { header: 'Site', key: 'site', width: 20 },
        { header: 'Type d\'analyse', key: 'analysisType', width: 20 },
        { header: 'Nombre d\'échantillons', key: 'sample_count', width: 20 }
      ];

      // Style du header pour la feuille 1
      const summaryHeaderRow = summaryWorksheet.getRow(1);
      summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      summaryHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0091CA' }
      };
      summaryHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Ajouter les données de la liste
      const formsToExport = getFilteredForms();
      formsToExport.forEach(form => {
        const row = summaryWorksheet.addRow({
          title: form.title,
          date: format(new Date(form.date), 'dd/MM/yyyy HH:mm', { locale: fr }),
          fabrication: formatDateForExcel(form.fabrication),
          brand: getBrandName(form.brand),
          site: form.site,
          analysisType: form.analysisType || 'Analyse initiale',
          sample_count: form.sample_count
        });

        // Alternance des couleurs de fond
        if (row.number % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F9FA' }
          };
        }
      });

      // FEUILLE 2: Détails des échantillons
      const detailsWorksheet = workbook.addWorksheet('Détails des Échantillons');
      
      // Configuration dynamique des colonnes (seulement celles avec des données)
      const allSamples: any[] = [];
      for (const form of formsToExport) {
        const { data: samples, error } = await supabase
          .from('samples')
          .select('*')
          .eq('form_id', form.id)
          .order('number', { ascending: true });

        if (samples && samples.length > 0) {
          samples.forEach(sample => {
            allSamples.push({
              form_id: form.id,
              report_title: form.title,
              site: form.site,
              brand: getBrandName(form.brand),
              created_at: format(new Date(form.date), 'dd/MM/yyyy HH:mm', { locale: fr }),
              fabrication: formatDateForExcel(form.fabrication),
              ...sample
            });
          });
        }
      }

      // Déterminer quelles colonnes ont des données
      const availableColumns = [
        { key: 'form_id', header: 'ID Form', width: 15 },
        { key: 'report_title', header: 'Titre Formulaire', width: 35 },
        { key: 'site', header: 'Site', width: 15 },
        { key: 'brand', header: 'Marque', width: 20 },
        { key: 'analysis_type', header: 'Type d\'analyse', width: 20 },
        { key: 'created_at', header: 'Date Création', width: 18 },
        { key: 'fabrication', header: 'Date Fabrication', width: 18 },
        { key: 'number', header: 'N° Échantillon', width: 15 },
        { key: 'product', header: 'Produit', width: 25 },
        { key: 'parfum', header: 'Parfum', width: 20 },
        { key: 'of_value', header: 'OF', width: 10 },
        { key: 'ready_time', header: 'Heure', width: 10 },
        { key: 'dlc', header: 'DLC', width: 12 },
        { key: 'aj_dlc', header: 'AJ/DLC', width: 12 },
        { key: 'smell', header: 'Odeur', width: 10 },
        { key: 'texture', header: 'Texture', width: 10 },
        { key: 'taste', header: 'Goût', width: 10 },
        { key: 'aspect', header: 'Aspect', width: 10 },
        { key: 'ph', header: 'pH', width: 8 },
        { key: 'acidity', header: 'Acidité', width: 10 },
        // Données bactériennes après pH
        { key: 'enterobacteria', header: 'Entérobactéries', width: 15 },
        { key: 'yeast_mold', header: 'Levures/Moisissures', width: 20 },
        { key: 'enterobacteria_count', header: 'Comptage Entérobactéries', width: 20 },
        { key: 'yeast_mold_count', header: 'Comptage Levures/Moisissures', width: 25 },
        { key: 'listeria_count', header: 'Listeria', width: 12 },
        { key: 'coliforms_count', header: 'Coliformes', width: 15 },
        { key: 'staphylococcus_count', header: 'Staphylocoques', width: 18 },
        { key: 'escherichia_coli_count', header: 'E.coli', width: 12 },
        { key: 'total_flora_count', header: 'Flore Totale', width: 15 },
        { key: 'leuconostoc_count', header: 'Leuconostoc', width: 15 },
        { key: 'yeast_mold_3j_count', header: 'Levures/Moisissures 3j', width: 20 },
        { key: 'yeast_mold_5j_count', header: 'Levures/Moisissures 5j', width: 20 },
        { key: 'salmonella_count', header: 'Salmonella', width: 12 },
        { key: 'campylobacter_count', header: 'Campylobacter', width: 15 },
        { key: 'clostridium_count', header: 'Clostridium', width: 15 },
        { key: 'bacillus_count', header: 'Bacillus', width: 12 },
        { key: 'pseudomonas_count', header: 'Pseudomonas', width: 15 },
        { key: 'lactobacillus_count', header: 'Lactobacillus', width: 15 },
        { key: 'streptococcus_count', header: 'Streptococcus', width: 15 },
        { key: 'enterococcus_count', header: 'Enterococcus', width: 15 },
        { key: 'vibrio_count', header: 'Vibrio', width: 12 },
        { key: 'shigella_count', header: 'Shigella', width: 12 },
        // Colonnes finales : Résultat puis Commentaire
        { key: 'resultat', header: 'Résultat', width: 15 },
        { key: 'lab_comment', header: 'Commentaire', width: 30 }
      ];

      // Filtrer les colonnes qui ont au moins une valeur non vide (incluant 0)
      const columnsWithData = availableColumns.filter(col => 
        allSamples.some(sample => {
          const value = sample[col.key];
          return value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined';
        })
      );

      // Configurer les colonnes de la feuille détails
      detailsWorksheet.columns = columnsWithData;

      // Style du header pour la feuille 2
      const detailsHeaderRow = detailsWorksheet.getRow(1);
      detailsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      detailsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0091CA' }
      };
      detailsHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Ajouter les données des échantillons
      allSamples.forEach(sample => {
        const rowData: any = {};
        columnsWithData.forEach(col => {
          let value = sample[col.key];
          
          // Afficher les valeurs 0 correctement (ne pas les remplacer par des chaînes vides)
          if (value === 0) {
            rowData[col.key] = 0;
          } else if (value === null || value === undefined || value === '') {
            rowData[col.key] = '';
          } else {
            rowData[col.key] = value;
          }
        });

        const row = detailsWorksheet.addRow(rowData);

        // Alternance des couleurs de fond
        if (row.number % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F9FA' }
          };
        }
      });

      // Ajouter des bordures aux deux feuilles
      [summaryWorksheet, detailsWorksheet].forEach(ws => {
        ws.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        });
      });

      // Générer le fichier
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `historique-formulaires-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: `${formsToExport.length} formulaires et ${allSamples.length} échantillons exportés vers Excel (2 feuilles)`,
        duration: 4000
      });

    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le fichier Excel",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Historique des formulaires" 
        hideMenuItems={['Lectures en Attente', 'Historique', 'Formulaires', 'Administration']} 
      />
      
      <main className="container mx-auto px-4 py-8">
        <Card className="bg-white rounded-lg shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold">Historique des formulaires</CardTitle>
                <CardDescription>
                  Tous les formulaires d'analyse créés
                  {(startDateFilter.trim() || endDateFilter.trim() || siteFilter !== 'all' || brandFilter !== 'all') && (
                    <span className="ml-2">
                      - {getFilteredForms().length} sur {forms.length} formulaires
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/quality-control')}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retour</span>
                </Button>
                {getFilteredForms().length > 0 && (
                  <Button
                    onClick={exportToExcel}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Excel</span>
                  </Button>
                )}
                {/* ❌ Boutons "Rafraîchir" et "Créer test" supprimés comme demandé */}
              </div>
            </div>
            
            {/* Section de filtrage */}
            <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg border">
              {/* Filtres principaux */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Filtre par intervalle de date de création */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Date Création de :</span>
                  <Input
                    type="text"
                    placeholder="JJ/MM/AAAA"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(formatDateInput(e.target.value))}
                    className={`w-[120px] text-center ${
                      !isValidDateFormat(startDateFilter) ? 'border-red-300 bg-red-50' : ''
                    }`}
                    maxLength={10}
                  />
                  <span className="text-sm font-medium text-gray-700">jusqu'au :</span>
                  <Input
                    type="text"
                    placeholder="JJ/MM/AAAA"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(formatDateInput(e.target.value))}
                    className={`w-[120px] text-center ${
                      !isValidDateFormat(endDateFilter) ? 'border-red-300 bg-red-50' : ''
                    }`}
                    maxLength={10}
                  />
                </div>

                {/* Filtre par site */}
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Site:</span>
                  <Select value={siteFilter} onValueChange={handleSiteChange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Tous les sites" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les sites</SelectItem>
                      {getUniqueSites().map(site => (
                        <SelectItem key={site} value={site}>{site}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtre par marque */}
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Marque:</span>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Toutes les marques" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les marques</SelectItem>
                      {getUniqueBrandsForSite(siteFilter).map(brand => (
                        <SelectItem key={brand} value={brand}>{getBrandName(brand)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Message d'aide pour le format de date */}
              {((startDateFilter.trim() && !isValidDateFormat(startDateFilter)) || 
                (endDateFilter.trim() && !isValidDateFormat(endDateFilter))) && (
                <div className="text-xs text-red-600">
                  Format: JJ/MM/AAAA (ex: 15/09/2025)
                </div>
              )}

              {/* Indicateurs de filtrage actif et bouton reset */}
              {(startDateFilter.trim() || endDateFilter.trim() || siteFilter !== 'all' || brandFilter !== 'all') && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">Filtres actifs:</span>
                  
                  {(startDateFilter.trim() || endDateFilter.trim()) && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Date: {startDateFilter && `de ${startDateFilter}`} {endDateFilter && `jusqu'au ${endDateFilter}`}
                    </Badge>
                  )}
                  
                  {siteFilter !== 'all' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Site: {siteFilter}
                    </Badge>
                  )}
                  
                  {brandFilter !== 'all' && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      Marque: {getBrandName(brandFilter)}
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDateFilter('');
                      setEndDateFilter('');
                      setSiteFilter('all');
                      setBrandFilter('all');
                    }}
                    className="text-xs h-6 px-2 ml-auto"
                  >
                    ✕ Effacer tous les filtres
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center p-10 text-muted-foreground">
                <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Clock className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun formulaire trouvé</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Vous n'avez pas encore créé de formulaires d'analyse ou ils ont tous été supprimés.
                </p>
              </div>
            ) : getFilteredForms().length === 0 ? (
              <div className="text-center p-10 text-muted-foreground">
                <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Filter className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun formulaire correspondant aux filtres</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Aucun formulaire ne correspond aux critères de filtrage sélectionnés.
                  {(startDateFilter.trim() || endDateFilter.trim() || siteFilter !== 'all' || brandFilter !== 'all') && (
                    <>
                      <br />
                      <Button
                        variant="link"
                        onClick={() => {
                          setStartDateFilter('');
                          setEndDateFilter('');
                          setSiteFilter('all');
                          setBrandFilter('all');
                        }}
                        className="mt-2 p-0 h-auto text-blue-600"
                      >
                        Réinitialiser tous les filtres
                      </Button>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="w-[300px]">Titre</TableHead>
                      <TableHead>Date de création</TableHead>
                      <TableHead>Date de fabrication</TableHead>
                      <TableHead>Marque</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead className="text-center">Échantillons</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredForms().map((form) => (
                      <TableRow key={form.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{form.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {(() => {
                              try {
                                const date = new Date(form.date);
                                if (isNaN(date.getTime())) {
                                  return <span className="text-red-500">Date invalide</span>;
                                }
                                return (
                                  <>
                                    {format(date, 'dd/MM/yyyy', { locale: fr })}
                                    <Clock className="h-3 w-3 ml-2" />
                                    {format(date, 'HH:mm', { locale: fr })}
                                  </>
                                );
                              } catch (error) {
                                console.error('Erreur formatage date:', form.date, error);
                                return <span className="text-red-500">Erreur date</span>;
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span className={!normalizeDate(form.fabrication) ? 'text-gray-400 text-sm' : ''}>
                              {formatDateForDisplay(form.fabrication)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getBrandName(form.brand)}</TableCell>
                        <TableCell>{form.site}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {form.sample_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleViewForm(form.id)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Voir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => confirmDeleteForm(form.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmation de suppression */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce formulaire ?
                <br /><br />
                <strong className="text-red-600">Cette action est irréversible et supprimera :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Le formulaire lui-même</li>
                  <li>Tous les échantillons associés</li>
                  <li>Toutes les sélections de bactéries</li>
                  <li>Toutes les données de lecture</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteFormId && handleDeleteForm(deleteFormId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default FormsHistoryPage; 