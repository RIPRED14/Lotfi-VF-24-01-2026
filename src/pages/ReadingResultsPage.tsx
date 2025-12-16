import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Save, Calculator, AlertTriangle, CheckCircle, ArrowLeft, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ExcelJS from 'exceljs';

interface Sample {
  id: string;
  form_id: string;
  number: string;
  product: string;
  site: string;
  brand: string;
  status: string;
  created_at: string;
  modified_at: string;
  modified_by: string;
  assigned_to: string;
  report_title?: string; // Titre du formulaire choisi par l'utilisateur
  // Champs verts (déjà remplis dans Analyses en cours)
  ready_time?: string;
  fabrication?: string;
  dlc?: string;
  aj_dlc?: string; // Nouveau champ AJ/DLC
  ajDlc?: string; // Alias pour compatibilité
  smell?: string;
  texture?: string;
  taste?: string;
  aspect?: string;
  ph?: string;
  of_value?: string;
  acidity?: string;
  parfum?: string;
  enterobacteria?: string;
  yeast_mold?: string;
  // Champs de lecture microbiologique (à remplir)
  enterobacteria_count?: number | null;
  yeast_mold_count?: number | null;
  listeria_count?: number | null;
  coliforms_count?: number | null;
  staphylococcus_count?: number | null;
  
  // Nouvelles colonnes dédiées
  escherichia_coli_count?: number | null;
  total_flora_count?: number | null;
  leuconostoc_count?: number | null;
  yeast_mold_3j_count?: number | null;
  yeast_mold_5j_count?: number | null;
  salmonella_count?: number | null;
  campylobacter_count?: number | null;
  clostridium_count?: number | null;
  bacillus_count?: number | null;
  pseudomonas_count?: number | null;
  lactobacillus_count?: number | null;
  streptococcus_count?: number | null;
  enterococcus_count?: number | null;
  vibrio_count?: number | null;
  shigella_count?: number | null;
  // Commentaires et observations
  lab_comment?: string | null; // Commentaire de la phase "analyses en cours"
  reading_comments?: string | null;
  reading_technician?: string | null;
  reading_date?: string | null;
  // Champ Résultat (nouvelle colonne à ajouter en base)
  resultat?: string | null;
  analysis_type?: string | null; // Ajouté pour corriger l'erreur TS
}

// Interface pour les bactéries sélectionnées
interface SelectedBacteria {
  id: string;
  form_id: string;
  bacteria_name: string;
  bacteria_delay: string;
  reading_day: string;
  status: string;
  created_at: string;
  modified_at: string;
  reading_date?: string;
}

// Interface pour les seuils produits
interface ProductThreshold {
  id: string;
  site: string;
  product_brand: string;
  parameter_type: string;
  min_value: number | null;
  max_value: number | null;
  comparison_operator: string;
  is_active: boolean;
}

// Interface pour les nouvelles tables Air Statique
interface AirStaticLocation {
  id: string;
  site: string;
  lieu: string;
  zone: string;
  volume_prelevement: number;
  limite_max: number;
  comparison_operator: string;
  is_active: boolean;
}

const ReadingResultsPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Récupérer les paramètres d'URL
  const formId = searchParams.get('formId');
  const bacteriaId = searchParams.get('bacteriaId');
  const bacteriaName = searchParams.get('bacteriaName');
  const delay = searchParams.get('delay');
  const readingDay = searchParams.get('readingDay');
  const viewMode = searchParams.get('viewMode'); // 'archived' pour les formulaires terminés, 'true' pour consultation
  
  const isArchivedView = viewMode === 'archived';
  const isViewOnlyMode = viewMode === 'true'; // Mode consultation des résultats complétés
  
  console.log('📋 Paramètres URL reçus:', {
    formId,
    bacteriaId,
    bacteriaName,
    delay,
    readingDay,
    viewMode,
    isArchivedView
  });
  
  console.log('🔍 Mode de visualisation:', isArchivedView ? 'ARCHIVÉ' : 'EN COURS');
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedBacteria, setSelectedBacteria] = useState<SelectedBacteria[]>([]);
  const [productThresholds, setProductThresholds] = useState<ProductThreshold[]>([]);
  const [airStaticLocations, setAirStaticLocations] = useState<AirStaticLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // États pour les résultats de lecture
  const [readingResults, setReadingResults] = useState<Record<string, any>>({});
  const [sampleComments, setSampleComments] = useState<Record<string, string>>({});
  // Nouvel état pour gérer les résultats de chaque échantillon
  const [sampleResults, setSampleResults] = useState<Record<string, string>>({});
  // État pour suivre si les commentaires ont été modifiés
  const [commentsModified, setCommentsModified] = useState<boolean>(false);
  // État pour gérer le mode édition des commentaires
  const [editingComments, setEditingComments] = useState<boolean>(false);
  // État pour la table UFC Count
  const [ufcCountTable, setUfcCountTable] = useState<any[]>([]);

  // Mapping complet des noms de bactéries vers les champs de base de données
  const bacteriaFieldMapping: Record<string, string> = {
    // Bactéries principales (colonnes existantes)
    'Entérobactéries': 'enterobacteria_count',
    'Levures/Moisissures': 'yeast_mold_count',
    'Listeria': 'listeria_count',
    'Coliformes totaux': 'coliforms_count',
    'Staphylocoques': 'staphylococcus_count',
    
    // NOUVELLES COLONNES DÉDIÉES - MAPPING FINAL
    'Escherichia coli': 'escherichia_coli_count', // ✅ COLONNE DÉDIÉE
    'Flore totales': 'total_flora_count', // ✅ COLONNE DÉDIÉE
    'Leuconostoc': 'leuconostoc_count', // ✅ COLONNE DÉDIÉE
    
    // Variants de levures/moisissures avec colonnes dédiées
    'Levures/Moisissures (3j)': 'yeast_mold_3j_count', // ✅ COLONNE DÉDIÉE
    'Levures/Moisissures (5j)': 'yeast_mold_5j_count', // ✅ COLONNE DÉDIÉE
    
    // Bactéries pathogènes avec colonnes dédiées
    'Salmonella': 'salmonella_count', // ✅ COLONNE DÉDIÉE
    'Campylobacter': 'campylobacter_count', // ✅ COLONNE DÉDIÉE
    'Clostridium': 'clostridium_count', // ✅ COLONNE DÉDIÉE
    'Bacillus': 'bacillus_count', // ✅ COLONNE DÉDIÉE
    'Pseudomonas': 'pseudomonas_count', // ✅ COLONNE DÉDIÉE
    'Lactobacillus': 'lactobacillus_count', // ✅ COLONNE DÉDIÉE
    'Streptococcus': 'streptococcus_count', // ✅ COLONNE DÉDIÉE
    'Enterococcus': 'enterococcus_count', // ✅ COLONNE DÉDIÉE
    'Vibrio': 'vibrio_count', // ✅ COLONNE DÉDIÉE
    'Shigella': 'shigella_count' // ✅ COLONNE DÉDIÉE
  };

  // Charger les échantillons et les bactéries sélectionnées
  const loadData = async () => {
    if (!formId) {
      toast({
        title: "Erreur",
        description: "Aucun formulaire spécifié",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 DÉBUT loadData - Mode archivé:', isArchivedView, 'FormID:', formId);
      
      // 1. Charger les échantillons selon le mode (en attente ou archivés)
      const targetStatus = isArchivedView ? 'archived' : 'waiting_reading';
      
      console.log('🔍 [loadData] Recherche échantillons avec:', {
        formId,
        targetStatus,
        isArchivedView
      });
      
      const { data: samplesData, error: samplesError } = await supabase
        .from('samples')
        .select('*, report_title')
        .eq('form_id', formId)
        .eq('status', targetStatus)
        .order('created_at', { ascending: true });

      if (samplesError) throw samplesError;

      console.log('📋 Données échantillons récupérées:', samplesData);
      console.log('📊 Nombre d\'échantillons trouvés:', samplesData?.length || 0);
      
      // ✅ Si aucun échantillon trouvé avec waiting_reading, essayer avec in_progress
      if (!samplesData || samplesData.length === 0) {
        console.warn('⚠️ Aucun échantillon avec status "waiting_reading", essai avec "in_progress"...');
        
        const { data: inProgressSamples, error: inProgressError } = await supabase
          .from('samples')
          .select('*, report_title')
          .eq('form_id', formId)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: true });
        
        if (!inProgressError && inProgressSamples && inProgressSamples.length > 0) {
          console.log('✅ Échantillons trouvés avec status "in_progress":', inProgressSamples.length);
          setSamples(inProgressSamples);
        } else {
          console.error('❌ Aucun échantillon trouvé avec "in_progress" non plus');
          setSamples([]);
        }
      } else {
        setSamples(samplesData || []);
      }

      // Initialiser les résultats existants pour le mode archivé
      if (isArchivedView && samplesData) {
        const existingResults: Record<string, string> = {};
        samplesData.forEach(sample => {
          const sampleWithResult = sample as Sample;
          if (sampleWithResult.resultat) {
            existingResults[sample.id] = sampleWithResult.resultat;
          }
        });
        setSampleResults(existingResults);
      }

      // 2. Charger les bactéries sélectionnées pour ce formulaire
      let bacteriaData = null;
      
      if (isArchivedView) {
        // Pour les formulaires archivés, récupérer les bactéries ORIGINALES qui avaient été sélectionnées
        console.log('📋 Récupération des bactéries originales pour le formulaire archivé...');
        
        const { data: originalBacteriaData, error: originalBacteriaError } = await supabase
          .from('form_bacteria_selections')
          .select('*')
          .eq('form_id', formId)
          .eq('status', 'completed')
          .order('created_at', { ascending: true });
          
        if (originalBacteriaError) {
          console.error('Erreur lors de la récupération des bactéries originales:', originalBacteriaError);
          // Fallback: essayer toutes les bactéries du formulaire
          const { data: fallbackBacteriaData, error: fallbackError } = await supabase
            .from('form_bacteria_selections')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: true });
            
          if (!fallbackError) {
            bacteriaData = fallbackBacteriaData;
            console.log('📋 Bactéries récupérées via fallback:', bacteriaData?.length || 0);
          }
        } else {
          bacteriaData = originalBacteriaData;
          console.log('📋 Bactéries originales récupérées:', bacteriaData?.length || 0);
        }
        
        console.log('🦠 Bactéries trouvées pour le formulaire archivé:', bacteriaData?.map(b => b.bacteria_name) || []);
        console.log('🔍 Nombre total de bactéries pour affichage:', bacteriaData?.length || 0);
      } else {
        // Pour les formulaires en cours, charger soit la bactérie spécifique, soit toutes les bactéries du formulaire
        if (bacteriaId) {
          // Si un bacteriaId est fourni dans l'URL, charger seulement cette bactérie
          const { data: specificBacteriaData, error: specificBacteriaError } = await supabase
            .from('form_bacteria_selections')
            .select('*')
            .eq('id', bacteriaId)
            .eq('form_id', formId);
          
          if (specificBacteriaError) throw specificBacteriaError;
          bacteriaData = specificBacteriaData;
          console.log('🎯 Bactérie spécifique chargée:', bacteriaData?.[0]?.bacteria_name);
        } else {
          // Sinon, charger toutes les bactéries du formulaire
          const { data: bacteriaSelectionsData, error: bacteriaError } = await supabase
            .from('form_bacteria_selections')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: true });
            
          if (bacteriaError) throw bacteriaError;
          bacteriaData = bacteriaSelectionsData;
          console.log('📋 Toutes les bactéries du formulaire chargées');
        }
       }

      console.log('🦠 Bactéries sélectionnées récupérées:', bacteriaData);
      console.log('📊 Nombre de bactéries à affecter au state:', bacteriaData?.length || 0);
      setSelectedBacteria(bacteriaData || []);
      
      // 3. Charger les seuils de validation des produits
      console.log('⚖️ Chargement des seuils de validation...');
      
      // Essayer de charger depuis Supabase
      try {
        console.log('🔄 Tentative de chargement des seuils depuis Supabase...');
        
        // Test: essayer de charger les seuils depuis la table product_thresholds
        const { data: thresholdsData, error: thresholdsError } = await (supabase as any)
          .from('product_thresholds')
          .select('*')
          .eq('is_active', true)
          .order('site', { ascending: true });

        if (thresholdsError) {
          console.log('⚠️ Erreur lors du chargement des seuils Supabase:', thresholdsError.message);
          console.log('💡 Utilisation des seuils codés en dur comme fallback');
          setProductThresholds([]);
        } else {
          console.log('✅ Seuils chargés depuis Supabase:', thresholdsData?.length || 0);
          console.log('📊 Seuils trouvés:', thresholdsData);
          setProductThresholds(thresholdsData || []);
        }

        // 4. Charger les nouvelles données Air Statique
        console.log('🌪️ Chargement des lieux Air Statique...');
        try {
          const { data: airStaticData, error: airStaticError } = await (supabase as any)
            .from('air_static_locations')
            .select('*')
            .eq('is_active', true)
            .order('lieu', { ascending: true });

          if (airStaticError) {
            console.log('⚠️ Erreur lors du chargement des lieux Air Statique:', airStaticError.message);
            setAirStaticLocations([]);
          } else {
            console.log('✅ Lieux Air Statique chargés:', airStaticData?.length || 0);
            console.log('📊 Lieux Air Statique trouvés:', airStaticData);
            setAirStaticLocations((airStaticData as unknown as AirStaticLocation[]) || []);
          }
        } catch (airError) {
          console.log('💡 Table air_static_locations non disponible');
          console.log('❌ Erreur:', airError);
          setAirStaticLocations([]);
        }

        // 5. Charger la table UFC Count
        console.log('🧮 Chargement de la table UFC Count...');
        try {
          const { data: ufcData, error: ufcError } = await (supabase as any)
            .from('ufc_count_levures_moisissures')
            .select('*')
            .order('levures_comptees', { ascending: true });

          if (ufcError) {
            console.error('❌ Erreur chargement table UFC:', ufcError);
            setUfcCountTable([]);
          } else {
            console.log('✅ Table UFC Count chargée:', ufcData?.length || 0);
            setUfcCountTable(ufcData || []);
          }
        } catch (ufcError) {
          console.log('💡 Table ufc_count_levures_moisissures non disponible');
          console.log('❌ Erreur:', ufcError);
          setUfcCountTable([]);
        }
        
      } catch (error) {
        console.log('💡 Table product_thresholds non disponible, utilisation des seuils codés en dur');
        console.log('❌ Erreur:', error);
        setProductThresholds([]);
        setAirStaticLocations([]);
      }
      
      // 5. Initialiser les résultats avec les valeurs existantes
      const initialResults: Record<string, any> = {};
      samplesData?.forEach(sample => {
        initialResults[sample.id] = {};
        console.log(`🔍 Échantillon ${sample.id} - Données complètes:`, sample);
        
        // Initialiser seulement les champs des bactéries sélectionnées
        bacteriaData?.forEach(bacteria => {
          const fieldName = bacteriaFieldMapping[bacteria.bacteria_name] || 'enterobacteria_count';
          const existingValue = (sample as any)[fieldName];
          
          console.log(`🦠 Bactérie: ${bacteria.bacteria_name}`);
          console.log(`📊 Champ DB: ${fieldName}`);
          console.log(`💾 Valeur existante: ${existingValue}`);
          
          initialResults[sample.id][bacteria.bacteria_name] = existingValue || '';
        });
      });
      
      console.log('🎯 Résultats initialisés:', initialResults);
      setReadingResults(initialResults);
      
      // 6. Charger les commentaires existants individuellement pour chaque échantillon
      if (samplesData && samplesData.length > 0) {
        const initialComments: Record<string, string> = {};
        
        samplesData.forEach(sample => {
          const existingLabComment = (sample as any).lab_comment;
          const existingReadingComment = (sample as any).reading_comments;
          
          // Prioriser lab_comment (commentaire de la phase analyses en cours)
          const commentToDisplay = existingLabComment || existingReadingComment || '';
          
          initialComments[sample.id] = commentToDisplay;
        });
        
        console.log('💬 Chargement des commentaires individuels:', initialComments);
        setSampleComments(initialComments);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      
      // FIX ELECTRON : Forcer le focus sur le premier input après chargement
      setTimeout(() => {
        const firstInput = document.querySelector('input[type="number"]:not([disabled]):not([readonly]), input[type="text"]:not([disabled]):not([readonly])');
        if (firstInput) {
          (firstInput as HTMLElement).focus();
          console.log('🎯 Focus forcé sur le premier champ de saisie');
        }
      }, 300);
    }
  };

  useEffect(() => {
    loadData();
  }, [formId]);

  // Ancienne fonction supprimée - remplacée par la nouvelle avec calcul UFC

  // Nouvelle fonction pour mettre à jour le résultat d'un échantillon
  const updateSampleResult = (sampleId: string, value: string) => {
    setSampleResults(prev => ({
      ...prev,
      [sampleId]: value
    }));
  };

  // Fonction de calcul UFC automatique pour Air Statique
  const calculateUfcFromCount = (levuresComptees: number, volumePrelevement: number): number => {
    const ufcRow = ufcCountTable.find(row => row.levures_comptees === levuresComptees);
    
    if (!ufcRow) {
      console.warn(`⚠️ Aucune donnée UFC trouvée pour ${levuresComptees} levures comptées`);
      return levuresComptees; // Retourner la valeur brute si pas de conversion
    }

    // Retourner la valeur UFC selon le volume
    switch (volumePrelevement) {
      case 100:
        return ufcRow.volume_100ml || 0;
      case 250:
        return ufcRow.volume_250ml || 0;
      case 500:
        return ufcRow.volume_500ml || 0;
      default:
        console.warn(`⚠️ Volume de prélèvement non supporté: ${volumePrelevement}mL`);
        return levuresComptees; // Retourner la valeur brute
    }
  };

  // Fonction pour mettre à jour les résultats (saisie en cours)
  const updateReadingResultInput = (sampleId: string, bacteriaName: string, inputValue: string) => {
    // Mise à jour immédiate sans calcul (pour permettre la saisie complète)
    setReadingResults(prev => ({
      ...prev,
      [sampleId]: {
        ...prev[sampleId],
        [bacteriaName]: inputValue
      }
    }));
  };

  // Fonction pour calculer et finaliser les résultats (onBlur)
  const finalizeReadingResult = (sampleId: string, bacteriaName: string, inputValue: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    let finalValue = inputValue;

    // Si c'est Air Statique et Levures/Moisissures, calculer automatiquement
    if (sample.brand === 'Air Statique' && bacteriaName === 'Levures/Moisissures (5j)') {
      const levuresComptees = parseInt(inputValue) || 0;
      const location = airStaticLocations.find(loc => loc.lieu === sample.product);
      
      if (location && ufcCountTable.length > 0 && levuresComptees > 0) {
        const ufcCalcule = calculateUfcFromCount(levuresComptees, location.volume_prelevement);
        finalValue = ufcCalcule.toString();
        
        console.log(`🧮 CALCUL UFC AUTOMATIQUE (onBlur):`, {
          lieu: sample.product,
          levuresComptees,
          volume: location.volume_prelevement,
          ufcCalcule,
          seuil: location.limite_max
        });
      }
    }

    // Mettre à jour avec la valeur finale (calculée ou brute)
    setReadingResults(prev => ({
      ...prev,
      [sampleId]: {
        ...prev[sampleId],
        [bacteriaName]: finalValue
      }
    }));
  };

  // Fonction pour sauvegarder seulement les commentaires (mode consultation)
  const handleSaveCommentsOnly = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour sauvegarder",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const currentDate = new Date().toISOString();
      let updatedCount = 0;

      // Mettre à jour seulement les commentaires pour chaque échantillon
      for (const sample of samples) {
        const newComment = sampleComments[sample.id] || '';
        
        const { error } = await supabase
          .from('samples')
          .update({
            reading_comments: newComment,
            modified_at: currentDate,
            modified_by: user.name
          })
          .eq('id', sample.id);

        if (error) {
          console.error(`Erreur lors de la mise à jour du commentaire pour l'échantillon ${sample.id}:`, error);
          throw error;
        }
        updatedCount++;
      }

      toast({
        title: "Commentaires sauvegardés",
        description: `${updatedCount} commentaire(s) mis à jour avec succès`,
        duration: 3000
      });

      setCommentsModified(false);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde des commentaires:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les commentaires",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Sauvegarder les résultats de lecture
  const handleSaveResults = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Utilisateur non connecté",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Valider qu'au moins un résultat a été saisi
      const hasResults = Object.values(readingResults).some(result => 
        Object.values(result).some(value => value && value.toString().trim() !== '')
      );
      
      if (!hasResults) {
        toast({
          title: "Aucun résultat",
          description: "Veuillez saisir au moins un résultat de lecture",
          variant: "destructive"
        });
        return;
      }

      // Vérifier et envoyer les alertes AVANT la sauvegarde pour les non-conformités détectées
      checkAndSendAlerts();

      const currentDate = new Date().toISOString();
      let updatedCount = 0;
      let totalFieldsRequired = 0;
      let totalFieldsFilled = 0;

      // Compter les champs remplis pour les bactéries actuellement sélectionnées
      for (const sample of samples) {
        const sampleResults = readingResults[sample.id];
        if (!sampleResults) continue;

        for (const bacteria of selectedBacteria) {
          totalFieldsRequired++;
          const value = sampleResults[bacteria.bacteria_name];
          if (value && value.toString().trim() !== '') {
            totalFieldsFilled++;
          }
        }
      }

      console.log(`📊 Vérification complétude: ${totalFieldsFilled}/${totalFieldsRequired} champs remplis`);

      // Mettre à jour le statut des bactéries qui ont effectivement été remplies
      const completedBacteriaNames = [];
      for (const bacteria of selectedBacteria) {
        // Vérifier si des données ont été saisies pour cette bactérie
        let hasData = false;
        for (const sample of samples) {
          const sampleResults = readingResults[sample.id];
          if (sampleResults && sampleResults[bacteria.bacteria_name]) {
            const value = sampleResults[bacteria.bacteria_name];
            if (value && value.toString().trim() !== '') {
              hasData = true;
              break;
            }
          }
        }

        // Marquer comme completed seulement si des données ont été saisies
        if (hasData) {
          const { error: bacteriaError } = await supabase
            .from('form_bacteria_selections')
            .update({
              status: 'completed',
              modified_at: currentDate
            })
            .eq('id', bacteria.id);

          if (bacteriaError) {
            console.error('Erreur mise à jour bactérie:', bacteriaError);
          } else {
            console.log(`✅ Bactérie ${bacteria.bacteria_name} marquée comme complétée`);
            completedBacteriaNames.push(bacteria.bacteria_name);
          }
        } else {
          console.log(`⏭️ Bactérie ${bacteria.bacteria_name} ignorée (aucune donnée saisie)`);
        }
      }

      // MAINTENANT vérifier si TOUTES les bactéries du formulaire sont complétées (après mise à jour)
      let allFormBacteriaCompleted = true;

      // Récupérer TOUTES les bactéries du formulaire (après mise à jour des statuts)
      const { data: allFormBacteria, error: allBacteriaError } = await supabase
        .from('form_bacteria_selections')
        .select('*')
        .eq('form_id', formId);

      if (allBacteriaError) {
        console.error('Erreur récupération bactéries du formulaire:', allBacteriaError);
        allFormBacteriaCompleted = false;
      } else {
        console.log(`🦠 Toutes les bactéries du formulaire ${formId}:`, allFormBacteria?.map(b => `${b.bacteria_name} (${b.status})`));
        
        // Vérifier si toutes les bactéries du formulaire sont "completed"
        if (allFormBacteria && allFormBacteria.length > 0) {
          allFormBacteriaCompleted = allFormBacteria.every(bacteria => bacteria.status === 'completed');
        }
      }

      console.log(`🎯 Toutes les bactéries du formulaire complétées: ${allFormBacteriaCompleted}`);

      // Déterminer le statut final : archiver seulement si TOUTES les bactéries du formulaire sont complétées
      const finalStatus = allFormBacteriaCompleted ? 'archived' : 'waiting_reading';
      
      console.log(`📋 Statut final du formulaire: ${finalStatus}`);

      // Mettre à jour chaque échantillon avec le bon statut
      for (const sample of samples) {
        const sampleResults = readingResults[sample.id];
        if (!sampleResults) continue;

        // Créer un échantillon mis à jour avec les nouvelles valeurs microbiologiques
        const updatedSample = { ...sample };
        
        // Ajouter les résultats pour chaque bactérie sélectionnée à l'échantillon temporaire
        selectedBacteria.forEach(bacteria => {
          const fieldName = bacteriaFieldMapping[bacteria.bacteria_name] || 'enterobacteria_count';
          const value = readingResults[sample.id]?.[bacteria.bacteria_name];
          (updatedSample as any)[fieldName] = value ? Number(value) : null;
        });

        // CALCULER LE RÉSULTAT avec les données mises à jour
        const calculatedResult = calculateSampleResult(updatedSample);
        
        console.log(`🧪 SAUVEGARDE - Échantillon ${sample.id}:`, {
          brand: sample.brand,
          product: sample.product,
          microbiologicalData: selectedBacteria.map(b => ({
            bacteria: b.bacteria_name,
            field: bacteriaFieldMapping[b.bacteria_name],
            value: readingResults[sample.id]?.[b.bacteria_name]
          })),
          calculatedResult
        });

        const updateData: any = {
          reading_comments: sampleComments[sample.id] || '', // Commentaire individuel par échantillon
          reading_technician: user.name,
          reading_date: currentDate,
          status: finalStatus, // 'archived' si tout est rempli, 'waiting_reading' sinon
          modified_at: currentDate,
          modified_by: user.name,
          // Utiliser le résultat calculé avec les données mises à jour
          resultat: calculatedResult
        };

        // Ajouter les résultats pour chaque bactérie sélectionnée
        selectedBacteria.forEach(bacteria => {
          const fieldName = bacteriaFieldMapping[bacteria.bacteria_name] || 'enterobacteria_count';
          const value = readingResults[sample.id]?.[bacteria.bacteria_name];
          updateData[fieldName] = value ? Number(value) : null;
        });

        const { error } = await supabase
          .from('samples')
          .update(updateData)
          .eq('id', sample.id);

        if (error) throw error;
        updatedCount++;
      }

      // Message de succès adapté
      if (allFormBacteriaCompleted) {
        toast({
          title: "✅ Formulaire terminé et archivé",
          description: `${updatedCount} échantillon(s) mis à jour. Le formulaire est maintenant disponible dans "Mes Formulaires - Historique".`,
          duration: 5000
        });
      } else {
        toast({
          title: "Résultats sauvegardés",
          description: `${updatedCount} échantillon(s) mis à jour. Bactérie(s) complétée(s) : ${completedBacteriaNames.join(', ')}.`,
          duration: 4000
        });
      }

      // Rediriger vers les lectures en attente après un délai
      setTimeout(() => {
        if (allFormBacteriaCompleted) {
          // Si tout est terminé, rediriger vers l'historique des formulaires
          navigate('/forms-history');
        } else {
          // Sinon, rester sur les lectures en attente pour traiter les autres bactéries
          navigate('/lectures-en-attente');
        }
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les résultats",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Obtenir le champ approprié selon le type de bactérie
  const getBacteriaField = (bacteriaType: string) => {
    switch (bacteriaType?.toLowerCase()) {
      case 'entérobactéries':
        return 'enterobacteria_count';
      case 'levures/moisissures':
        return 'yeast_mold_count';
      case 'listeria':
        return 'listeria_count';
      case 'coliformes totaux':
        return 'coliforms_count';
      case 'staphylocoques':
        return 'staphylococcus_count';
      default:
        return 'enterobacteria_count';
    }
  };

  const primaryField = getBacteriaField(bacteriaName || '');

  // Fonction pour déterminer quels champs doivent être barrés selon le produit
  const getDisabledFields = (brand: string, site?: string) => {
    const disabled = {
      smell: false,
      texture: false,
      taste: false,
      aspect: false,
      ph: false,
      acidity: false,
      dlc: false,
      aj_dlc: false
    };

    // Pour le site BAIKO, permettre l'édition des colonnes organoleptiques
    if (site === 'BAIKO') {
      return {
        smell: false,    // Débloqué pour BAIKO
        texture: false,  // Débloqué pour BAIKO
        taste: false,    // Débloqué pour BAIKO
        aspect: false,   // Débloqué pour BAIKO
        ph: false,
        acidity: false,
        dlc: false,
        aj_dlc: false
      };
    }

    switch (brand) {
      case 'Materiel':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: true,
          ph: true,
          acidity: true,
          dlc: true,
          aj_dlc: true
        };
      case 'Eaux de rincage':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: false, // Pas mentionné dans la demande
          ph: false,     // Pas mentionné dans la demande
          acidity: true,
          dlc: true,
          aj_dlc: true
        };
      case 'Mains':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: true,
          ph: true,
          acidity: true,
          dlc: true,
          aj_dlc: true
        };
      case 'Air Statique':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: true,
          ph: true,
          acidity: true,
          dlc: true,
          aj_dlc: true
        };
      default:
        return disabled;
    }
  };

  // Fonction pour valider les seuils pH/Acidité selon le produit pour le site "Laiterie Collet (R1)"
  const validateProductThresholds = (sample: Sample) => {
    const site = sample.site;
    const brand = sample.brand;
    const ph = sample.ph ? parseFloat(sample.ph) : null;
    const acidity = sample.acidity ? parseFloat(sample.acidity) : null;

    // Debug logs pour comprendre le problème
    console.log('🔍 VALIDATION DEBUG:', {
      site,
      brand,
      ph,
      acidity,
      sampleData: sample
    });

    // Validation pour tous les sites (R1, R2, BAIKO)
    if (site !== "R1" && site !== "R2" && site !== "BAIKO") {
      console.log('❌ Site non concerné par la validation:', site);
      return { phStatus: 'normal', acidityStatus: 'normal' };
    }

    let phStatus = 'normal';
    let acidityStatus = 'normal';

    // D'abord essayer avec les seuils de Supabase pour le pH
    if (brand && ph !== null && productThresholds && productThresholds.length > 0) {
      console.log('📊 Tentative validation pH avec seuils Supabase pour:', brand);
      console.log('🔍 DEBUG - productThresholds disponibles:', productThresholds.length);
      console.log('🔍 DEBUG - Seuils pour ce produit:', productThresholds.filter(t => t.product_brand === brand));
      console.log('🔍 DEBUG - Site de l\'échantillon:', site);
      console.log('🔍 DEBUG - pH à valider:', ph);
      
      // Chercher le seuil pH correspondant dans la base de données
      const phThreshold = productThresholds.find(t => 
        (t.site === site || t.site === 'Laiterie Collet (R1)' || t.site === 'R1') && 
        t.product_brand === brand && 
        (t.parameter_type === 'pH' || t.parameter_type === 'PH' || t.parameter_type === 'ph') &&
        t.is_active
      );

      if (phThreshold) {
        console.log(`🎯 Seuil pH Supabase trouvé pour ${brand}:`, phThreshold);
        
        // Appliquer la validation selon l'opérateur
        let isPhValid = true;
        if (phThreshold.comparison_operator === '<=' && phThreshold.max_value !== null) {
          isPhValid = ph <= phThreshold.max_value;
        } else if (phThreshold.comparison_operator === '<' && phThreshold.max_value !== null) {
          isPhValid = ph < phThreshold.max_value;
        } else if (phThreshold.comparison_operator === '>' && phThreshold.min_value !== null) {
          isPhValid = ph > phThreshold.min_value;
        } else if (phThreshold.comparison_operator === '>=' && phThreshold.min_value !== null) {
          isPhValid = ph >= phThreshold.min_value;
        } else if (phThreshold.comparison_operator === '=' && phThreshold.max_value !== null) {
          isPhValid = ph === phThreshold.max_value;
        } else if (phThreshold.comparison_operator === 'between' && phThreshold.min_value !== null && phThreshold.max_value !== null) {
          isPhValid = ph >= phThreshold.min_value && ph <= phThreshold.max_value;
        }
        
        phStatus = isPhValid ? 'normal' : 'invalid';
        console.log(`🧪 Validation pH Supabase pour ${brand}: pH=${ph} | Opérateur=${phThreshold.comparison_operator} | Min=${phThreshold.min_value} | Max=${phThreshold.max_value} | Résultat=${isPhValid ? 'CONFORME' : 'NON-CONFORME'}`);
      } else {
        console.log(`⚠️ Aucun seuil pH Supabase trouvé pour ${brand}, utilisation des seuils codés en dur`);
        console.log('🔍 DEBUG - Recherche effectuée avec:', {
          site: site,
          brand: brand,
          parameter_types: ['pH', 'PH', 'ph']
        });
        
        // Fallback avec seuils pH codés en dur - SYNCHRONISÉS avec Supabase
        console.log('🧪 Validation pH codés en dur pour:', brand, 'pH:', ph);
        
        switch (brand) {
          case "Fromage pasteurises (FP)":
            if (ph <= 4.09 || ph >= 4.81) {
              phStatus = 'invalid';
              console.log('❌ pH INVALIDE pour Fromage FP:', ph, '(doit être entre 4.09 et 4.81)');
            } else {
              console.log('✅ pH VALIDE pour Fromage FP:', ph);
            }
            break;
          case "GYMA 0%":
            if (ph > 4.80) {
              phStatus = 'invalid';
              console.log('❌ pH INVALIDE pour GYMA 0%:', ph, '(doit être ≤ 4.80)');
            } else {
              console.log('✅ pH VALIDE pour GYMA 0%:', ph);
            }
            break;
          case "Grand Frais":
          case "Aliments Sante (AS)":
          case "Créme Dessert Collet":
            if (ph > 7.00) {
              phStatus = 'invalid';
              console.log('❌ pH INVALIDE pour', brand + ':', ph, '(doit être ≤ 7.00)');
            } else {
              console.log('✅ pH VALIDE pour', brand + ':', ph);
            }
            break;
          case "Dessert végétal non fermenté":
            if (ph > 7.20) {
              phStatus = 'invalid';
              console.log('❌ pH INVALIDE pour Dessert végétal:', ph, '(doit être ≤ 7.20)');
            } else {
              console.log('✅ pH VALIDE pour Dessert végétal:', ph);
            }
            break;
          case "LAIT":
            if (ph > 6.80) {
              phStatus = 'invalid';
              console.log('❌ pH INVALIDE pour LAIT:', ph, '(doit être ≤ 6.80)');
            } else {
              console.log('✅ pH VALIDE pour LAIT:', ph);
            }
            break;
          case "Eaux de rincage":
          case "Mains":
          case "Air Statique":
          case "Materiel":
            // Pas de contrôle pH pour les contrôles environnementaux
            console.log('ℹ️ Pas de contrôle pH requis pour:', brand);
            break;
          default:
            console.log('⚠️ Marque non reconnue pour validation pH:', brand);
        }
      }
    } else if (brand && ph !== null) {
      // Pas de seuils Supabase disponibles, utiliser seulement les seuils codés en dur
      console.log('📝 Aucun seuil pH Supabase disponible, utilisation des seuils codés en dur pour:', brand);
      
      switch (brand) {
        case "Fromage pasteurises (FP)":
          if (ph <= 4.09 || ph >= 4.81) {
            phStatus = 'invalid';
            console.log('❌ pH INVALIDE pour Fromage FP:', ph, '(doit être entre 4.09 et 4.81)');
          } else {
            console.log('✅ pH VALIDE pour Fromage FP:', ph);
          }
          break;
        case "GYMA 0%":
          if (ph > 4.80) {
            phStatus = 'invalid';
            console.log('❌ pH INVALIDE pour GYMA 0%:', ph, '(doit être ≤ 4.80)');
          } else {
            console.log('✅ pH VALIDE pour GYMA 0%:', ph);
          }
          break;
        case "Grand Frais":
        case "Aliments Sante (AS)":
        case "Créme Dessert Collet":
          if (ph > 7.00) {
            phStatus = 'invalid';
            console.log('❌ pH INVALIDE pour', brand + ':', ph, '(doit être ≤ 7.00)');
          } else {
            console.log('✅ pH VALIDE pour', brand + ':', ph);
          }
          break;
        case "Dessert végétal non fermenté":
          if (ph > 7.20) {
            phStatus = 'invalid';
            console.log('❌ pH INVALIDE pour Dessert végétal:', ph, '(doit être ≤ 7.20)');
          } else {
            console.log('✅ pH VALIDE pour Dessert végétal:', ph);
          }
          break;
        case "LAIT":
          if (ph > 6.80) {
            phStatus = 'invalid';
            console.log('❌ pH INVALIDE pour LAIT:', ph, '(doit être ≤ 6.80)');
          } else {
            console.log('✅ pH VALIDE pour LAIT:', ph);
          }
          break;
        case "Eaux de rincage":
        case "Mains":
        case "Air Statique":
        case "Materiel":
          // Pas de contrôle pH pour les contrôles environnementaux
          console.log('ℹ️ Pas de contrôle pH requis pour:', brand);
          break;
        default:
          console.log('⚠️ Marque non reconnue pour validation pH:', brand);
      }
    }

    // Validation de l'acidité avec Supabase puis fallback
    if (brand && acidity !== null && productThresholds && productThresholds.length > 0) {
      console.log('📊 Tentative validation Acidité avec seuils Supabase pour:', brand);
      
      // Chercher le seuil acidité correspondant dans la base de données
      const acidityThreshold = productThresholds.find(t => 
        t.site === 'Laiterie Collet (R1)' && 
        t.product_brand === brand && 
        t.parameter_type === 'acidity' &&
        t.is_active
      );

      if (acidityThreshold) {
        console.log(`🎯 Seuil Acidité Supabase trouvé pour ${brand}:`, acidityThreshold);
        
        // Appliquer la validation selon l'opérateur
        let isAcidityValid = true;
        if (acidityThreshold.comparison_operator === '<' && acidityThreshold.max_value !== null) {
          isAcidityValid = acidity < acidityThreshold.max_value;
        } else if (acidityThreshold.comparison_operator === '<=' && acidityThreshold.max_value !== null) {
          isAcidityValid = acidity <= acidityThreshold.max_value;
        }
        
        acidityStatus = isAcidityValid ? 'normal' : 'invalid';
        console.log(`🧪 Validation Acidité Supabase pour ${brand}: Acidité=${acidity} | Opérateur=${acidityThreshold.comparison_operator} | Seuil=${acidityThreshold.max_value} | Résultat=${isAcidityValid ? 'CONFORME' : 'NON-CONFORME'}`);
      } else if (brand === "LAIT") {
        // Fallback pour LAIT seulement - SYNCHRONISÉ avec Supabase (acidity <= 18)
        console.log('📝 Utilisation seuil Acidité codé en dur pour LAIT');
        if (acidity > 18) {
          acidityStatus = 'invalid';
          console.log('❌ ACIDITÉ INVALIDE pour LAIT:', acidity, '(doit être ≤ 18)');
        } else {
          console.log('✅ ACIDITÉ VALIDE pour LAIT:', acidity);
        }
      }
    } else if (brand === "LAIT" && acidity !== null) {
      // Validation de l'acidité pour LAIT avec seuils codés en dur - SYNCHRONISÉ avec Supabase
      console.log('🧪 Validation Acidité codée en dur pour LAIT:', acidity);
      if (acidity > 18) {
        acidityStatus = 'invalid';
        console.log('❌ ACIDITÉ INVALIDE pour LAIT:', acidity, '(doit être ≤ 18)');
      } else {
        console.log('✅ ACIDITÉ VALIDE pour LAIT:', acidity);
      }
    }

    const result = { phStatus, acidityStatus };
    console.log('📊 Résultat validation finale:', result);
    return result;
  };

  // Fonction pour valider les seuils microbiologiques selon le produit pour le site "Laiterie Collet (R1)"
  const validateMicrobiologicalThresholds = (sample: Sample, bacteriaName: string, value: number | null) => {
    const site = sample.site;
    const brand = sample.brand;
    const productType = sample.product; // Type Produit

    // Debug logs
    console.log('🦠 VALIDATION MICROBIOLOGIQUE:', {
      site,
      brand,
      productType,
      bacteriaName,
      value,
      sampleData: sample,
      airStaticLocationsCount: airStaticLocations.length,
      airStaticLocations: airStaticLocations
    });

    // --- LOGIQUE SPÉCIALE AJ/DLC pour Fromage FP ---
    // Si Fromage pasteurises (FP) ou Fromage pasteurise (FP) ET DLC => Seuil Levures/Moisissures (5j) passe à 50 001
    const normalizedBrand = brand ? brand.trim().toLowerCase() : '';
    const isFromageFP = normalizedBrand === 'fromage pasteurises (fp)' || normalizedBrand === 'fromage pasteurise (fp)';
    
    const normalizedBacteria = bacteriaName ? bacteriaName.trim().toLowerCase() : '';
    const isLevuresMoisissures5j = 
      normalizedBacteria === 'levures/moisissures (5j)' || 
      normalizedBacteria === 'levures/moisissures' ||
      normalizedBacteria.includes('levures/moisissures');

    if (isFromageFP && isLevuresMoisissures5j && value !== null) {
      const ajDlcValue = sample.aj_dlc || sample.ajDlc;
      
      // Normalisation pour éviter les erreurs de casse ou d'espaces
      if (ajDlcValue && ajDlcValue.trim().toUpperCase() === 'DLC') {
        console.log('🧀 SPECIAL: Fromage FP en DLC détecté -> Seuil Levures/Moisissures passe à 50 001');
        const limit = 50001;
        const isValid = value < limit;
        console.log(`🧪 Validation SPÉCIALE DLC pour ${brand}: ${value} < ${limit} = ${isValid ? 'CONFORME' : 'NON-CONFORME'}`);
        return isValid ? 'valid' : 'invalid';
      }
    }
    // -----------------------------------------------

    // Validation pour tous les sites (R1, R2, BAIKO) uniquement
    if ((site !== "R1" && site !== "R2" && site !== "BAIKO") || value === null || value === undefined) {
      console.log('❌ Site non concerné ou valeur nulle:', site, value);
      return 'normal';
    }

    // CAS SPÉCIAL : Air Statique - Utilise la table spécialisée air_static_thresholds
    console.log('🔍 Vérification brand:', { 
      brand, 
      brandType: typeof brand,
      brandLength: brand?.length,
      isAirStatic: brand === "Air Statique",
      exactMatch: brand === "Air Statique"
    });
    if (brand === "Air Statique") {
      console.log('🌪️ VALIDATION AIR STATIQUE - Recherche lieu pour:', productType);
      console.log('🌪️ Lieux Air Statique disponibles:', airStaticLocations.map(l => ({ site: l.site, lieu: l.lieu, limite_max: l.limite_max })));
      
      // Chercher dans les nouveaux lieux Air Statique
      console.log('🔍 Recherche lieu Air Statique:', {
        productType,
        siteRecherche: site,
        sitesDisponibles: [...new Set(airStaticLocations.map(l => l.site))],
        lieuxDisponibles: airStaticLocations.map(l => l.lieu)
      });
      
      const airStaticLocation = airStaticLocations.find(location => 
        (location.site === site || location.site === 'Laiterie Collet (R1)' || location.site === 'R1' || location.site === 'R2') &&
        location.lieu === productType &&
        location.is_active
      );
      
      console.log('🔍 Résultat recherche:', { airStaticLocation, found: !!airStaticLocation });

      if (airStaticLocation) {
        console.log('🎯 Lieu Air Statique trouvé:', airStaticLocation);
        
        let isValid;
        if (airStaticLocation.limite_max === 0 && airStaticLocation.comparison_operator === '=') {
          // Cas spécial : absence totale (ex: INTERIEUR CONDITIONNEUSE ATIA)
          isValid = value === 0;
          console.log(`🧪 Validation Air Statique pour ${productType}:`);
          console.log(`   Valeur: ${value} | Seuil: = 0 (absence totale) | Résultat: ${isValid ? 'CONFORME' : 'NON-CONFORME'}`);
        } else {
          // Cas normal : valeur doit être strictement inférieure au seuil
          isValid = value < airStaticLocation.limite_max;
          console.log(`🧪 Validation Air Statique pour ${productType}:`);
          console.log(`   Valeur: ${value} | Seuil: < ${airStaticLocation.limite_max} | Résultat: ${isValid ? 'CONFORME' : 'NON-CONFORME'}`);
        }

        console.log('🎯 Résultat validation Air Statique:', { isValid, result: isValid ? 'valid' : 'invalid' });
        return isValid ? 'valid' : 'invalid';
      } else {
        console.log(`⚠️ Aucun lieu Air Statique trouvé pour: ${productType}`);
        console.log('📋 Lieux disponibles:', airStaticLocations.map(l => l.lieu));
        console.log('❌ Retour normal (bleu) car lieu non trouvé');
        return 'normal'; // Pas de seuil défini = pas de validation
      }
    }

    // CAS NORMAL : Autres produits - Utilise les seuils codés en dur
    // Seuils microbiologiques codés en dur - SYNCHRONISÉS avec Supabase
    const hardcodedThresholds: Record<string, Record<string, number>> = {
      "Fromage pasteurises (FP)": {
        "Escherichia coli": 100,        // < 100
        "Staphylocoques": 10,           // < 10
        "Levures/Moisissures (5j)": 5000 // < 5000
      },
      "LAIT": {
        "Flore totales": 300000         // < 300000
      },
      "GYMA 0%": {
        "Entérobactéries": 10,          // < 10
        "Levures/Moisissures (5j)": 100 // < 100
      },
      "Grand Frais": {
        "Entérobactéries": 10,          // < 10
        "Levures/Moisissures (5j)": 100 // < 100
      },
      "Créme Dessert Collet": {
        "Entérobactéries": 10,          // < 10
        "Levures/Moisissures (5j)": 100 // < 100
      },
      "Aliments Sante (AS)": {
        "Flore totales": 10             // < 10
      },
      "Dessert végétal non fermenté": {
        "Flore totales": 1000,          // < 1000
        "Entérobactéries": 10,          // < 10
        "Levures/Moisissures (5j)": 100 // < 100
      },
      "Eaux de rincage": {
        "Flore totales": 10,            // < 10
        "Entérobactéries": 1,           // < 1
        "Levures/Moisissures (5j)": 10  // < 10
      },
      "Mains": {
        "Flore totales": 51,            // < 51
        "Entérobactéries": 0            // = 0 (absence totale)
      },
      "Materiel": {
        "Flore totales": 30,            // < 30
        "Entérobactéries": 1,           // < 1
        "Levures/Moisissures (5j)": 10  // < 10
      }
    };

    // 1. Chercher d'abord dans product_thresholds
    console.log('🔍 Recherche de seuils pour:', { brand, bacteriaName, value });
    console.log('🔍 DEBUG - productThresholds disponibles:', productThresholds.length);
    console.log('🔍 DEBUG - Seuils pour ce produit:', productThresholds.filter(pt => pt.product_brand === brand));
    console.log('🔍 DEBUG - Recherche exacte:', { brand, bacteriaName });
    console.log('🔍 DEBUG - Site de l\'échantillon:', site);
    console.log('🔍 DEBUG - Tous les sites disponibles:', [...new Set(productThresholds.map(pt => pt.site))]);
    console.log('🔍 DEBUG - Tous les produits disponibles:', [...new Set(productThresholds.map(pt => pt.product_brand))]);
    
    // Recherche exacte d'abord
    let productThreshold = productThresholds.find(pt => 
      pt.product_brand === brand && 
      pt.parameter_type === bacteriaName &&
      pt.is_active
    );
    
    console.log('🔍 DEBUG - Seuil trouvé (recherche exacte):', productThreshold);
    
    // Si pas trouvé, recherche flexible pour les variations de noms
    if (!productThreshold) {
      console.log('🔍 DEBUG - Recherche flexible pour variations de noms...');
      
      // Variations possibles pour "Levures & Moisissures (5j)"
      const variations = [
        bacteriaName,
        bacteriaName.replace(/&/g, 'et'),
        bacteriaName.replace(/&/g, 'et').replace(/\(/g, '').replace(/\)/g, ''),
        bacteriaName.replace(/\(/g, '').replace(/\)/g, ''),
        bacteriaName.replace(/&/g, 'et').replace(/\s+/g, ' ').trim(),
        bacteriaName.replace(/\s+/g, ' ').trim(),
        // Variations entre (3j) et (5j) pour Levures/Moisissures
        bacteriaName.replace(/\(3j\)/g, '(5j)'),
        bacteriaName.replace(/\(5j\)/g, '(3j)'),
        // Gestion spéciale pour "Levures/Moisissures" sans délai
        bacteriaName === 'Levures/Moisissures' ? 'Levures/Moisissures (3j)' : bacteriaName,
        bacteriaName === 'Levures/Moisissures' ? 'Levures/Moisissures (5j)' : bacteriaName
      ];
      
      console.log('🔍 DEBUG - Variations testées:', variations);
      
      for (const variation of variations) {
        productThreshold = productThresholds.find(pt => 
          pt.product_brand === brand && 
          pt.parameter_type === variation &&
          pt.is_active
        );
        
        if (productThreshold) {
          console.log(`🔍 DEBUG - Seuil trouvé avec variation "${variation}":`, productThreshold);
          break;
        }
      }
    }
    
    console.log('🔍 DEBUG - Seuil final trouvé:', productThreshold);
    
    if (productThreshold) {
      console.log('✅ Seuil trouvé dans product_thresholds:', productThreshold);
      
      // Appliquer la logique de validation selon l'opérateur
      let isValid = false;
      
      if (productThreshold.comparison_operator === '<') {
        isValid = value < (productThreshold.max_value || productThreshold.min_value);
      } else if (productThreshold.comparison_operator === '>') {
        isValid = value > (productThreshold.min_value || productThreshold.max_value);
      } else if (productThreshold.comparison_operator === '=') {
        isValid = value === (productThreshold.min_value || productThreshold.max_value);
      } else if (productThreshold.comparison_operator === '<=') {
        isValid = value <= (productThreshold.max_value || productThreshold.min_value);
      } else if (productThreshold.comparison_operator === '>=') {
        isValid = value >= (productThreshold.min_value || productThreshold.max_value);
      } else if (productThreshold.comparison_operator === 'between') {
        isValid = value >= productThreshold.min_value && value <= productThreshold.max_value;
      }
      
      const resultMessage = isValid ? 'CONFORME' : 'NON-CONFORME';
      const returnValue = isValid ? 'valid' : 'invalid';
      console.log(`🧪 Validation ${bacteriaName} pour ${brand}: ${value} ${productThreshold.comparison_operator} ${productThreshold.max_value || productThreshold.min_value} = ${resultMessage}`);
      console.log(`🔴🔴🔴 RETOUR validateMicrobiologicalThresholds: "${returnValue}" 🔴🔴🔴`);
      return returnValue;
    }
    
    // 2. Fallback vers les seuils codés en dur
    console.log('⚠️ Seuil non trouvé dans product_thresholds, utilisation des seuils codés en dur');
    
    // Récupérer le seuil pour cette combinaison produit/bactérie
    const productHardcodedThresholds = hardcodedThresholds[brand];
    if (!productHardcodedThresholds) {
      console.log('⚠️ Aucun seuil défini pour le produit:', brand);
      return 'normal';
    }

    const threshold = productHardcodedThresholds[bacteriaName];
    if (threshold === undefined) {
      console.log('⚠️ Aucun seuil défini pour la bactérie:', bacteriaName, 'dans le produit:', brand);
      return 'normal';
    }

    // Validation : conforme si valeur < seuil (sauf cas spécial seuil = 0)
    let isValid;
    if (threshold === 0) {
      // Cas spécial : seuil = 0 signifie que la valeur doit être exactement 0 (absence totale)
      isValid = value === 0;
      console.log(`🧪 Validation ${bacteriaName} pour ${brand}:`);
      console.log(`   Valeur: ${value} | Seuil: = 0 (absence totale) | Résultat: ${isValid ? 'CONFORME' : 'NON-CONFORME'}`);
    } else {
      // Cas normal : valeur doit être strictement inférieure au seuil
      isValid = value < threshold;
      console.log(`🧪 Validation ${bacteriaName} pour ${brand}:`);
      console.log(`   Valeur: ${value} | Seuil: < ${threshold} | Résultat: ${isValid ? 'CONFORME' : 'NON-CONFORME'}`);
    }

    return isValid ? 'valid' : 'invalid';
  };

  // Fonction pour calculer automatiquement le résultat d'un échantillon
  const calculateSampleResult = (sample: Sample): string => {
      console.log(`🔵🔵🔵 DÉBUT calculateSampleResult - Échantillon ${sample.id} (${sample.brand}) 🔵🔵🔵`);
      
      // Vérification de sécurité : si selectedBacteria est vide, retourner "Conforme" par défaut
      if (!selectedBacteria || selectedBacteria.length === 0) {
        console.warn(`⚠️ selectedBacteria est vide - Retour par défaut: Conforme`);
        return 'Conforme';
      }
      
    // CAS SPÉCIAL : Air Statique - Seuls les seuils microbiologiques comptent
    if (sample.brand === 'Air Statique') {
      console.log(`🌪️ CALCUL RÉSULTAT AIR STATIQUE - Échantillon: ${sample.id}`);
      
      // Vérifier UNIQUEMENT les seuils microbiologiques pour Air Statique
      for (const bacteria of selectedBacteria) {
        const fieldName = bacteriaFieldMapping[bacteria.bacteria_name] || 'enterobacteria_count';
        const value = (sample as any)[fieldName];
        
        if (value !== null && value !== undefined) {
          const microValidation = validateMicrobiologicalThresholds(sample, bacteria.bacteria_name, value);
          if (microValidation === 'invalid') {
            console.log(`❌ Air Statique NON-CONFORME: ${bacteria.bacteria_name} = ${value}`);
            return 'Non-conforme';
          } else {
            console.log(`✅ Air Statique Conforme: ${bacteria.bacteria_name} = ${value} (seuil respecté)`);
          }
        }
      }
      
      console.log(`✅ Air Statique CONFORME - Tous les seuils microbiologiques respectés`);
      return 'Conforme';
    }

    // LOGIQUE NORMALE pour tous les autres produits
    
    // NOTE IMPORTANTE (Mise à jour) :
    // Le résultat final ne dépend QUE des critères microbiologiques.
    // Les critères organoleptiques (odeur, goût...) et physico-chimiques (pH, acidité)
    // ne doivent PAS impacter le résultat final "Conforme/Non-conforme",
    // même s'ils s'affichent en rouge dans le tableau.

    // 3. VÉRIFIER LES SEUILS MICROBIOLOGIQUES pour chaque bactérie sélectionnée
    // Les seuils microbiologiques s'appliquent même pour les contrôles environnementaux
      console.log(`🔍 VÉRIFICATION MICROBIOLOGIQUE - Échantillon ${sample.id} (${sample.brand})`);
      console.log(`   Bactéries à vérifier: ${selectedBacteria.map(b => b.bacteria_name).join(', ')}`);
      
    for (const bacteria of selectedBacteria) {
      const fieldName = bacteriaFieldMapping[bacteria.bacteria_name] || 'enterobacteria_count';
      const value = (sample as any)[fieldName];
      
        console.log(`   🔬 Vérification ${bacteria.bacteria_name}:`);
        console.log(`      - Champ DB: ${fieldName}`);
        console.log(`      - Valeur: ${value} (type: ${typeof value})`);
        
        if (value !== null && value !== undefined && value !== '') {
          // Convertir en nombre si ce n'est pas déjà le cas
          const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value);
          
          if (isNaN(numericValue)) {
            console.log(`      ⚠️ Valeur non numérique, ignorée`);
            continue;
          }
          
          console.log(`      - Valeur numérique: ${numericValue}`);
          const microValidation = validateMicrobiologicalThresholds(sample, bacteria.bacteria_name, numericValue);
          console.log(`      - Résultat validation reçu: "${microValidation}" (type: ${typeof microValidation})`);
          console.log(`      - Test microValidation === 'invalid': ${microValidation === 'invalid'}`);
          console.log(`      - Test microValidation === 'valid': ${microValidation === 'valid'}`);
          console.log(`      - Test microValidation === 'normal': ${microValidation === 'normal'}`);
          
        if (microValidation === 'invalid') {
            console.log(`      ❌❌❌ NON-CONFORME DÉTECTÉ - RETOUR "Non-conforme" ❌❌❌`);
            console.log(`      Bactérie: ${bacteria.bacteria_name} = ${numericValue}`);
            console.log(`❌ FIN CALCUL - Résultat: Non-conforme (Produit: ${sample.brand})`);
          return 'Non-conforme';
          } else if (microValidation === 'valid') {
            console.log(`      ✅ Conforme: ${bacteria.bacteria_name} = ${numericValue}`);
          } else {
            console.log(`      ℹ️ Pas de seuil défini pour ${bacteria.bacteria_name}`);
        }
        } else {
          console.log(`      ⚠️ Valeur absente (null/undefined/vide), ignorée`);
      }
    }

    // Si aucune non-conformité détectée
      console.log(`✅ FIN CALCUL - Tous les critères conformes - Résultat: Conforme (Produit: ${sample.brand})`);
    return 'Conforme';
  };

  // Fonction pour formater la date pour l'affichage dans le tableau
  const formatDateForTable = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    try {
      // Si format YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      }
      // Si format DD-MM-YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        return dateStr.replace(/-/g, '/');
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  // Fonction d'export Excel pour le formulaire
  const exportFormToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // FEUILLE 1: Informations du formulaire
      const summaryWorksheet = workbook.addWorksheet('Informations Formulaire');
      summaryWorksheet.columns = [
        { header: 'Propriété', key: 'property', width: 25 },
        { header: 'Valeur', key: 'value', width: 40 }
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

      // Ajouter les informations du formulaire
      if (samples.length > 0) {
        const firstSample = samples[0];
        summaryWorksheet.addRow({ property: 'Titre du Formulaire', value: firstSample.report_title || 'Non spécifié' });
        summaryWorksheet.addRow({ property: 'Site', value: firstSample.site || 'Non spécifié' });
        summaryWorksheet.addRow({ property: 'Marque', value: firstSample.brand || 'Non spécifiée' });
        summaryWorksheet.addRow({ property: 'Date de Création', value: format(new Date(firstSample.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) });
        summaryWorksheet.addRow({ property: 'Date de Fabrication', value: firstSample.fabrication ? format(new Date(firstSample.fabrication), 'dd/MM/yyyy', { locale: fr }) : 'Non spécifiée' });
        summaryWorksheet.addRow({ property: 'Nombre d\'Échantillons', value: samples.length });
        summaryWorksheet.addRow({ property: 'Statut', value: isArchivedView ? 'Archivé' : isViewOnlyMode ? 'Consultation' : 'En cours' });
        summaryWorksheet.addRow({ property: 'Type d\'analyse', value: firstSample.analysis_type || 'Analyse initiale' });
      }

      // FEUILLE 2: Détails des échantillons
      const brandName = samples[0]?.brand || 'Inconnue';
      const detailsWorksheet = workbook.addWorksheet(`Détail de formulaire ${brandName}`);
      
      // Configuration des colonnes (ordre fixe pour tous les exports)
      const availableColumns = [
        { key: 'number', header: 'N° Échantillon', width: 15, alwaysShow: true },
        { key: 'site', header: 'Site', width: 12, alwaysShow: true },
        { key: 'brand', header: 'Gamme', width: 25, alwaysShow: true },
        { key: 'product', header: 'Produit', width: 25, alwaysShow: true },
        { key: 'parfum', header: 'Parfum', width: 20, alwaysShow: false },
        { key: 'of_value', header: 'OF', width: 10, alwaysShow: false },
        { key: 'ready_time', header: 'Heure', width: 10, alwaysShow: false },
        { key: 'fabrication', header: 'Fabrication', width: 12, alwaysShow: false },
        { key: 'dlc', header: 'DLC', width: 12, alwaysShow: false },
        { key: 'aj_dlc', header: 'AJ/DLC', width: 12, alwaysShow: false },
        { key: 'smell', header: 'Odeur', width: 10, alwaysShow: false },
        { key: 'texture', header: 'Texture', width: 10, alwaysShow: false },
        { key: 'taste', header: 'Goût', width: 10, alwaysShow: false },
        { key: 'aspect', header: 'Aspect', width: 10, alwaysShow: false },
        { key: 'ph', header: 'pH', width: 8, alwaysShow: false },
        { key: 'acidity', header: 'Acidité', width: 10, alwaysShow: false },
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

      // Filtrer les colonnes qui ont au moins une valeur non vide (incluant 0) OU qui doivent toujours être affichées
      const columnsWithData = availableColumns.filter(col => {
        // Si la colonne doit toujours être affichée
        if (col.alwaysShow) return true;
        
        // Cas spécial : la colonne Parfum doit toujours apparaître pour le site BAIKO
        if (col.key === 'parfum' && samples.length > 0 && samples[0].site === 'BAIKO') {
          return true;
        }
        
        // Sinon, vérifier si elle a au moins une valeur
        return samples.some(sample => {
          const value = sample[col.key];
          return value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined';
        });
      });

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
      samples.forEach(sample => {
        const rowData: any = {};
        columnsWithData.forEach(col => {
          let value = sample[col.key];
          
          // Utiliser les résultats calculés pour la colonne Résultat
          if (col.key === 'resultat') {
            value = calculateSampleResult(sample);
          }
          
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
      const formTitle = samples[0]?.report_title?.replace(/[^a-zA-Z0-9]/g, '_') || 'formulaire';
      link.download = `${formTitle}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: `Formulaire "${samples[0]?.report_title || 'Sans titre'}" exporté avec ${samples.length} échantillon(s)`,
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
    }
  };

  // Fonction pour vérifier et envoyer des alertes
  const checkAndSendAlerts = async () => {
    try {
      const nonConformSamples: any[] = [];

      for (const sample of samples) {
        // Créer un échantillon temporaire mis à jour avec les nouvelles valeurs saisies
        // C'est CRUCIAL pour que calculateSampleResult utilise les données qu'on vient de taper
        const updatedSample = { ...sample };
        
        // Mettre à jour avec les valeurs de readingResults
        for (const bacteria of selectedBacteria) {
            const fieldName = bacteriaFieldMapping[bacteria.bacteria_name];
            // Priorité à la valeur saisie (readingResults), sinon valeur existante
            const val = readingResults[sample.id]?.[bacteria.bacteria_name];
            if (val !== undefined && val !== null && val !== '') {
                (updatedSample as any)[fieldName] = Number(val);
            }
        }

        // Utiliser la fonction centralisée de calcul de résultat
        // C'est elle qui détermine ce qui s'affiche dans la colonne "Résultat"
        const result = calculateSampleResult(updatedSample);

        // Si le résultat global est "Non-conforme", on déclenche l'alerte
        if (result === 'Non-conforme') {
          // Récupérer les raisons spécifiques pour l'email (informatif)
          const reasons: string[] = [];
          
          for (const bacteria of selectedBacteria) {
             const fieldName = bacteriaFieldMapping[bacteria.bacteria_name];
             const val = (updatedSample as any)[fieldName];
             if (val !== undefined && val !== null) {
                 const validation = validateMicrobiologicalThresholds(updatedSample, bacteria.bacteria_name, val);
                 if (validation === 'invalid') {
                     reasons.push(`${bacteria.bacteria_name}: ${val} (Seuil dépassé)`);
                 }
             }
          }

          nonConformSamples.push({
              sampleNumber: sample.number,
              brand: sample.brand,
              product: sample.product,
              reasons: reasons
          });
        }
      }

      if (nonConformSamples.length > 0) {
          console.log("🚨 ALERTE QUALITÉ DÉCLENCHÉE 🚨");
          console.log("Destinataire: lotfiboutaoua@maisoncollet.fr");
          
          // TENTATIVE D'APPEL DIRECT VIA FETCH STANDARD (avec CORS configuré côté serveur)
          try {
            const functionUrl = 'https://vwecfxtgqyuydhlvutvg.supabase.co/functions/v1/send-alert-email';
            
            console.log("Envoi fetch vers:", functionUrl);

            const response = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: 'lotfiboutaoua@maisoncollet.fr',
                subject: `🚨 Alerte Non-Conformité - ${samples[0]?.report_title || 'Formulaire'}`,
                samples: nonConformSamples 
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error("Erreur serveur lors de l'envoi:", errorText);
              toast({
                title: "⚠️ Erreur d'envoi d'email",
                description: `Le serveur a refusé l'envoi: ${response.status}`,
                variant: "destructive"
              });
            } else {
              const result = await response.json();
              console.log("Succès envoi email:", result);
              toast({
                title: "📧 Alerte Qualité Envoyée",
                description: `Un email de non-conformité a été envoyé à lotfiboutaoua@maisoncollet.fr`,
                className: "bg-red-50 border-red-200 text-red-800",
                duration: 5000
              });
            }

          } catch (e) {
            console.error("Exception lors de l'appel fetch:", e);
            // Même en cas d'exception locale, on prévient l'utilisateur
            toast({
                title: "Erreur réseau",
                description: "Impossible d'envoyer l'alerte.",
                variant: "destructive"
            });
          }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des alertes:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des échantillons...</p>
        </div>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun échantillon en attente
            </h3>
            <p className="text-gray-600 mb-4">
              Aucun échantillon en attente de lecture pour ce formulaire.
            </p>
            <Button onClick={() => navigate('/quality-control')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Eye className="h-8 w-8 text-blue-600" />
                {isArchivedView ? 'Visualisation des Résultats' : 
                 isViewOnlyMode ? 'Consultation des Résultats' : 'Saisie des Résultats'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isArchivedView ? '📋 Formulaire archivé • ' : ''}
                {isViewOnlyMode ? '👁️ Résultats complétés • ' : ''}
                {samples[0]?.report_title && `${samples[0].report_title} • `}
                {bacteriaName && `${bacteriaName} • `}
                {readingDay && `${readingDay} • `}
                {samples.length} échantillon(s) {isArchivedView || isViewOnlyMode ? 'analysé(s)' : 'à analyser'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportFormToExcel}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/forms-history')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Aligné parfaitement avec l'en-tête */}
      <div className="container mx-auto px-4 py-8">
        <div className="ml-11 space-y-6">
          {/* Informations du formulaire */}
          {samples[0] && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">
                  {samples[0].report_title || `Formulaire ${samples[0].form_id}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Site:</span>
                    <div className="text-blue-900">{samples[0].site}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Marque:</span>
                    <div className="text-blue-900">{samples[0].brand}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Date de création:</span>
                    <div className="text-blue-900">{new Date(samples[0].created_at).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Type d'analyse:</span>
                    <div className="text-blue-900 font-medium">{samples[0].analysis_type || 'Analyse initiale'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tableau des échantillons en format tabulaire */}
          <div className="w-full border border-gray-200 rounded-lg shadow-sm bg-white">
            <div className="w-full rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        {/* Colonne numéro d'échantillon (bleue) */}
                        <th className="py-2 px-2 w-[65px] bg-blue-600 text-white border-r border-blue-500 font-medium text-xs text-center align-middle min-w-[65px]">N° Éch.</th>
                        {/* Colonnes des données déjà saisies (champs bleus) */}
                        <th className="py-2 px-2 w-[65px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[65px]">Site</th>
                        <th className="py-2 px-2 w-[200px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[200px]">Gamme</th>
                        <th className="py-2 px-2 w-[180px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[180px]">Produit</th>
                        {samples[0]?.site === 'BAIKO' && (
                          <th className="py-2 px-2 w-[100px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[100px]">Parfum</th>
                        )}
                        <th className="py-2 px-2 w-[75px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[75px]">OF</th>
                        <th className="py-2 px-2 w-[80px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[80px]">Heure</th>
                        <th className="py-2 px-2 w-[100px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[100px]">Fabric.</th>
                        <th className="py-2 px-2 w-[100px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[100px]">DLC</th>
                        <th className="py-2 px-2 w-[100px] bg-blue-500 text-white border-r border-blue-400 font-medium text-xs text-center align-middle min-w-[100px]">AJ/DLC</th>
                        
                        {/* Colonnes des champs verts (déjà remplis) */}
                        <th className="py-2 px-2 w-[70px] bg-green-600 text-white border-r border-green-500 font-medium text-xs text-center align-middle min-w-[70px]">Odeur</th>
                        <th className="py-2 px-2 w-[70px] bg-green-600 text-white border-r border-green-500 font-medium text-xs text-center align-middle min-w-[70px]">Texture</th>
                        <th className="py-2 px-2 w-[70px] bg-green-600 text-white border-r border-green-500 font-medium text-xs text-center align-middle min-w-[70px]">Goût</th>
                        <th className="py-2 px-2 w-[70px] bg-green-600 text-white border-r border-green-500 font-medium text-xs text-center align-middle min-w-[70px]">Aspect</th>
                        <th className="py-2 px-2 w-[75px] bg-green-600 text-white border-r border-green-500 font-medium text-xs text-center align-middle min-w-[75px]">pH</th>
                        <th className="py-2 px-2 w-[75px] bg-green-600 text-white border-r border-green-500 font-medium text-xs text-center align-middle min-w-[75px]">Acidité</th>
                        
                        {/* Colonnes de lecture microbiologique (à remplir ou afficher si archivé) */}
                        {(() => {
                          console.log(`🎯 RENDU HEADER - Nombre de bactéries à afficher: ${selectedBacteria.length}`);
                          return null;
                        })()}
                        {selectedBacteria.map((bacteria, index) => {
                          console.log(`🎯 RENDU HEADER - Bactérie ${index + 1}: "${bacteria.bacteria_name}"`);
                          console.log(`🔍 DEBUG - Nom original: "${bacteria.bacteria_name}"`);
                          const isLast = index === selectedBacteria.length - 1;
                          let shortName = bacteria.bacteria_name;
                          
                          // Traiter d'abord les cas spécifiques avec délais
                          if (shortName === 'Levures/Moisissures (3j)') {
                            shortName = 'Lev/Moi (3j)';
                          } else if (shortName === 'Levures/Moisissures (5j)') {
                            shortName = 'Lev/Moi (5j)';
                          } else if (shortName === 'Levures/Moisissures') {
                            shortName = 'Lev/Moi';
                          }
                          
                          // Puis traiter les autres bactéries
                          shortName = shortName
                            .replace('Entérobactéries', 'Entéro.')
                            .replace('Coliformes totaux', 'Coliformes')
                            .replace('Staphylocoques', 'Staphylo.')
                            .replace('Escherichia coli', 'E.coli')
                            .replace('Flore totales', 'Flore')
                            .replace('Leuconostoc', 'Leuco.');
                          
                          console.log(`✅ DEBUG - Nom raccourci: "${shortName}"`);
                          
                          return (
                            <th 
                              key={bacteria.id}
                              className={`py-2 px-2 w-[100px] bg-orange-600 text-white border-r border-orange-500 font-medium text-xs text-center align-middle min-w-[100px]`}
                            >
                              {shortName} (UFC/g)
                            </th>
                          );
                        })}
                        
                        {/* Nouvelle colonne Résultat */}
                        <th className="py-2 px-2 w-[120px] bg-purple-600 text-white border-r border-purple-500 font-medium text-xs text-center align-middle min-w-[120px]">Résultat</th>
                        
                        {/* Colonne commentaire - MAINTENANT EN DERNIER */}
                        <th className="py-2 px-2 w-[120px] bg-gray-600 text-white font-medium text-xs text-center align-middle min-w-[120px]">Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {samples.map((sample, index) => (
                        <tr key={sample.id} className="hover:bg-gray-50 border-b border-gray-200">
                          {/* Numéro d'échantillon (bleu) */}
                          <td className="py-2 px-2 w-[65px] text-center text-xs bg-blue-50 border-r border-gray-200 min-w-[65px]">
                            <span className="inline-block w-8 h-6 rounded bg-blue-600 text-white text-xs leading-6 font-medium">
                              {sample.number || `#${index + 1}`}
                            </span>
                          </td>
                          <td className="py-2 px-2 w-[65px] text-center text-xs border-r border-gray-200 min-w-[65px]">
                            {sample.site}
                          </td>
                          <td className="py-2 px-2 w-[200px] text-xs border-r border-gray-200 truncate min-w-[200px]">
                            <div className="max-w-[200px] truncate">{sample.brand}</div>
                          </td>
                          <td className="py-2 px-2 w-[180px] text-xs border-r border-gray-200 truncate min-w-[180px]">
                            <div className="max-w-[180px] truncate">{sample.product}</div>
                          </td>
                          {sample.site === 'BAIKO' && (
                            <td className="py-2 px-2 w-[100px] text-center text-xs border-r border-gray-200 min-w-[100px]">
                              {sample.parfum || '-'}
                            </td>
                          )}
                          <td className="py-2 px-2 w-[75px] bg-blue-50 border-r border-gray-200 text-center text-xs font-medium min-w-[75px]">
                            {sample.of_value || '-'}
                          </td>
                          <td className="py-2 px-2 w-[80px] text-center text-xs border-r border-gray-200 min-w-[80px]">
                            {sample.ready_time || '-'}
                          </td>
                          <td className="py-2 px-2 w-[100px] text-center text-xs border-r border-gray-200 min-w-[100px]">
                            {formatDateForTable(sample.fabrication)}
                          </td>
                          <td className={`py-2 px-2 w-[100px] text-center text-xs border-r border-gray-200 min-w-[100px] ${getDisabledFields(sample.brand).dlc ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).dlc ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                              formatDateForTable(sample.dlc)
                            )}
                          </td>
                          <td className={`py-2 px-2 w-[100px] text-center text-xs border-r border-gray-200 min-w-[100px] ${getDisabledFields(sample.brand).aj_dlc ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).aj_dlc ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                              sample.aj_dlc || '-'
                            )}
                          </td>
                          
                          {/* Champs verts (déjà remplis) avec couleurs conditionnelles et barrés si nécessaire */}
                          <td className={`py-2 px-2 w-[70px] text-center text-xs bg-green-50 border-r border-gray-200 min-w-[70px] ${getDisabledFields(sample.brand).smell ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).smell ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                            <span className={`inline-block w-6 h-6 rounded text-white text-xs leading-6 ${
                              sample.smell === 'N' ? 'bg-red-600' : 
                              sample.smell === 'C' ? 'bg-green-600' : 
                              sample.smell === 'NA' ? 'bg-gray-400' :
                              sample.smell ? 'bg-green-600' : 'bg-gray-300'
                            }`}>
                              {sample.smell || '-'}
                            </span>
                            )}
                          </td>
                          <td className={`py-2 px-2 w-[70px] text-center text-xs bg-green-50 border-r border-gray-200 min-w-[70px] ${getDisabledFields(sample.brand).texture ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).texture ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                            <span className={`inline-block w-6 h-6 rounded text-white text-xs leading-6 ${
                              sample.texture === 'N' ? 'bg-red-600' : 
                              sample.texture === 'C' ? 'bg-green-600' : 
                              sample.texture === 'NA' ? 'bg-gray-400' :
                              sample.texture ? 'bg-green-600' : 'bg-gray-300'
                            }`}>
                              {sample.texture || '-'}
                            </span>
                            )}
                          </td>
                          <td className={`py-2 px-2 w-[70px] text-center text-xs bg-green-50 border-r border-gray-200 min-w-[70px] ${getDisabledFields(sample.brand).taste ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).taste ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                            <span className={`inline-block w-6 h-6 rounded text-white text-xs leading-6 ${
                              sample.taste === 'N' ? 'bg-red-600' : 
                              sample.taste === 'C' ? 'bg-green-600' : 
                              sample.taste === 'NA' ? 'bg-gray-400' :
                              sample.taste ? 'bg-green-600' : 'bg-gray-300'
                            }`}>
                              {sample.taste || '-'}
                            </span>
                            )}
                          </td>
                          <td className={`py-2 px-2 w-[70px] text-center text-xs bg-green-50 border-r border-gray-200 min-w-[70px] ${getDisabledFields(sample.brand).aspect ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).aspect ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                            <span className={`inline-block w-6 h-6 rounded text-white text-xs leading-6 ${
                              sample.aspect === 'N' ? 'bg-red-600' : 
                              sample.aspect === 'C' ? 'bg-green-600' : 
                              sample.aspect === 'NA' ? 'bg-gray-400' :
                              sample.aspect ? 'bg-green-600' : 'bg-gray-300'
                            }`}>
                              {sample.aspect || '-'}
                            </span>
                            )}
                          </td>
                          <td className={`py-2 px-2 w-[75px] text-center text-xs bg-green-50 border-r border-gray-200 min-w-[75px] ${getDisabledFields(sample.brand).ph ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).ph ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                              sample.ph ? (() => {
                              const validation = validateProductThresholds(sample);
                              return (
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  validation.phStatus === 'invalid' 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-green-600 text-white'
                                }`}>
                                  {sample.ph}
                                </span>
                              );
                              })() : '-'
                            )}
                          </td>
                          <td className={`py-2 px-2 w-[75px] text-center text-xs bg-green-50 border-r border-gray-200 min-w-[75px] ${getDisabledFields(sample.brand).acidity ? 'bg-gray-200 opacity-50' : ''}`}>
                            {getDisabledFields(sample.brand).acidity ? (
                              <span className="line-through text-gray-500">-</span>
                            ) : (
                              sample.acidity ? (() => {
                              const validation = validateProductThresholds(sample);
                              return (
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  validation.acidityStatus === 'invalid' 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-green-600 text-white'
                                }`}>
                                  {sample.acidity}
                                </span>
                              );
                              })() : '-'
                            )}
                          </td>
                          
                          {/* Champs de lecture microbiologique (à remplir ou afficher si archivé) */}
                          {selectedBacteria.map((bacteria, index) => {
                            const isLast = index === selectedBacteria.length - 1;
                            const fieldName = bacteriaFieldMapping[bacteria.bacteria_name] || 'enterobacteria_count';
                            const existingValue = (sample as any)[fieldName];
                            const displayValue = isArchivedView ? existingValue : (readingResults[sample.id]?.[bacteria.bacteria_name] || '');
                            
                            // Debug pour comprendre pourquoi les valeurs ne s'affichent pas
                            if (isArchivedView) {
                              console.log(`🔍 DEBUG Affichage - Échantillon ${sample.id}:`);
                              console.log(`   Bactérie: ${bacteria.bacteria_name}`);
                              console.log(`   Champ DB: ${fieldName}`);
                              console.log(`   Valeur existante: ${existingValue}`);
                              console.log(`   Type de valeur: ${typeof existingValue}`);
                              console.log(`   Valeur nulle?: ${existingValue === null}`);
                              console.log(`   Valeur undefined?: ${existingValue === undefined}`);
                            }
                            
                            return (
                              <td key={`${sample.id}-${bacteria.bacteria_name}`} className={`py-2 px-2 w-[100px] text-center text-xs ${isArchivedView ? 'bg-blue-50' : 'bg-orange-50'} border-r border-gray-200 min-w-[100px]`}>
                                {isArchivedView ? (
                                  (() => {
                                    // Validation microbiologique pour l'affichage en mode archivé
                                    const microValidation = validateMicrobiologicalThresholds(sample, bacteria.bacteria_name, existingValue);
                                    
                                    return (
                                      <span className={`inline-block w-full h-8 text-xs text-center leading-8 rounded font-medium ${
                                        (existingValue !== null && existingValue !== undefined) ? 
                                          (microValidation === 'valid' ? 'bg-green-600 text-white' :
                                           microValidation === 'invalid' ? 'bg-red-600 text-white' :
                                           'bg-blue-600 text-white') // Pas de seuil défini = bleu par défaut
                                          : 'bg-gray-300 text-gray-600'
                                      }`}>
                                        {(existingValue !== null && existingValue !== undefined) ? existingValue : '-'}
                                      </span>
                                    );
                                  })()
                                ) : (
                                  (() => {
                                    // Validation en temps réel pour l'affichage des couleurs
                                    // Utiliser existingValue si disponible (données déjà saisies), sinon displayValue (saisie en cours)
                                    const numericValue = existingValue !== null && existingValue !== undefined ? existingValue : (displayValue ? parseFloat(displayValue) : null);
                                    const microValidation = validateMicrobiologicalThresholds(sample, bacteria.bacteria_name, numericValue);
                                    
                                    let borderColor = 'border-orange-300 focus:border-orange-500';
                                    let bgColor = '';
                                    
                                    if (numericValue !== null && numericValue !== undefined) {
                                      if (microValidation === 'valid') {
                                        borderColor = 'border-green-500 focus:border-green-600';
                                        bgColor = 'bg-green-50';
                                      } else if (microValidation === 'invalid') {
                                        borderColor = 'border-red-500 focus:border-red-600';
                                        bgColor = 'bg-red-50';
                                      } else {
                                        borderColor = 'border-blue-500 focus:border-blue-600';
                                        bgColor = 'bg-blue-50';
                                      }
                                    }
                                    
                                    return (
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        value={displayValue}
                                        onChange={(e) => updateReadingResultInput(sample.id, bacteria.bacteria_name, e.target.value)}
                                        onBlur={(e) => finalizeReadingResult(sample.id, bacteria.bacteria_name, e.target.value)}
                                        onFocus={(e) => e.target.select()} // Sélectionner tout le texte au focus
                                        className={`w-full h-8 text-xs text-center ${borderColor} ${bgColor} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                        readOnly={isViewOnlyMode || isArchivedView}
                                        disabled={isViewOnlyMode || isArchivedView}
                                        autoComplete="off"
                                        inputMode="decimal"
                                      />
                                    );
                                  })()
                                )}
                              </td>
                            );
                          })}
                          
                          {/* Nouvelle colonne Résultat */}
                          <td className="py-2 px-2 w-[120px] text-center text-xs bg-purple-50 border-r border-gray-200 min-w-[120px]">
                            {(() => {
                                 // TOUJOURS RECALCULER le résultat en temps réel pour garantir la cohérence
                                 // Cela permet de détecter les non-conformités même si la base de données n'est pas à jour
                                 console.log(`🟢🟢🟢 AFFICHAGE RÉSULTAT - Échantillon ${sample.id} - Calcul en cours... 🟢🟢🟢`);
                                 console.log(`   Produit: ${sample.brand} / Site: ${sample.site}`);
                                 console.log(`   Entérobactéries: ${(sample as any).enterobacteria_count}`);
                                 console.log(`   Levures/Moisissures (5j): ${(sample as any).yeast_mold_5j_count}`);
                              const realtimeResult = calculateSampleResult(sample);
                              const databaseResult = sample.resultat;
                                 console.log(`🟢🟢🟢 RÉSULTAT CALCULÉ: "${realtimeResult}" (type: ${typeof realtimeResult}) | BASE: "${databaseResult}" 🟢🟢🟢`);
                                
                                // Utiliser le résultat calculé en temps réel (plus fiable)
                                // En mode archivé, on affiche quand même le recalcul pour vérifier la cohérence
                                const calculatedResult = realtimeResult;
                                
                                // Diagnostic : Détecter les incohérences entre DB et calcul
                                if (databaseResult && realtimeResult !== databaseResult) {
                                console.warn(`⚠️ INCOHÉRENCE DÉTECTÉE - Échantillon ${sample.id}:`);
                                console.warn(`   Produit: ${sample.brand} / Type: ${sample.product}`);
                                console.warn(`   Base de données: "${databaseResult}"`);
                                console.warn(`   Calcul temps réel: "${realtimeResult}"`);
                                console.warn(`   Données microbiologiques:`, {
                                  total_flora_count: (sample as any).total_flora_count,
                                  enterobacteria_count: (sample as any).enterobacteria_count,
                                    yeast_mold_5j_count: (sample as any).yeast_mold_5j_count,
                                    escherichia_coli_count: (sample as any).escherichia_coli_count,
                                    staphylococcus_count: (sample as any).staphylococcus_count
                                  });
                                  console.warn(`   Bactéries sélectionnées:`, selectedBacteria.map(b => b.bacteria_name));
                                }
                              
                                const isNonConforme = calculatedResult === 'Non-conforme' || calculatedResult === 'Non-Conforme';
                              
                              return (
                                <div className={`max-w-[120px] truncate font-medium px-2 py-1 rounded text-xs ${
                                  isNonConforme 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-green-600 text-white'
                                }`}>
                                  {calculatedResult}
                                  {/* Indicateur d'incohérence en mode développement */}
                                  {isArchivedView && databaseResult && realtimeResult !== databaseResult && (
                                    <span className="ml-1 text-yellow-300" title="Incohérence détectée entre DB et calcul">⚠️</span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          
                          {/* Colonne commentaire - MAINTENANT EN DERNIER */}
                          <td className="py-2 px-2 w-[120px] text-center text-xs bg-gray-50 min-w-[120px]">
                            {isArchivedView ? (
                              <div className="max-w-[120px] truncate text-gray-600">
                                {sampleComments[sample.id] || (sample as any).lab_comment || (sample as any).reading_comments || '-'}
                              </div>
                            ) : (
                              <Input
                                type="text"
                                placeholder="Commentaire..."
                                value={sampleComments[sample.id] || (sample as any).lab_comment || (sample as any).reading_comments || ''}
                                onChange={(e) => {
                                  setSampleComments(prev => ({
                                    ...prev,
                                    [sample.id]: e.target.value
                                  }));
                                  setCommentsModified(true);
                                }}
                                onFocus={(e) => e.target.select()} // Sélectionner tout le texte au focus
                                className="w-full h-6 text-xs px-1 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                autoComplete="off"
                                readOnly={false}
                                disabled={false}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Légende */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>N° Échantillon</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Informations générales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>Conforme (C) / Seuils respectés</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <span>Non-conforme (N) / Seuils dépassés</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-600 rounded"></div>
                  <span>Résultats microbiologiques à saisir</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>Microbiologie - Pas de seuil défini</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-600 rounded"></div>
                  <span>Résultat de l'analyse</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <strong>Seuils pH/Acidité (Laiterie Collet R1):</strong> Fromage FP: 4.09-4.81 • LAIT: Acidité &lt;18 • GYMA 0%: pH ≤4.80 • Grand Frais/AS/Crème: pH ≤7.00 • Dessert végétal: pH ≤7.20
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <strong>Seuils Microbiologiques (UFC/g):</strong> Fromage FP: E.coli &lt;100, Staphylo &lt;10, Levures(5j) &lt;5000 • LAIT: Flore &lt;300000 • GYMA/Grand Frais/Crème: Entéro &lt;10, Levures(5j) &lt;100 • AS: Flore &lt;10 • Végétal: Flore &lt;1000, Entéro &lt;10, Levures(5j) &lt;100
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            {/* ❌ Bouton Retour du bas supprimé - il y en a déjà un en haut */}
            {isViewOnlyMode && !isArchivedView && (
              <>
                {editingComments ? (
                  <>
                    {commentsModified && (
                      <Button
                        onClick={handleSaveCommentsOnly}
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSaving ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Sauvegarde...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder commentaires
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingComments(false);
                        setCommentsModified(false);
                      }}
                    >
                      Annuler édition
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setEditingComments(true)}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      📝 Éditer commentaires
                    </Button>
                    <Button
                      onClick={() => {
                        // Passer en mode édition en supprimant le paramètre viewMode
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.delete('viewMode');
                        navigate(`/saisie-resultats?${newSearchParams.toString()}`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Modifier les résultats
                    </Button>
                  </>
                )}
              </>
            )}
            {!isArchivedView && !isViewOnlyMode && (
              <Button
                onClick={handleSaveResults}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder les résultats
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingResultsPage;