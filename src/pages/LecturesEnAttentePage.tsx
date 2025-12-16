import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  RefreshCw, Microscope, Clock, CheckCircle,
  AlertCircle, FileText, AlertTriangle, Filter, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { calculateReadingDate, isBacteriaReady, formatBacteriaDelay, getTimeRemaining, isDemoMode } from '../utils/demoMode';

// Interface pour les formulaires en attente de lecture
interface WaitingForm {
  form_id: string;
  report_title: string;
  brand: string;
  site: string;
  sample_count: number;
  bacteria_list: BacteriaSelection[];
  created_at: string;
  modified_at: string;
  sample_date?: string; // Date d'analyse choisie lors de la création du formulaire
}

// Interface pour les bactéries sélectionnées
interface BacteriaSelection {
  id: string;
  form_id: string;
  bacteria_name: string;
  bacteria_delay: string;
  reading_day: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  modified_at: string;
  reading_date?: string;
}

// Fonction pour obtenir les styles d'affichage d'une bactérie
const getBacteriaDisplayStyle = (bacteria: BacteriaSelection) => {
  if (bacteria.status === 'completed') {
    return {
      className: 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200 cursor-pointer',
      badge: 'bg-green-100 text-green-800 border-green-300',
      icon: <CheckCircle className="w-3 h-3" />,
      text: 'Terminé - Cliquer pour voir'
    };
  }
  
  if (bacteria.status === 'in_progress') {
    return {
      className: 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: <Microscope className="w-3 h-3" />,
      text: 'En cours'
    };
  }
  
  // Vérifier si la bactérie est accessible avec le système de mode démo
  const createdDate = new Date(bacteria.created_at);
  
  if (isBacteriaReady(bacteria.bacteria_name, createdDate)) {
    // Accessible maintenant (rouge en mode démo)
    return {
      className: 'bg-red-100 border-red-400 text-red-800 hover:bg-red-200 ring-2 ring-red-300 cursor-pointer',
      badge: 'bg-red-100 text-red-800 border-red-300',
      icon: <Clock className="w-3 h-3" />,
      text: 'Prêt pour lecture'
    };
  } else {
    // Pas encore accessible - temps restant
    const timeRemaining = getTimeRemaining(bacteria.bacteria_name, createdDate);
    return {
      className: 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200 ring-2 ring-yellow-300 cursor-pointer',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: <AlertTriangle className="w-3 h-3" />,
      text: `Forcer l'accès (${timeRemaining})`
    };
  }
};

const LecturesEnAttentePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [waitingForms, setWaitingForms] = useState<WaitingForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  // Charger les données au montage du composant
  useEffect(() => {
    loadWaitingForms();
  }, []);

  // Charger les formulaires en attente de lecture
  const loadWaitingForms = async () => {
    try {
      setLoading(true);
      console.log('🔄 Début du chargement des formulaires en attente...');

      // 1. D'abord récupérer toutes les bactéries (pending, in_progress, completed)
      console.log('🦠 1. Récupération des bactéries...');
      const { data: bacteriaData, error: bacteriaError } = await supabase
        .from('form_bacteria_selections')
        .select('*')
        .in('status', ['pending', 'in_progress', 'completed']);

      if (bacteriaError) {
        console.error('❌ Erreur bactéries:', bacteriaError);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les bactéries en attente",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('✅ Bactéries récupérées:', bacteriaData?.length || 0);

      // 2. Extraire tous les form_ids uniques des bactéries
      const formIds = [...new Set(bacteriaData?.map(b => b.form_id) || [])];
      console.log('📋 Form IDs trouvés:', formIds.length);

      if (formIds.length === 0) {
        console.log('⚠️ Aucun formulaire trouvé');
        setWaitingForms([]);
        setDataLoaded(true);
        setLoading(false);
        return;
      }

      // 3. Récupérer les informations des échantillons pour ces form_ids
      // IMPORTANT : On filtre UNIQUEMENT les échantillons en "waiting_reading"
      // pour éviter d'afficher les formulaires encore en "analyses_en_cours"
      console.log('📊 2. Récupération des échantillons pour ces formulaires...');
      const { data: samplesData, error: samplesError } = await supabase
        .from('samples')
        .select('form_id, report_title, brand, site, created_at, modified_at, status')
        .in('form_id', formIds)
        .eq('status', 'waiting_reading') // FILTRER par status !
        .not('form_id', 'is', null);

      console.log('📊 Échantillons en waiting_reading trouvés:', samplesData?.length || 0);

      // 4. Récupérer les dates d'analyse et infos depuis sample_forms
      console.log('📅 3. Récupération des infos depuis sample_forms...');
      const { data: sampleFormsData, error: sampleFormsError } = await supabase
        .from('sample_forms')
        .select('report_id, sample_date, brand_name, site, report_title')
        .in('report_id', formIds);

      // Créer des maps pour accéder rapidement aux infos
      const sampleDatesMap = new Map();
      const sampleFormsInfoMap = new Map();
      if (sampleFormsData) {
        sampleFormsData.forEach(form => {
          sampleDatesMap.set(form.report_id, form.sample_date);
          sampleFormsInfoMap.set(form.report_id, {
            brand: form.brand_name,
            site: form.site,
            report_title: form.report_title
          });
        });
      }
      console.log('✅ Infos formulaires récupérées:', sampleFormsInfoMap.size);

      if (samplesError) {
        console.error('❌ Erreur échantillons:', samplesError);
        
        // Utiliser des données de test en cas d'erreur
        console.log('🔄 Utilisation des données de test...');
        const testSamplesData = [
          {
            form_id: 'TEST-FORM-001',
            report_title: 'Contrôle microbiologique - Test 1',
            brand: 'Yaourt Bio',
            site: 'R1',
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString()
          },
          {
            form_id: 'TEST-FORM-002',
            report_title: 'Contrôle microbiologique - Test 2',
            brand: 'Fromage Frais',
            site: 'R2',
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString()
          }
        ];
        
        const testBacteriaData = [
          // Form 1 - plusieurs bactéries
          {
            id: 'test-bacteria-1',
            form_id: 'TEST-FORM-001',
            bacteria_name: 'E. coli',
            bacteria_delay: '24h',
            reading_day: 'Lundi',
            status: 'pending',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            modified_at: new Date().toISOString()
          },
          {
            id: 'test-bacteria-2',
            form_id: 'TEST-FORM-001',
            bacteria_name: 'Salmonella',
            bacteria_delay: '48h',
            reading_day: 'Mardi',
            status: 'completed',
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString()
          },
          {
            id: 'test-bacteria-3',
            form_id: 'TEST-FORM-001',
            bacteria_name: 'Listeria',
            bacteria_delay: '72h',
            reading_day: 'Mercredi',
            status: 'completed',
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString()
          },
          // Form 2 - plusieurs bactéries
          {
            id: 'test-bacteria-4',
            form_id: 'TEST-FORM-002',
            bacteria_name: 'Coliformes totaux',
            bacteria_delay: '48h',
            reading_day: 'Jeudi',
            status: 'pending',
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString()
          },
          {
            id: 'test-bacteria-5',
            form_id: 'TEST-FORM-002',
            bacteria_name: 'Staphylocoques',
            bacteria_delay: '48h',
            reading_day: 'Jeudi',
            status: 'completed',
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString()
          }
        ];
        
        processFormsData(testSamplesData, testBacteriaData, new Map(), new Map());
        return;
      }

      console.log('✅ Échantillons récupérés:', samplesData?.length || 0);

      // 4. Traitement des données
      processFormsData(samplesData || [], bacteriaData || [], sampleDatesMap, sampleFormsInfoMap);

    } catch (error) {
      console.error('❌ Erreur générale:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du chargement des données",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Traitement des données pour créer la structure des formulaires
  const processFormsData = (samplesData: any[], bacteriaData: any[], sampleDatesMap?: Map<string, string>, sampleFormsInfoMap?: Map<string, any>) => {
    console.log('🔄 Traitement des données...');
    console.log('📊 Échantillons reçus:', samplesData.length);
    console.log('🦠 Bactéries reçues:', bacteriaData.length);
    console.log('📅 Dates d\'analyse disponibles:', sampleDatesMap?.size || 0);
    console.log('📋 Infos formulaires disponibles:', sampleFormsInfoMap?.size || 0);
    
    // D'abord, créer un mapping de tous les form_ids avec leurs bactéries
    const bacteriaByFormId = bacteriaData.reduce((acc, bacteria) => {
      const formId = bacteria.form_id;
      if (!acc[formId]) {
        acc[formId] = [];
      }
      acc[formId].push({
        id: bacteria.id,
        form_id: bacteria.form_id,
        bacteria_name: bacteria.bacteria_name,
        bacteria_delay: bacteria.bacteria_delay,
        reading_day: bacteria.reading_day,
        status: bacteria.status,
        created_at: bacteria.created_at,
        modified_at: bacteria.modified_at,
        reading_date: bacteria.reading_date
      });
      return acc;
    }, {});

    console.log('📋 Form IDs avec bactéries:', Object.keys(bacteriaByFormId));

    // Grouper les échantillons par form_id
    const formGroups = samplesData.reduce((acc, sample) => {
      const formId = sample.form_id;
      if (!acc[formId]) {
        // Récupérer les infos depuis sample_forms si disponibles
        const formInfo = sampleFormsInfoMap?.get(formId);
        
        acc[formId] = {
          form_id: formId,
          report_title: formInfo?.report_title || sample.report_title,
          brand: sample.brand || formInfo?.brand || 'N/A',
          site: sample.site || formInfo?.site || 'N/A',
          created_at: sample.created_at,
          modified_at: sample.modified_at,
          sample_date: sampleDatesMap?.get(formId) || sample.created_at, // Utiliser la date d'analyse choisie
          sample_count: 0,
          bacteria_list: []
        };
      }
      acc[formId].sample_count++;
      return acc;
    }, {});

    // Ajouter les bactéries à chaque formulaire
    // IMPORTANT : On n'affiche QUE les formulaires qui ont des échantillons en "waiting_reading"
    // Les formulaires encore en "analyses_en_cours" sont ignorés
    Object.keys(bacteriaByFormId).forEach(formId => {
      // Si ce formulaire n'a pas d'échantillons en "waiting_reading", on le saute
      if (!formGroups[formId]) {
        console.log(`⏭️ Formulaire ${formId} ignoré : pas encore d'échantillons en waiting_reading`);
        return; // Ne pas créer d'entrée pour ce formulaire
      }
      
      // Ajouter toutes les bactéries de ce formulaire
      formGroups[formId].bacteria_list = bacteriaByFormId[formId];
    });

    // Fonction pour vérifier si un formulaire est entièrement complété
    const isFormFullyCompleted = (form: any) => {
      const bacteriaList = form.bacteria_list || [];
      return bacteriaList.length > 0 && bacteriaList.every((bacteria: any) => bacteria.status === 'completed');
    };

    const allProcessedForms = Object.values(formGroups).filter((form: any) => 
      form.bacteria_list.length > 0
    );

    // FILTRER les formulaires entièrement complétés (ils doivent disparaître de cette page)
    const formsWithPendingBacteria = allProcessedForms.filter((form: any) => {
      const isFullyCompleted = isFormFullyCompleted(form);
      if (isFullyCompleted) {
        console.log(`🎯 Formulaire ${form.form_id} entièrement complété - MASQUÉ de lectures-en-attente`);
        return false; // Ne pas afficher dans lectures-en-attente
      }
      return true; // Afficher dans lectures-en-attente
    });

    console.log('✅ Formulaires traités (avant filtrage):', allProcessedForms.length);
    console.log('✅ Formulaires affichés (après filtrage des complétés):', formsWithPendingBacteria.length);
    
    // Afficher les détails pour debugging
    formsWithPendingBacteria.forEach((form: any) => {
      const completedCount = form.bacteria_list.filter((b: any) => b.status === 'completed').length;
      const totalCount = form.bacteria_list.length;
      console.log(`📋 Formulaire ${form.form_id}: ${completedCount}/${totalCount} bactéries complétées`);
      form.bacteria_list.forEach((bacteria: any) => {
        console.log(`  🦠 ${bacteria.bacteria_name} - ${bacteria.status}`);
      });
    });

    console.log('🔧 CRITICAL: Assignation à setWaitingForms...');
    console.log('🔧 CRITICAL: Données à assigner:', JSON.stringify(formsWithPendingBacteria.map((f: any) => ({
      form_id: f.form_id,
      bacteria_count: f.bacteria_list.length,
      bacteria_names: f.bacteria_list.map((b: any) => b.bacteria_name)
    })), null, 2));

    // Trier les formulaires par date de création (du plus récent au plus ancien)
    const sortedForms = formsWithPendingBacteria.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Plus récent en premier
    });

    console.log('✅ Formulaires triés par date de création');

    setWaitingForms(sortedForms as WaitingForm[]);
    
    console.log('🔧 CRITICAL: setWaitingForms terminé');
    
    setDataLoaded(true);
    setLoading(false);
  };

  const forceReloadData = () => {
    setDataLoaded(false);
    loadWaitingForms();
  };

    const handleSelectBacteria = async (bacteria: BacteriaSelection) => {
    try {
      console.log('🦠 Sélection de la bactérie:', bacteria.bacteria_name);
      
      // Si la bactérie est complétée, afficher les résultats au lieu de commencer une nouvelle lecture
      if (bacteria.status === 'completed') {
        console.log('📊 Bactérie complétée - affichage des résultats existants');
        
        const displayDelay = formatBacteriaDelay(bacteria.bacteria_name);
        
        // Toast d'information
        toast({
          title: "Consultation des résultats",
          description: `Affichage des résultats de ${bacteria.bacteria_name}`,
          variant: "default",
        });

        // Rediriger vers la page de résultats en mode consultation
        const searchParams = new URLSearchParams({
          bacteriaId: bacteria.id,
          bacteriaName: bacteria.bacteria_name,
          formId: bacteria.form_id,
          delay: displayDelay,
          readingDay: bacteria.reading_day,
          viewMode: 'true' // Paramètre pour indiquer le mode consultation
        });

        navigate(`/saisie-resultats?${searchParams.toString()}`);
        return;
      }
      
      // Logique existante pour les bactéries non complétées
      const createdDate = new Date(bacteria.created_at);
      const isAccessible = isBacteriaReady(bacteria.bacteria_name, createdDate);
      const timeRemaining = getTimeRemaining(bacteria.bacteria_name, createdDate);
      const displayDelay = formatBacteriaDelay(bacteria.bacteria_name);
      
      let confirmMessage = '';
      if (isAccessible) {
        confirmMessage = `Cette bactérie est prête pour la lecture.\n\nBactérie: ${bacteria.bacteria_name}\nDélai: ${displayDelay}\nJour de lecture: ${bacteria.reading_day}\n\nVoulez-vous commencer la lecture maintenant?`;
      } else {
        confirmMessage = `Cette bactérie n'est pas encore prête pour la lecture (${timeRemaining}).\n\nBactérie: ${bacteria.bacteria_name}\nDélai: ${displayDelay}\nJour de lecture: ${bacteria.reading_day}\n\nVoulez-vous forcer l'accès et commencer la lecture maintenant?`;
      }
      
      if (window.confirm(confirmMessage)) {
        console.log('✅ Lecture confirmée, redirection vers la page de résultats');
        
        // Toast de confirmation
        toast({
          title: "Lecture démarrée",
          description: `La lecture de ${bacteria.bacteria_name} a commencé`,
          variant: "default",
        });

        // Rediriger directement vers la page de résultats de lecture avec les paramètres
        const searchParams = new URLSearchParams({
          bacteriaId: bacteria.id,
          bacteriaName: bacteria.bacteria_name,
          formId: bacteria.form_id,
          delay: displayDelay,
          readingDay: bacteria.reading_day,
          forceAccess: (!isAccessible).toString()
        });

        navigate(`/saisie-resultats?${searchParams.toString()}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sélection de bactérie:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la sélection de la bactérie",
        variant: "destructive",
      });
    }
  };

  const getTotalPendingBacteria = () => {
    return waitingForms.reduce((total, form) => 
      total + form.bacteria_list.filter(b => b.status === 'pending').length, 0
    );
  };

  // Obtenir la liste unique des sites
  const getUniqueSites = () => {
    const sites = waitingForms.map(form => form.site);
    return [...new Set(sites)].sort();
  };

  // Filtrer les formulaires par site sélectionné
  const getFilteredForms = () => {
    console.log('🔍 getFilteredForms: waitingForms.length =', waitingForms.length);
    waitingForms.forEach((form: WaitingForm, index) => {
      console.log(`🔍 Form ${index + 1}: ${form.form_id} - ${form.bacteria_list.length} bactéries`);
    });
    
    if (selectedSite === 'all') {
      return waitingForms;
    }
    return waitingForms.filter(form => form.site === selectedSite);
  };

  // Fonction pour supprimer un formulaire
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
      await loadWaitingForms();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header hideMenuItems={['Lectures en Attente', 'Historique', 'Formulaires', 'Administration']} />
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Lectures en Attente</h1>
              <p className="text-blue-100 text-lg">
                Formulaires et bactéries prêts pour la lecture microbiologique
              </p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30">
                <div className="text-3xl font-bold text-white">{getTotalPendingBacteria()}</div>
                <div className="text-blue-200 text-sm">Bactérie(s) en attente</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold">Formulaires en attente</CardTitle>
                <CardDescription>
                  Liste des formulaires avec des bactéries en attente de lecture
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {/* Filtre par site */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrer par site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les sites</SelectItem>
                      {getUniqueSites().map((site) => (
                        <SelectItem key={site} value={site}>
                          {site}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceReloadData}
                  className="text-xs flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-500">Chargement des formulaires...</p>
              </div>
            ) : waitingForms.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg bg-gray-50">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Aucun formulaire en attente</h3>
                <p className="text-gray-500">Tous les formulaires ont été traités.</p>
              </div>
            ) : getFilteredForms().length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg bg-gray-50">
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Aucun formulaire pour ce site</h3>
                <p className="text-gray-500">Aucun formulaire en attente pour le site sélectionné.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Affichage du nombre de formulaires filtrés */}
                {selectedSite !== 'all' && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Filtré par site: {selectedSite}
                      </span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {getFilteredForms().length} formulaire(s)
                    </Badge>
                  </div>
                )}
                {getFilteredForms().map((form) => (
                  <div key={form.form_id} className="p-6 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {form.report_title && form.report_title.length > 3 ? form.report_title : `Formulaire du ${format(new Date(form.created_at), 'dd/MM/yyyy', { locale: fr })}`}
                        </h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <div>Marque: {form.brand}</div>
                          <div>Site: {form.site}</div>
                          <div>Échantillons: {form.sample_count}</div>
                          <div>Date d'analyse: {format(new Date(form.sample_date || form.created_at), 'dd/MM/yyyy', { locale: fr })}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Badge className="bg-orange-100 text-orange-800">
                            {form.bacteria_list.filter(b => b.status === 'pending').length} en attente
                          </Badge>
                          {form.bacteria_list.filter(b => b.status === 'completed').length > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              {form.bacteria_list.filter(b => b.status === 'completed').length} complétées
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteForm(form.form_id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">État des bactéries:</h4>
                      {/* DEBUG: Affichage du nombre de bactéries (masqué) */}
                      <div className="hidden text-xs text-gray-500 mb-2">
                        DEBUG: {form.bacteria_list.length} bactéries dans ce formulaire
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {form.bacteria_list.map((bacteria, index) => {
                          console.log(`🔍 Rendu bactérie ${index + 1}/${form.bacteria_list.length}:`, bacteria.bacteria_name, bacteria.status);
                          
                          const displayStyle = getBacteriaDisplayStyle(bacteria);
                          const isCompleted = bacteria.status === 'completed';
                          
                          return (
                            <Button
                              key={bacteria.id}
                              variant="outline"
                              size="sm"
                              className={`justify-start ${displayStyle.className}`}
                              onClick={() => handleSelectBacteria(bacteria)}
                              disabled={false}
                            >
                              {displayStyle.icon}
                              <span className="ml-2">{(() => {
                                let name = bacteria.bacteria_name;
                                
                                // Traiter d'abord les cas spécifiques avec délais
                                if (name === 'Levures/Moisissures (3j)') {
                                  name = 'Lev/Moi (3j)';
                                } else if (name === 'Levures/Moisissures (5j)') {
                                  name = 'Lev/Moi (5j)';
                                } else if (name === 'Levures/Moisissures') {
                                  name = 'Lev/Moi';
                                }
                                
                                // Puis traiter les autres bactéries
                                return name
                                  .replace('Entérobactéries', 'Entéro.')
                                  .replace('Coliformes totaux', 'Coliformes')
                                  .replace('Staphylocoques', 'Staphylo.')
                                  .replace('Escherichia coli', 'E.coli')
                                  .replace('Flore totales', 'Flore')
                                  .replace('Leuconostoc', 'Leuco.');
                              })()}</span>
                              <span className="ml-auto text-xs">
                                {isCompleted ? '✅ Complété' : `${formatBacteriaDelay(bacteria.bacteria_name)} - ${bacteria.reading_day}`}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
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

export default LecturesEnAttentePage;