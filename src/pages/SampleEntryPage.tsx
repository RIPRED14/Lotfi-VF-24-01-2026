import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Save, DownloadCloud, ArrowLeft, Trash2, AlertTriangle, FileText, ArrowRight, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import SamplesTable from '@/components/SamplesTable';
import SamplePageHeader from '@/components/SamplePageHeader';
import SampleActionButtons from '@/components/SampleActionButtons';
import { useSamples } from '@/hooks/useSamples';
import { useBacteriaSelection } from '@/hooks/useBacteriaSelection';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import FormStatusCard, { FormStatus } from '@/components/FormStatusCard';
import { useFormPersistence, cleanExpiredFormData } from '@/utils/formPersistence';
import { usePersistenceDebug, printDebugReport } from '@/utils/debugPersistence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Sample } from '@/types/samples';
import BacteriaSelector from '@/components/BacteriaSelector';

// Mapping des IDs de site vers les noms complets
const SITE_MAPPING: Record<string, string> = {
  'R1': 'Laiterie Collet (R1)',
  'R2': 'Végétal Santé (R2)',
  'BAIKO': 'Laiterie Baiko'
};

const SampleEntryPage = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Ajouter les variables dérivées pour les rôles
  const isCoordinator = user?.role === 'coordinator';
  const isTechnician = user?.role === 'technician';

  // État pour empêcher les doubles soumissions
  const [isFormSentToAnalysis, setIsFormSentToAnalysis] = useState<boolean>(false);

  // Délais des bactéries (en heures)
  const bacteriaDelays: Record<string, string> = {
    'Entérobactéries': '24h',
    'Escherichia coli': '24h',
    'Coliformes totaux': '24h',
    'Staphylocoques': '24h',
    'Listeria': '48h',
    'Levures/Moisissures (3j)': '3j',
    'Flore totales': '72h',
    'Leuconostoc': '4j',
    'Levures/Moisissures (5j)': '5j'
  };

  // Fonction pour calculer le jour de lecture basé sur la bactérie
  const calculateReadingDay = (bacteriaName: string): string => {
    const delayHours = parseInt(bacteriaDelays[bacteriaName]?.replace('h', '') || '24');
    const currentDay = new Date().getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const daysToAdd = Math.ceil(delayHours / 24);
    const targetDay = (currentDay + daysToAdd) % 7;
    
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return dayNames[targetDay];
  };

  // Référence pour suivre le nombre de rendus
  const renderCountRef = useRef(0);

  // Récupérer les paramètres d'URL si présents
  const [searchParams] = useSearchParams();
  const bacterieParam = searchParams.get('bacterie');
  const jourParam = searchParams.get('jour');
  const delaiParam = searchParams.get('delai');
  const siteParam = searchParams.get('site');

  // Éviter les logs excessifs
  useEffect(() => {
    if (renderCountRef.current <= 1) {
  console.log("Paramètres d'URL détectés:", { bacterieParam, jourParam, delaiParam, siteParam });
    }
    renderCountRef.current += 1;
  }, [bacterieParam, jourParam, delaiParam, siteParam]);

  // Générer un titre de rapport basé sur les paramètres URL si disponibles
  const generatedReportTitle = bacterieParam && delaiParam
    ? `Analyse de ${bacterieParam} (${delaiParam}) - ${jourParam || 'Non spécifié'}`
    : '';

  // Combiner les paramètres de state et d'URL
  // 💾 FONCTIONNALITÉ PERSISTANCE SESSION : Récupérer depuis session si state vide
  let locationState = location.state || {};
  
  // Si le state est vide ou incomplet, essayer de compléter avec la session
  if (!locationState.reportTitle && !locationState.brand && !locationState.site) {
    try {
        const stored = sessionStorage.getItem('currentFormMetadata');
        if (stored) {
            const sessionData = JSON.parse(stored);
            console.log("💾 Restauration métadonnées depuis session");
            // Fusionner avec priorité au sessionData car locationState est vide
            locationState = { ...sessionData, ...locationState };
        }
    } catch (e) {
        console.error("Erreur lecture session:", e);
    }
  }

  const {
    reportTitle = generatedReportTitle,
    samples: savedSamples = [],
    brand = '',
    brandName = '',
    site: initialSite = siteParam || '',
    sampleDate = '',
    reference = '',
    bacterie = bacterieParam || '',
    jour = jourParam || '',
    delai = delaiParam || '',
    isNew = locationState.isNew || false,  // Vérifier si c'est un nouveau formulaire
    fromPendingPage = bacterieParam ? true : false,
    GF_PRODUCTS = ['Crème dessert vanille', 'Crème dessert chocolat', 'Crème dessert caramel'], // Valeur par défaut
    formId = locationState.formId || '', // Récupérer l'ID du formulaire si venant de l'historique
    isFromHistory = locationState.isFromHistory || false, // Vérifier si on vient de la page d'historique
    comingFromReadingPage = locationState.comingFromReadingPage || false, // Vérifier si on vient des lectures en attente
    analysisType = locationState.analysisType || 'Analyse initiale' // Récupérer le type d'analyse
  } = locationState;

  // État local pour le site pour permettre la modification si non spécifié
  const [site, setSite] = useState<string>(initialSite);
  // États locaux pour brand et brandName pour permettre la récupération depuis les échantillons
  const [currentBrand, setCurrentBrand] = useState<string>(brand);
  const [currentBrandName, setCurrentBrandName] = useState<string>(brandName);

  // Debug pour voir la valeur du site
  useEffect(() => {
    console.log('🔍 DEBUG SampleEntryPage - site:', site);
    console.log('🔍 DEBUG SampleEntryPage - siteParam:', siteParam);
    console.log('🔍 DEBUG SampleEntryPage - location.state:', location.state);
  }, [site, siteParam, location.state]);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // État pour suivre si on vient de la page de lecture (utilise la valeur de location.state)
  const [comingFromReadingPageState, setComingFromReadingPageState] = useState<boolean>(fromPendingPage || comingFromReadingPage);

  // Ajouter un état pour stocker l'ID du formulaire courant
  const [currentFormId, setCurrentFormId] = useState<string>(formId || '');

  // 💾 Sauvegarde automatique des métadonnées en session
  useEffect(() => {
    if (reportTitle && (currentBrand || site)) {
      const metaData = { 
        reportTitle, site, brand: currentBrand, brandName: currentBrandName, reference, sampleDate, analysisType,
        formId: currentFormId, // Sauvegarder aussi l'ID courant
        isNew, GF_PRODUCTS
      };
      sessionStorage.setItem('currentFormMetadata', JSON.stringify(metaData));
      console.log('💾 Métadonnées sauvegardées en session:', metaData);
    }
  }, [reportTitle, site, currentBrand, currentBrandName, reference, sampleDate, analysisType, currentFormId, isNew]);

  // 🛡️ SÉCURITÉ : Correction automatique des IDs mal formés (ex: FORM_XXXX)
  useEffect(() => {
    if (currentFormId && (!currentFormId.startsWith('form-') || currentFormId.includes('FORM_'))) {
      console.warn(`🚨 Correction automatique ID suspect: ${currentFormId}`);
      
      let correctedId = currentFormId;
      // Remplacer FORM_ par form- (insensible à la casse)
      correctedId = correctedId.replace(/^FORM_/i, 'form-');
      
      // Si l'ID ne commence toujours pas par form-, on l'ajoute
      if (!correctedId.startsWith('form-')) {
        correctedId = `form-${correctedId}`;
      }
      
      // Mettre tout en minuscule pour la cohérence
      correctedId = correctedId.toLowerCase();
      
      console.log(`✅ ID corrigé: ${correctedId}`);
      setCurrentFormId(correctedId);
    }
  }, [currentFormId]);

  // Récupérer les bactéries sélectionnées via le hook useBacteriaSelection avec le formId
  const { selectedBacteria, toggleBacteria, addBacteria, removeBacteria, syncBacteriaSelection, setBacteriaSelection } = useBacteriaSelection(currentFormId);

  // Modifier l'initialisation du hook useSamples pour respecter isNew et récupérer les états de connexion
  const {
    samples,
    addSample,
    updateSample,
    toggleConformity,
    validateSamples,
    addChangeHistory,
    sendToTechnician,
    deleteSample,
    loadSamplesByFormId // Récupérer la fonction pour charger les échantillons par ID de formulaire
  } = useSamples({
    savedSamples: isNew ? [] : savedSamples,  // Si c'est un nouveau formulaire, pas d'échantillons existants
    brand,
    isNewForm: isNew // Passer isNew comme isNewForm pour éviter de charger les anciens échantillons
  });

  // Mettre à jour le site si on le trouve dans les échantillons chargés
  useEffect(() => {
    if (!site && samples.length > 0 && samples[0].site) {
      console.log('🔄 Mise à jour du site depuis les échantillons:', samples[0].site);
      setSite(samples[0].site);
    }
  }, [samples, site]);

  // Mettre à jour le brand et brandName si on les trouve dans les échantillons chargés
  useEffect(() => {
    if (samples.length > 0 && samples[0].brand) {
      if (!currentBrand || currentBrand === '') {
        console.log('🔄 Mise à jour du brand depuis les échantillons:', samples[0].brand);
        setCurrentBrand(samples[0].brand);
        setCurrentBrandName(samples[0].brand); // Utiliser brand comme brandName si pas spécifié
      }
    }
  }, [samples, currentBrand]);

  // Charger les infos du formulaire depuis sample_forms quand on a un formId
  useEffect(() => {
    const loadFormInfo = async () => {
      if (currentFormId && (isFromHistory || !isNew)) {
        console.log('📝 Chargement des infos du formulaire depuis sample_forms:', currentFormId);
        
        const { data: formData, error: formError } = await supabase
          .from('sample_forms')
          .select('brand_name, site, report_title')
          .eq('report_id', currentFormId)
          .single();

        if (formError) {
          console.warn('⚠️ Impossible de charger les infos du formulaire depuis sample_forms:', formError);
        } else if (formData) {
          console.log('✅ Infos du formulaire récupérées depuis sample_forms:', formData);
          
          // Mettre à jour les états locaux si les infos sont disponibles
          if (formData.brand_name && (!currentBrand || currentBrand === '')) {
            console.log('🔄 Mise à jour du brand depuis sample_forms:', formData.brand_name);
            setCurrentBrand(formData.brand_name);
            setCurrentBrandName(formData.brand_name);
          }
          
          if (formData.site && (!site || site === '')) {
            console.log('🔄 Mise à jour du site depuis sample_forms:', formData.site);
            setSite(formData.site);
          }
        }
      }
    };

    loadFormInfo();
  }, [currentFormId, isFromHistory, isNew]);

  // Ajouter une référence pour suivre si les échantillons ont déjà été créés
  const samplesCreatedRef = useRef(false);

  // Référence pour suivre l'URL précédente
  const previousUrlRef = useRef("");

  // Ajouter l'état pour le statut du formulaire
  const [formStatus, setFormStatus] = useState<FormStatus>('draft');
  // État pour le jour de lecture
  const [readingDay, setReadingDay] = useState<string>(jour || 'Lundi');
  // État pour le type de bactérie
  const [bacteria, setBacteria] = useState<string>(bacterie || 'Entérobactéries');

  // Ajouter l'état pour la sélection des bactéries par le technicien
  const [selectedBacteriaForAnalysis, setSelectedBacteriaForAnalysis] = useState<string[]>([]);
  const [showBacteriaSelection, setShowBacteriaSelection] = useState<boolean>(false);

  // États pour les résultats microbiologiques
  const [readingResults, setReadingResults] = useState<Record<string, Record<string, string | number>>>({});
  const [readingComments, setReadingComments] = useState<string>('');
  const [isReadingMode, setIsReadingMode] = useState<boolean>(comingFromReadingPage);

  // Mapping entre les noms de bactéries et les IDs du système useBacteriaSelection
  const bacteriaMapping = {
    'Entérobactéries': 'entero',
    'Escherichia coli': 'ecoli',
    'Coliformes totaux': 'coliformes',
    'Staphylocoques': 'staphylocoques',
    'Listeria': 'listeria',
    'Levures/Moisissures (3j)': 'levures3j',
    'Flore totales': 'flores',
    'Leuconostoc': 'leuconostoc',
    'Levures/Moisissures (5j)': 'levures5j'
  };

  // Ajouter un état pour gérer le chargement initial
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [dataLoadingState, setDataLoadingState] = useState<{
    samples: boolean;
    bacteria: boolean;
    formStatus: boolean;
  }>({
    samples: false,
    bacteria: false,
    formStatus: false
  });

  // Fonction pour marquer une partie des données comme chargée
  const markDataLoaded = (dataType: keyof typeof dataLoadingState) => {
    setDataLoadingState(prev => ({
      ...prev,
      [dataType]: true
    }));
  };

  // Vérifier si toutes les données sont chargées
  const isAllDataLoaded = () => {
    return Object.values(dataLoadingState).every(loaded => loaded);
  };

  // Effet pour gérer la fin du chargement initial
  useEffect(() => {
    if (isAllDataLoaded() && isInitialLoading) {
      setIsInitialLoading(false);
      console.log('✅ Chargement initial terminé');
      
      // FIX ELECTRON : Forcer le focus sur le premier input après chargement
      setTimeout(() => {
        const firstInput = document.querySelector('input:not([disabled]):not([readonly])');
        if (firstInput) {
          (firstInput as HTMLElement).focus();
          console.log('🎯 Focus forcé sur le premier champ');
        }
      }, 200);
    }
  }, [dataLoadingState, isInitialLoading]);

  // Effet pour charger les échantillons si on vient de la page d'historique
  useEffect(() => {
    if (isFromHistory && formId) {
      console.log("🔄 Chargement FORCE des échantillons du formulaire:", formId);
      setCurrentFormId(formId);

      // Reset du state de chargement pour forcer le rechargement
      setDataLoadingState(prev => ({
        ...prev,
        samples: false
      }));

      // Notification de chargement
      toast({
        title: "Chargement",
        description: "Chargement des échantillons du formulaire...",
        duration: 2000
      });

      // Charger les échantillons de ce formulaire - TOUJOURS forcer le chargement
      loadSamplesByFormId(formId).then(() => {
        console.log("✅ Échantillons chargés avec succès");
        markDataLoaded('samples');
        
        // Toast de confirmation
        toast({
          title: "Chargement terminé",
          description: "Les échantillons du formulaire ont été chargés",
          duration: 1500
        });
      }).catch(error => {
        console.error('❌ Erreur chargement échantillons:', error);
        toast({
          title: "Erreur de chargement", 
          description: "Impossible de charger les échantillons. Veuillez actualiser la page.",
          variant: "destructive",
          duration: 5000
        });
        markDataLoaded('samples'); // Marquer comme chargé même en cas d'erreur
      });
    } else if (!isFromHistory) {
      markDataLoaded('samples');
    }
  }, [isFromHistory, formId]); // Supprimer dataLoadingState.samples des dépendances

  // Effet pour charger les échantillons quand on vient de la page "Lectures en attente"
  useEffect(() => {
    if (comingFromReadingPage && formId && !dataLoadingState.samples) {
      console.log("🔄 Chargement des échantillons pour lecture:", formId, bacterie);
      setCurrentFormId(formId);
      setIsReadingMode(true);

      // Notification de chargement
      toast({
        title: "Mode lecture activé",
        description: `Préparation de la lecture pour ${bacterie}...`,
        duration: 3000
      });

      // Charger les échantillons de ce formulaire
      Promise.all([
        loadSamplesByFormId(formId),
        loadBacteriaFromDatabase(formId)
      ]).then(() => {
        markDataLoaded('samples');
        markDataLoaded('bacteria');
        // Initialiser les résultats de lecture
        setReadingResults({});
      }).catch(error => {
        console.error('Erreur chargement données lecture:', error);
        markDataLoaded('samples');
        markDataLoaded('bacteria');
      });
    } else if (!comingFromReadingPage) {
      if (!dataLoadingState.samples) markDataLoaded('samples');
      if (!dataLoadingState.bacteria) markDataLoaded('bacteria');
    }
  }, [comingFromReadingPage, formId, bacterie, dataLoadingState.samples, dataLoadingState.bacteria]);

  // Effet pour charger les bactéries quand on arrive sur une page avec un formId existant
  useEffect(() => {
    if (currentFormId && !isNew && !comingFromReadingPage && !dataLoadingState.bacteria) {
      console.log("🔄 Chargement des bactéries pour le formulaire existant:", currentFormId);
      loadBacteriaFromDatabase(currentFormId).then(() => {
        markDataLoaded('bacteria');
      }).catch(error => {
        console.error('Erreur chargement bactéries:', error);
        markDataLoaded('bacteria');
      });
    } else if (isNew || !currentFormId) {
      markDataLoaded('bacteria');
    }
  }, [currentFormId, isNew, comingFromReadingPage, dataLoadingState.bacteria]);

  // ❌ SUPPRIMÉ : Ne JAMAIS ajouter automatiquement des bactéries
  // L'utilisateur doit choisir manuellement les bactéries qu'il souhaite analyser
  // Ce code créait des doublons et des bactéries non désirées

  // Effet pour charger le statut du formulaire
  useEffect(() => {
    if (currentFormId && !dataLoadingState.formStatus) {
      fetchFormStatus(currentFormId).then(() => {
        markDataLoaded('formStatus');
      }).catch(error => {
        console.error('Erreur chargement statut:', error);
        markDataLoaded('formStatus');
      });
    } else if (!currentFormId) {
      markDataLoaded('formStatus');
    }
  }, [currentFormId, dataLoadingState.formStatus]);

  // Fonction pour récupérer le statut d'un formulaire (version améliorée)
  const fetchFormStatus = async (formId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('samples')
        .select('status')
        .eq('form_id', formId)
        .limit(1);

      if (error) {
        console.error("Erreur lors de la récupération du statut:", error);
        return;
      }

      if (data && data.length > 0) {
        const status = data[0].status as FormStatus;
        setFormStatus(status || 'draft');

        // Si le formulaire est en lecture, utiliser les valeurs par défaut
        if (status === 'waiting_reading') {
          // On utilise simplement les valeurs par défaut ou de l'URL
          setBacteria(bacterie || 'Entérobactéries');
          setReadingDay(jour || 'Lundi');
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut:", error);
      throw error;
    }
  };

  // Gérer le changement de statut du formulaire
  const handleStatusChange = async (newStatus: FormStatus) => {
    setFormStatus(newStatus);

    // Si le statut change à "waiting_reading", on doit mettre à jour les informations
    // de jour de lecture et bactérie sur tous les échantillons
    if (newStatus === 'waiting_reading') {
      try {
        // Notification de succès
        toast({
          title: "Lecture planifiée",
          description: `La lecture de ${bacteria} est planifiée pour ${readingDay}`,
          duration: 3000
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour des informations de lecture:", error);
      }
    }
  };

  // Modification du useEffect principal qui cause la boucle
  useEffect(() => {
    // Si l'URL n'a pas changé, ne rien faire
    const currentUrl = window.location.href;
    if (previousUrlRef.current === currentUrl) {
      return;
    }
    previousUrlRef.current = currentUrl;

    // Fonction pour ajouter un échantillon avec des paramètres
    const createSampleWithParams = async (bacterie, jour, delai, site) => {
      // Si les échantillons ont déjà été créés, ne pas les recréer
      if (samplesCreatedRef.current) {
        console.log("Les échantillons ont déjà été créés, ignoré.");
        return;
      }

      console.log("DÉMARRAGE CRÉATION ÉCHANTILLONS pour:", bacterie);

      // Récupérer le nom de la marque depuis l'état de navigation
      const { brandName } = location.state || {};

      // Ne pas utiliser brandName pour defaultProduct (Type Produit reste vide)
      const defaultProduct = '';
      console.log("Produit par défaut (vide):", defaultProduct);

      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      // Ajouter 3 échantillons
      try {
        for (let i = 0; i < 3; i++) {
          console.log(`Création de l'échantillon ${i+1}/3 pour ${bacterie}...`);

          // Attendre que l'échantillon soit ajouté avant de passer au suivant
          const result = await addSample(defaultProduct, {
            enterobacteria: bacterie === 'Entérobactéries' ? '' : null,
            yeastMold: bacterie.includes('levure') || bacterie.includes('moisissure') ? '' : null,
            site: site || 'R1',
            analysisType: bacterie,
            analysisDelay: delai || '24h',
            readingDay: jour || 'Lundi',
            brandName: brandName // Transmettre pour la colonne "Produit"
          });

          console.log(`Résultat création échantillon ${i+1}:`, result);

          // Pause courte entre les ajouts
          await new Promise(resolve => setTimeout(resolve, 700));
        }

        // Message de confirmation après tous les échantillons
        toast({
          title: "Échantillons créés",
          description: `3 échantillons pour ${bacterie} (${delai || 'délai non spécifié'}) ont été ajoutés automatiquement`,
          duration: 5000
        });

        console.log("Tous les échantillons ont été créés avec succès!");
      } catch (error) {
        console.error("Erreur lors de la création des échantillons:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer tous les échantillons automatiquement. Veuillez utiliser le bouton 'Ajouter un échantillon'.",
          variant: "destructive",
          duration: 5000
        });
      }

      // Marquer que les échantillons ont été créés
      samplesCreatedRef.current = true;

      // Supprimer les paramètres de l'URL après la création des échantillons
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    };

    // Obtenir les paramètres directement de l'URL une seule fois lors du montage initial
    const urlParams = new URLSearchParams(window.location.search);
    const urlBacterie = urlParams.get('bacterie');
    const urlJour = urlParams.get('jour');
    const urlDelai = urlParams.get('delai');
    const urlSite = urlParams.get('site');

    if (renderCountRef.current <= 1) {
    console.log("URL COMPLÈTE:", window.location.href);
    console.log("Paramètres URL détectés:", {
      bacterie: urlBacterie,
      jour: urlJour,
      delai: urlDelai,
      site: urlSite
    });
    }

    // Si des paramètres sont trouvés dans l'URL ET que ce n'est pas un nouveau formulaire, créer des échantillons
    if (urlBacterie && !isNew && !samplesCreatedRef.current) {
      console.log("Paramètres de bactérie détectés, création d'échantillons...");

      // Notification
      toast({
        title: "Création d'échantillons",
        description: `Préparation de l'analyse pour ${urlBacterie} (${urlDelai || 'délai non spécifié'})`,
        duration: 3000
      });

      // Créer les échantillons après un petit délai
      setTimeout(() => {
        createSampleWithParams(urlBacterie, urlJour, urlDelai, urlSite);
        setComingFromReadingPageState(true);
      }, 1500);
    }

    // Nettoyer l'effet lors du démontage
    return () => {
      // Rien à nettoyer
    };
  }, []); // Dépendance vide pour n'exécuter qu'une seule fois au montage

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Erreur d'authentification",
        description: "Vous devez être connecté pour sauvegarder",
        variant: "destructive"
      });
      return;
    }

    if (samples.length === 0) {
      toast({
        title: "Aucun échantillon",
        description: "Ajoutez au moins un échantillon avant de sauvegarder",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // DEBUG: Log l'état des bactéries sélectionnées avec plus de détails
      console.log('🔍 DEBUG COMPLET - État avant sauvegarde:', {
        selectedBacteria,
        selectedBacteriaLength: selectedBacteria.length,
        selectedBacteriaType: typeof selectedBacteria,
        samples: samples.length,
        localStorage: localStorage.getItem('lotfiv2-bacteria-selection'),
        useBacteriaSelectionState: { selectedBacteria, toggleBacteria, setBacteriaSelection }
      });

      // Vérification immédiate de l'état des sélecteurs de bactéries
      const bacteriaSelectors = document.querySelectorAll('[data-bacteria-id]');
      const checkedBacteria = Array.from(bacteriaSelectors)
        .filter(selector => selector.getAttribute('data-selected') === 'true')
        .map(selector => selector.getAttribute('data-bacteria-id'))
        .filter(Boolean);
      
      console.log('🧪 DEBUG DOM - Bactéries cochées dans le DOM:', checkedBacteria);

      // 1. Générer un form_id si nécessaire
      let formId = currentFormId;
      if (!formId) {
        formId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setCurrentFormId(formId);
      }

      console.log('💾 Sauvegarde du formulaire avec form_id:', formId);

      // 2. Vérifier les bactéries DIRECTEMENT dans la DB pour éviter les problèmes de synchronisation
      const { data: existingBacteria, error: bacteriaCheckError } = await supabase
        .from('form_bacteria_selections')
        .select('bacteria_name')
        .eq('form_id', formId);
      
      console.log('🔍 VÉRIFICATION BACTÉRIES - Requête DB:', {
        formId,
        data: existingBacteria,
        error: bacteriaCheckError,
        count: existingBacteria?.length || 0
      });
      
      const bacteriaToSave = existingBacteria || [];
      
      console.log('🔍 Bactéries trouvées dans DB:', bacteriaToSave);
      console.log('🔍 Nombre de bactéries:', bacteriaToSave.length);
      
      // Si vraiment aucune bactérie n'est sélectionnée, afficher un avertissement
      if (bacteriaToSave.length === 0) {
        console.log('⚠️ Aucune bactérie sélectionnée dans la DB');
        toast({
          title: "⚠️ Aucune bactérie sélectionnée",
          description: "Le formulaire sera enregistré sans bactéries. Vous pouvez en ajouter plus tard.",
          duration: 5000,
          variant: "default"
        });
      }

      console.log('💾 Bactéries finales à sauvegarder:', bacteriaToSave);

      // 3. Les bactéries sont déjà sauvegardées automatiquement par le hook useBacteriaSelection
      // Pas besoin de les sauvegarder à nouveau ici
      console.log('✅ Bactéries déjà sauvegardées automatiquement par le hook');

      // 3.5 📋 Créer/Mettre à jour l'entrée dans sample_forms
      const sampleDateToSave = samples[0]?.fabrication || sampleDate || new Date().toISOString().split('T')[0];
      const finalReportTitle = reportTitle || (currentBrandName ? `Formulaire contrôle microbiologique – ${currentBrandName}` : `Formulaire du ${new Date().toLocaleDateString('fr-FR')}`);
      
      console.log('📝 Enregistrement dans sample_forms:', {
        report_id: formId,
        brand_name: currentBrandName || currentBrand,
        site: site,
        report_title: finalReportTitle,
        sample_date: sampleDateToSave
      });

      const { error: formError } = await supabase
        .from('sample_forms')
        .upsert({
          report_id: formId,
          brand_name: currentBrandName || currentBrand || '',
          site: site || '',
          sample_date: sampleDateToSave,
          reference: reference || '',
          report_title: finalReportTitle,
          created_by: user?.id
        }, {
          onConflict: 'report_id'
        });

      if (formError) {
        console.error('❌ Erreur lors de l\'enregistrement du formulaire:', formError);
        // Ne pas bloquer si cette erreur se produit, mais la logger
      } else {
        console.log('✅ Formulaire enregistré dans sample_forms');
      }

      // 4. Déterminer le statut approprié
      // Quand on enregistre, le formulaire va dans "Analyses en Cours" (in_progress)
      // Il ira dans "Lectures en Attentes" (waiting_reading) seulement quand le technicien l'envoie
      const newStatus = bacteriaToSave.length > 0 ? 'in_progress' : 'draft';
      
      console.log(`📊 Statut déterminé: ${newStatus} (${bacteriaToSave.length} bactéries sélectionnées)`);

      // 5. Mettre à jour tous les échantillons avec le form_id et le bon statut
      const updates = samples.map(sample => ({
        id: sample.id,
        number: sample.number,
        product: sample.product,
        brand: currentBrandName || currentBrand || sample.brand || '', // 🔧 CORRECTION: Utiliser brand du state si dispo
        site: site || sample.site || '', // 🔧 CORRECTION: Utiliser site du state si dispo
        of_value: sample.of_value || '', // 🔧 AJOUT: Champ OF manquant
        ready_time: sample.readyTime || '',
        fabrication: sample.fabrication || '',
        dlc: sample.dlc || '',
        aj_dlc: sample.ajDlc || '',
        smell: sample.smell || '',
        texture: sample.texture || '',
        taste: sample.taste || '',
        aspect: sample.aspect || '',
        ph: sample.ph && sample.ph !== '' ? parseFloat(sample.ph) : null, // 🔧 CORRECTION: Convertir en nombre ou null
        acidity: sample.acidity && sample.acidity !== '' ? parseFloat(sample.acidity) : null, // 🔧 CORRECTION: Convertir en nombre ou null
        enterobacteria: sample.enterobacteria || '',
        yeast_mold: sample.yeastMold || '',
        listeria_count: sample.listeria_count || null,
        coliforms_count: sample.coliforms_count || null,
        staphylococcus_count: sample.staphylococcus_count || null,
        lab_comment: sample.labComment || '', // 🔧 AJOUT: Commentaire labo
        form_id: formId, // 🔧 CORRECTION: Utilisation de form_id pour Supabase
        report_title: reportTitle || (currentBrandName ? `Analyse ${currentBrandName}` : `Formulaire du ${new Date().toLocaleDateString('fr-FR')}`), // 🔧 CORRECTION: Titre par défaut robuste
        status: newStatus,
        modified_at: new Date().toISOString(),
        modified_by: user?.name || 'Utilisateur' // 🔧 AJOUT: Qui a modifié
        // La date d'ensemencement sera gérée via les bactéries dans form_bacteria_selections
      }));

      // 6. Sauvegarder les échantillons
      const { error } = await supabase
        .from('samples')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('❌ Erreur lors de la sauvegarde des échantillons:', error);
        throw error;
      }

      // 7. Mettre à jour le statut local
      setFormStatus(newStatus);

      // 8. Notification de succès adaptée
      const statusMessage = newStatus === 'in_progress' 
        ? "Formulaire envoyé en analyse" 
        : "Formulaire sauvegardé en brouillon";

      toast({
        title: "✅ Sauvegarde réussie",
        description: `${statusMessage} avec ${samples.length} échantillon(s) et ${bacteriaToSave.length} bactérie(s)`,
        duration: 3000
      });

      console.log('✅ Sauvegarde complète terminée avec statut:', newStatus);

      // 9. Vérification post-sauvegarde
      setTimeout(async () => {
        try {
          const { data: checkData, error: checkError } = await supabase
            .from('form_bacteria_selections')
            .select('*')
            .eq('form_id', formId);
          
          if (checkError) {
            console.error('❌ Erreur vérification:', checkError);
          } else {
            console.log('✅ Vérification post-sauvegarde - Bactéries dans la DB:', checkData);
            
            if (!checkData || checkData.length === 0) {
              toast({
                title: "⚠️ Problème détecté",
                description: "Les bactéries n'ont pas été sauvegardées correctement. Essayez de sauvegarder à nouveau.",
                variant: "destructive",
                duration: 5000
              });
            }
          }
        } catch (error) {
          console.error('Erreur lors de la vérification:', error);
        }
      }, 2000);

      // 10. Notification de succès - l'utilisateur peut maintenant naviguer manuellement
      if (bacteriaToSave.length > 0) {
        // Pas de redirection automatique - l'utilisateur choisit quand y aller
        console.log('✅ Sauvegarde terminée. L\'utilisateur peut naviguer manuellement vers les lectures en attente.');
      }

    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder le formulaire. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Plus de vérification localStorage - utilisation uniquement de l'état React
    // Le statut de verrouillage sera géré via les permissions utilisateur et le statut du formulaire
    setIsLocked(formStatus === 'completed' || formStatus === 'waiting_reading');
  }, [formStatus]); // Dépendre du statut du formulaire

  const handleSendToTechnician = async () => {
    if (!validateSamples()) return;

    setIsLoading(true);

    // Convertir les IDs numériques en chaînes
    const selectedSampleIds = selectedSamples.length > 0
      ? selectedSamples.map(id => id.toString())
      : undefined;

    const success = await sendToTechnician(selectedSampleIds);
    setIsLoading(false);

    if (success) {
      // Rediriger vers la page de contrôle de qualité après envoi au technicien
      setTimeout(() => {
        navigate('/quality-control');
      }, 1500);
    }
  };

  const handleToggleSelectSample = (sampleId: number) => {
    if (selectedSamples.includes(sampleId)) {
      setSelectedSamples(selectedSamples.filter(id => id !== sampleId));
    } else {
      setSelectedSamples([...selectedSamples, sampleId]);
    }
  };

  // Fonction pour gérer l'annulation des modifications
  const handleCancel = () => {
    // Réinitialiser les sélections
    setSelectedSamples([]);

    toast({
      title: "Opération annulée",
      description: "Les modifications ont été annulées."
    });
  };

  const handleDownload = () => {
    try {
      // Créer un objet avec toutes les données
      const dataToExport = {
        reportTitle,
        brand,
        site,
        sampleDate,
        reference,
        samples
      };

      // Convertir en JSON
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, '_')}_export.json`;
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: "Les données ont été exportées avec succès",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  const isGrandFrais = brand === '1';

  // Fonction pour revenir à la page des lectures en attente
  const handleReturnToPendingReadings = () => {
    navigate('/lectures-en-attente');
  };

  // Fonction pour ajouter un échantillon
  const handleAddSample = async () => {
    if (isLocked) return;

    try {
    setIsLoading(true);

      // Générer une référence unique pour l'échantillon si elle n'existe pas déjà
      let sampleReference = reference;
      if (!sampleReference) {
        // Format: SITE-YYYYMMDD-XXXX où XXXX est un identifiant aléatoire
        const today = new Date();
        const dateStr = format(today, 'yyyyMMdd');
        const randomId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        sampleReference = `${site || 'SITE'}-${dateStr}-${randomId}`;
        console.log("Référence générée:", sampleReference);
      }

      // Construire les informations de l'échantillon
      const sampleInfo = {
        site: site || '',
        readyTime: '12:00', // Heure par défaut
        // Utiliser le produit par défaut basé sur le site
        product: isGrandFrais ? GF_PRODUCTS[0] : 'Produit standard',
      };

      console.log("Informations de l'échantillon:", sampleInfo);

      // Utiliser l'ID du formulaire existant ou en générer un nouveau
      const formIdToUse = currentFormId || `form-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(2, 9)}`;
      console.log("ID du formulaire utilisé:", formIdToUse);

      // Si nous n'avons pas encore d'ID de formulaire, le stocker
      if (!currentFormId) {
        setCurrentFormId(formIdToUse);
      }

      // Mettre à jour les états locaux si nécessaire
      if (!currentBrand && brand) {
        setCurrentBrand(brand);
      }
      if (!currentBrandName && brandName) {
        setCurrentBrandName(brandName);
      }

      // Ajouter les informations pour le formulaire
      const formInfo = {
        formId: formIdToUse,
        reportTitle: reportTitle || `Analyse du ${format(new Date(), 'dd/MM/yyyy')}`,
        brand: currentBrand || brand,
        brandName: currentBrandName || brandName, // Remettre le nom affiché pour la colonne "Produit"
        reference: sampleReference,
        site: site,
        analysisType: analysisType // Ajouter le type d'analyse
      };

      console.log("Informations du formulaire:", formInfo);

      // 📋 IMPORTANT : Enregistrer immédiatement dans sample_forms dès le premier échantillon
      const finalReportTitle = reportTitle || (currentBrandName || brandName ? `Formulaire contrôle microbiologique – ${currentBrandName || brandName}` : `Formulaire du ${new Date().toLocaleDateString('fr-FR')}`);
      const sampleDateToSave = sampleDate || new Date().toISOString().split('T')[0];
      
      console.log('📝 Enregistrement immédiat dans sample_forms lors de l\'ajout du premier échantillon:', {
        report_id: formIdToUse,
        brand_name: currentBrandName || brandName || currentBrand || brand,
        site: site,
        report_title: finalReportTitle,
        sample_date: sampleDateToSave
      });

      const { error: formError } = await supabase
        .from('sample_forms')
        .upsert({
          report_id: formIdToUse,
          brand_name: currentBrandName || brandName || currentBrand || brand || '',
          site: site || '',
          sample_date: sampleDateToSave,
          reference: sampleReference || '',
          report_title: finalReportTitle,
          created_by: user?.id
        }, {
          onConflict: 'report_id'
        });

      if (formError) {
        console.error('❌ Erreur lors de l\'enregistrement dans sample_forms:', formError);
      } else {
        console.log('✅ Formulaire enregistré dans sample_forms dès l\'ajout du premier échantillon');
      }

      // Appeler addSample avec les informations complètes
      const result = await addSample('', {
        ...sampleInfo,
        ...formInfo
      });

      console.log("Résultat de l'ajout d'échantillon:", result);

      if (result) {
        toast({
          title: "Échantillon ajouté",
          description: "Un nouvel échantillon a été ajouté avec succès.",
          duration: 3000
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter l'échantillon. Veuillez réessayer.",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout d'échantillon:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de l'échantillon.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour revenir à la page d'historique des formulaires
  const handleReturnToFormsHistory = () => {
    navigate('/forms-history');
  };

  // Ajouter la sélection du jour de lecture et de la bactérie lors de l'étape "Analyses en cours"
  const renderReadingPlanningForm = () => {
    if (formStatus !== 'in_progress') return null;

    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-blue-800 font-medium mb-2">Planifier la lecture microbiologique</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de bactérie</label>
            <select
              value={bacteria}
              onChange={(e) => setBacteria(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="Entérobactéries">Entérobactéries (24h)</option>
              <option value="Escherichia coli">Escherichia coli (24h)</option>
              <option value="Coliformes totaux">Coliformes totaux (24h)</option>
              <option value="Staphylocoques">Staphylocoques (24h)</option>
              <option value="Listeria">Listeria (48h)</option>
              <option value="Levures/Moisissures (3j)">Levures/Moisissures (3j)</option>
              <option value="Flore totales">Flore totales (72h)</option>
              <option value="Leuconostoc">Leuconostoc (4j)</option>
              <option value="Levures/Moisissures (5j)">Levures/Moisissures (5j)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jour de lecture</label>
            <select
              value={readingDay}
              onChange={(e) => setReadingDay(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="Lundi">Lundi</option>
              <option value="Mardi">Mardi</option>
              <option value="Mercredi">Mercredi</option>
              <option value="Jeudi">Jeudi</option>
              <option value="Vendredi">Vendredi</option>
              <option value="Samedi">Samedi</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  // Fonction pour envoyer aux analyses en cours (demandeur ou technicien)
  const handleSendToAnalysisInProgress = async () => {
    if (formStatus !== 'draft' || (!isCoordinator && user?.role !== 'technician')) {
      toast({
        title: "Action non autorisée",
        description: "Seul un demandeur ou un technicien peut envoyer aux analyses en cours.",
        variant: "destructive"
      });
      return;
    }

    if (samples.length === 0) {
      toast({
        title: "Aucun échantillon",
        description: "Veuillez ajouter au moins un échantillon avant d'envoyer aux analyses.",
        variant: "destructive"
      });
      return;
    }

    // ✅ CORRECTION : Vérifier les bactéries DIRECTEMENT dans la DB au lieu de l'état React
    const { data: existingBacteria, error: bacteriaCheckError } = await supabase
      .from('form_bacteria_selections')
      .select('bacteria_name')
      .eq('form_id', currentFormId);
    
    console.log('🔍 [handleSendToAnalysisInProgress] Vérification bactéries DB:', {
      formId: currentFormId,
      data: existingBacteria,
      error: bacteriaCheckError,
      count: existingBacteria?.length || 0
    });

    if (!existingBacteria || existingBacteria.length === 0) {
      toast({
        title: "Aucune bactérie sélectionnée",
        description: "Veuillez sélectionner au moins une bactérie pour l'analyse.",
        variant: "destructive"
      });
      return;
    }

    // Empêcher le double-clic
    if (isFormSentToAnalysis) {
      toast({
        title: "Formulaire déjà envoyé",
        description: "Ce formulaire a déjà été envoyé aux analyses en cours.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setIsFormSentToAnalysis(true); // Marquer comme envoyé pour éviter les doublons

    try {
      const currentDate = new Date();
      
      // 🛡️ SÉCURITÉ : Validation et correction de l'ID avant envoi
      let formId = currentFormId;
      
      // Si l'ID est invalide ou mal formé, on le corrige à la volée
      if (!formId || !formId.startsWith('form-')) {
         console.warn(`⚠️ ID invalide détecté avant envoi: "${formId}"`);
         
         if (formId && formId.toUpperCase().startsWith('FORM_')) {
            // Correction simple
            formId = formId.replace(/^FORM_/i, 'form-').toLowerCase();
         } else if (samples.length > 0 && samples[0].formId && samples[0].formId.startsWith('form-')) {
            // Récupération depuis les échantillons
            formId = samples[0].formId;
         } else {
            // Génération d'urgence d'un ID valide
            formId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
         }
         
         console.log(`✅ Utilisation de l'ID corrigé: ${formId}`);
         setCurrentFormId(formId);
      }
      
      console.log('📤 Envoi aux analyses en cours avec formId:', formId);

      // 📋 ÉTAPE 1 : Créer/Mettre à jour l'entrée dans sample_forms
      const sampleDate = samples[0]?.fabrication || sampleDate || currentDate.toISOString().split('T')[0];
      const finalReportTitle = reportTitle || (currentBrandName ? `Formulaire contrôle microbiologique – ${currentBrandName}` : `Formulaire du ${new Date().toLocaleDateString('fr-FR')}`);
      
      console.log('📝 Enregistrement dans sample_forms:', {
        report_id: formId,
        brand_name: currentBrandName || currentBrand,
        site: site,
        report_title: finalReportTitle,
        sample_date: sampleDate
      });

      const { error: formError } = await supabase
        .from('sample_forms')
        .upsert({
          report_id: formId,
          brand_name: currentBrandName || currentBrand || '',
          site: site || '',
          sample_date: sampleDate,
          reference: reference || '',
          report_title: finalReportTitle,
          created_by: user?.id
        }, {
          onConflict: 'report_id'
        });

      if (formError) {
        console.error('❌ Erreur lors de l\'enregistrement du formulaire:', formError);
        // Ne pas bloquer si cette erreur se produit, mais la logger
      } else {
        console.log('✅ Formulaire enregistré dans sample_forms');
      }

      // 📋 ÉTAPE 2 : Mettre à jour le statut de tous les échantillons vers "analyses_en_cours"
      for (const sample of samples) {
        const sampleId = typeof sample.id === 'number' ? String(sample.id) : sample.id;

        console.log('📋 Mise à jour échantillon:', sampleId, 'avec brandName:', brandName);

        const { error } = await supabase
          .from('samples')
          .update({
            status: 'analyses_en_cours',
            brand: currentBrandName || currentBrand || sample.brand || '', // Ajouter le brandName dans le champ brand
            site: site || sample.site || '', // Ajouter le site
            report_title: finalReportTitle,
            modified_at: currentDate.toISOString()
          })
          .eq('id', sampleId);

        if (error) {
          console.error('❌ Erreur détaillée:', error);
          throw error;
        }
      }

      // Mettre à jour le statut local
      setFormStatus('analyses_en_cours');

      toast({
        title: "Formulaire envoyé aux analyses en cours",
        description: `Bactéries sélectionnées : ${selectedBacteria.join(', ')}. Le technicien peut maintenant remplir les analyses de base.`,
        duration: 4000
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi aux analyses en cours:', error);
      setIsFormSentToAnalysis(false); // Réautoriser en cas d'erreur
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le formulaire aux analyses en cours",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour sauvegarder les résultats microbiologiques
  const handleSaveReadingResults = async () => {
    if (!user || !formId || !bacterie) {
      toast({
        title: "Erreur",
        description: "Informations manquantes pour sauvegarder les résultats",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

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

      const currentDate = new Date().toISOString();
      let updatedCount = 0;

      // Mettre à jour chaque échantillon avec les résultats
      for (const sample of samples) {
        const sampleResults = readingResults[sample.id];
        if (!sampleResults) continue;

        const updateData = {
          enterobacteria_count: sampleResults.enterobacteria_count ? Number(sampleResults.enterobacteria_count) : null,
          yeast_mold_count: sampleResults.yeast_mold_count ? Number(sampleResults.yeast_mold_count) : null,
          listeria_count: sampleResults.listeria_count ? Number(sampleResults.listeria_count) : null,
          coliforms_count: sampleResults.coliforms_count ? Number(sampleResults.coliforms_count) : null,
          staphylococcus_count: sampleResults.staphylococcus_count ? Number(sampleResults.staphylococcus_count) : null,
          reading_comments: readingComments,
          reading_technician: user.name,
          reading_date: currentDate,
          modified_at: currentDate,
          modified_by: user.name
        };

        const { error } = await supabase
          .from('samples')
          .update(updateData)
          .eq('id', sample.id);

        if (error) throw error;
        updatedCount++;
      }

      // Marquer le formulaire comme terminé si toutes les analyses sont faites
      await supabase
        .from('samples')
        .update({ status: 'completed' })
        .eq('form_id', formId);

      toast({
        title: "🎉 Résultats enregistrés",
        description: `Lecture de ${bacterie} terminée pour ${updatedCount} échantillon(s). Le formulaire a été archivé.`,
        duration: 6000
      });

      // Pas de redirection automatique - l'utilisateur navigue manuellement
      console.log('✅ Résultats enregistrés. L\'utilisateur peut naviguer manuellement.');

    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les résultats",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour mettre à jour un résultat de lecture
  const updateReadingResult = (sampleId: string, field: string, value: string) => {
    setReadingResults(prev => ({
      ...prev,
      [sampleId]: {
        ...prev[sampleId],
        [field]: value
      }
    }));
  };

  // Fonction pour que le technicien envoie aux lectures en attente (après avoir rempli les 5 cases vertes)
  const handleSendToWaitingReadings = async () => {
    if (!user || (user.role !== 'technician' && user.role !== 'coordinator')) {
      toast({
        title: "Accès non autorisé",
        description: "Seul un technicien peut envoyer aux lectures en attente",
        variant: "destructive"
      });
      return;
    }

    // Vérifier que tous les champs requis sont remplis
    const missingFields = [];
    if (!reportTitle) missingFields.push('Titre du rapport');
    if (!brand) missingFields.push('Marque');
    if (!site) missingFields.push('Site');
    if (!sampleDate) missingFields.push('Date d\'échantillonnage');

    if (missingFields.length > 0) {
      toast({
        title: "Champs manquants",
        description: `Veuillez remplir tous les champs obligatoires : ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // Vérifier que des bactéries sont sélectionnées
    if (selectedBacteria.length === 0) {
      toast({
        title: "Aucune bactérie sélectionnée",
        description: "Veuillez sélectionner au moins une bactérie avant d'envoyer aux lectures en attente.",
        variant: "destructive"
      });
      return;
    }

    // Vérification supplémentaire : s'assurer que les valeurs ne sont pas "N" (Non conforme)
    const hasNonConformValues = samples.some(sample =>
      sample.smell === 'N' && sample.texture === 'N' && sample.taste === 'N' && sample.aspect === 'N'
    );

    if (hasNonConformValues) {
      // Demander confirmation si tous les paramètres sont non conformes
      const confirmed = window.confirm(
        "Certains échantillons ont tous leurs paramètres organoleptiques marqués comme 'Non conformes'. Voulez-vous continuer ?"
      );
      if (!confirmed) return;
    }

    setIsLoading(true);

    try {
      const currentDate = new Date();

      // 1. Récupérer le form_id des échantillons (utiliser le premier échantillon comme référence)
      const sampleFormId = samples.length > 0 ? samples[0].formId : currentFormId;
      
      if (!sampleFormId) {
        throw new Error("Aucun form_id trouvé dans les échantillons");
      }

      console.log('📋 Utilisation du form_id des échantillons:', sampleFormId);

      // 2. Les bactéries sont déjà sauvegardées automatiquement par le hook
      console.log('✅ Bactéries déjà sauvegardées automatiquement:', selectedBacteria);

      // 3. Mettre à jour chaque échantillon avec les informations de lecture
      for (const sample of samples) {
        const sampleId = typeof sample.id === 'number' ? String(sample.id) : sample.id;

        const { error } = await supabase
          .from('samples')
          .update({
            status: 'waiting_reading',
            modified_at: currentDate.toISOString(),
            modified_by: user?.name || 'Technicien',
            // Sauvegarder les valeurs des 5 cases vertes
            smell: sample.smell,
            texture: sample.texture,
            taste: sample.taste,
            aspect: sample.aspect,
            ph: sample.ph,
            // Sauvegarder le commentaire laboratoire
            lab_comment: sample.labComment || null,
            // 🔧 IMPORTANT: Préserver les infos techniques (brand, site, report_title)
            brand: currentBrandName || currentBrand || sample.brand || '',
            site: site || sample.site || '',
            report_title: finalReportTitle
            // Date d'ensemencement gérée via form_bacteria_selections
          })
          .eq('id', sampleId);

        if (error) throw error;
      }

      // 3.5 📋 Enregistrer/Mettre à jour dans sample_forms pour "Lectures en attente"
      const sampleDateToSave = samples[0]?.fabrication || sampleDate || currentDate.toISOString().split('T')[0];
      const finalReportTitle = reportTitle || (currentBrandName || brandName ? `Formulaire contrôle microbiologique – ${currentBrandName || brandName}` : `Formulaire du ${new Date().toLocaleDateString('fr-FR')}`);
      
      console.log('📝 Enregistrement dans sample_forms pour lectures en attente:', {
        report_id: sampleFormId,
        brand_name: currentBrandName || currentBrand || samples[0]?.brand,
        site: site || samples[0]?.site,
        report_title: finalReportTitle,
        sample_date: sampleDateToSave
      });

      const { error: formErrorWR } = await supabase
        .from('sample_forms')
        .upsert({
          report_id: sampleFormId,
          brand_name: currentBrandName || currentBrand || samples[0]?.brand || '',
          site: site || samples[0]?.site || '',
          sample_date: sampleDateToSave,
          reference: reference || '',
          report_title: finalReportTitle,
          created_by: user?.id
        }, {
          onConflict: 'report_id'
        });

      if (formErrorWR) {
        console.error('❌ Erreur lors de l\'enregistrement dans sample_forms:', formErrorWR);
      } else {
        console.log('✅ Formulaire enregistré dans sample_forms pour lectures en attente');
      }

      // 4. Mettre à jour le statut local
      setFormStatus('waiting_reading');

      toast({
        title: "Sauvegarde réussie",
        description: `Formulaire envoyé aux lectures en attente avec ${samples.length} échantillon(s) et ${selectedBacteria.length} bactérie(s)`,
        duration: 5000
      });

      // Pas de redirection automatique - l'utilisateur navigue manuellement
      console.log('✅ Formulaire envoyé aux lectures en attente. L\'utilisateur peut naviguer manuellement.');

    } catch (error) {
      console.error('Erreur lors de l\'envoi aux lectures en attente:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer aux lectures en attente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier si une bactérie est prête pour la lecture
  const isBacteriaReadyForReading = (bacteriaName: string, ensemencementDate: Date) => {
    const now = new Date();
    const timeDiff = now.getTime() - ensemencementDate.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    const bacteriaDelays = {
      'Entérobactéries': 24,
      'Escherichia coli': 24,
      'Coliformes totaux': 24,
      'Staphylocoques': 24,
      'Listeria': 48,
      'Levures/Moisissures (3j)': 72,
      'Flore totales': 72,
      'Leuconostoc': 96,
      'Levures/Moisissures (5j)': 120
    };

    const requiredHours = bacteriaDelays[bacteriaName as keyof typeof bacteriaDelays] || 24;
    return hoursDiff >= requiredHours;
  };

  // Fonction pour afficher les champs de saisie des résultats microbiologiques
  const renderReadingResultsForm = () => {
    if (!isReadingMode || !bacterie) return null;

    // Vérifier si la bactérie est prête pour la lecture
    const ensemencementDate = new Date(); // En réalité, récupérer la vraie date d'ensemencement
    const isReady = isBacteriaReadyForReading(bacterie, ensemencementDate);

    return (
      <div className={`mb-6 p-6 border rounded-2xl ${isReady ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-medium ${isReady ? 'text-green-800' : 'text-orange-800'}`}>
            Saisie des résultats - {bacterie}
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${isReady ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            {isReady ? '✓ Prêt pour lecture' : '⏳ En attente du délai'}
          </div>
        </div>
        <p className={`text-sm mb-4 ${isReady ? 'text-green-700' : 'text-orange-700'}`}>
          {isReady
            ? 'Le délai d\'incubation est écoulé. Vous pouvez saisir les résultats de lecture microbiologique.'
            : 'Le délai d\'incubation n\'est pas encore écoulé. Cette bactérie ne peut pas encore être lue.'
          }
        </p>

        <div className="space-y-4">
          {samples.map((sample, index) => (
            <div key={sample.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-3">Échantillon #{index + 1} - {sample.product}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bacterie.toLowerCase().includes('entérobactéries') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entérobactéries (UFC/g)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={readingResults[sample.id]?.enterobacteria_count || ''}
                      onChange={(e) => updateReadingResult(sample.id, 'enterobacteria_count', e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                    />
                  </div>
                )}

                {bacterie.toLowerCase().includes('levures') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Levures/Moisissures (UFC/g)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={readingResults[sample.id]?.yeast_mold_count || ''}
                      onChange={(e) => updateReadingResult(sample.id, 'yeast_mold_count', e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                    />
                  </div>
                )}

                {bacterie.toLowerCase().includes('listeria') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Listeria (UFC/g)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={readingResults[sample.id]?.listeria_count || ''}
                      onChange={(e) => updateReadingResult(sample.id, 'listeria_count', e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                    />
                  </div>
                )}

                {bacterie.toLowerCase().includes('coliformes') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coliformes totaux (UFC/g)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={readingResults[sample.id]?.coliforms_count || ''}
                      onChange={(e) => updateReadingResult(sample.id, 'coliforms_count', e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                    />
                  </div>
                )}

                {bacterie.toLowerCase().includes('staphylocoques') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staphylocoques (UFC/g)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={readingResults[sample.id]?.staphylococcus_count || ''}
                      onChange={(e) => updateReadingResult(sample.id, 'staphylococcus_count', e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <Button
              onClick={handleSaveReadingResults}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Sauvegarde..." : "Terminer la lecture"}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/lectures-en-attente')}
            >
              Annuler
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Récupérer la fonction login du contexte d'authentification
  const { login } = useAuth();

  // Fonction pour se connecter rapidement en tant que technicien (pour les tests)
  const handleQuickLogin = async (role: 'coordinator' | 'technician') => {
    try {
      await login(`${role}@test.com`, 'password', role);
      toast({
        title: "Connexion réussie",
        description: `Connecté en tant que ${role}`,
        duration: 2000
      });
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  // Fonction pour supprimer un échantillon individuel
  const handleDeleteSample = async (sampleId: string | number): Promise<boolean> => {
    try {
      const success = await deleteSample(sampleId);
      if (success) {
        toast({
          title: "Échantillon supprimé",
          description: "L'échantillon a été retiré de la liste.",
        });
      }
      return success;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'échantillon",
        variant: "destructive"
      });
      return false;
    }
  };

  // Fonction pour supprimer tout le formulaire
  const handleDeleteForm = async () => {
    try {
      console.log('🗑️ Suppression du formulaire:', currentFormId);

      // Supprimer tous les échantillons liés au formulaire
      const { error: samplesError } = await supabase
        .from('samples')
        .delete()
        .eq('form_id', currentFormId);

      if (samplesError) throw samplesError;

      // Supprimer les numéros de lot liés
      const { error: batchError } = await supabase
        .from('batch_numbers')
        .delete()
        .eq('report_id', currentFormId);

      if (batchError) console.warn('Erreur lors de la suppression des lots:', batchError);

      // Redirection vers la page de contrôle qualité
      navigate('/quality-control');

      toast({
        title: "Formulaire supprimé",
        description: "Le formulaire et tous ses échantillons ont été supprimés.",
      });

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le formulaire",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour nettoyer complètement la base de données (admin seulement)
  const handleCleanDatabase = async () => {
    try {
      console.log('🧹 Nettoyage de la base de données...');

      // Supprimer tous les échantillons
      const { error: samplesError } = await supabase
        .from('samples')
        .delete()
        .neq('id', '');

      if (samplesError) throw samplesError;

      // Supprimer tous les numéros de lot
      const { error: batchError } = await supabase
        .from('batch_numbers')
        .delete()
        .neq('id', '');

      if (batchError) console.warn('Erreur lors de la suppression des lots:', batchError);

      toast({
        title: "✨ Base de données nettoyée",
        description: "Toutes les données de test ont été supprimées.",
      });

      // Recharger la page après nettoyage
      window.location.reload();

    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer la base de données",
        variant: "destructive"
      });
    }
  };

  // Fonction pour charger les bactéries depuis la base de données (version améliorée)
  const loadBacteriaFromDatabase = async (formId: string): Promise<void> => {
    try {
      console.log('🔄 Chargement des bactéries depuis la base de données pour form_id:', formId);
      
      const { data: bacteriaData, error } = await supabase
        .from('form_bacteria_selections')
        .select('*')
        .eq('form_id', formId);

      if (error) {
        console.error('❌ Erreur lors du chargement des bactéries:', error);
        throw error;
      }

      if (bacteriaData && bacteriaData.length > 0) {
        console.log('✅ Bactéries trouvées:', bacteriaData);
        
        // Créer un mapping inverse pour convertir les noms de bactéries en IDs
        const reverseBacteriaMapping: Record<string, string> = {
          'Entérobactéries': 'entero',
          'Escherichia coli': 'ecoli',
          'Coliformes totaux': 'coliformes',
          'Staphylocoques': 'staphylocoques',
          'Listeria': 'listeria',
          'Levures/Moisissures (3j)': 'levures3j',
          'Levures/Moisissures': 'levures3j', // Alias pour compatibilité
          'Flore totales': 'flores',
          'Leuconostoc': 'leuconostoc',
          'Levures/Moisissures (5j)': 'levures5j'
        };

        // Convertir les noms de bactéries en IDs
        const bacteriaIds = bacteriaData
          .map(bacteria => reverseBacteriaMapping[bacteria.bacteria_name])
          .filter(id => id); // Filtrer les undefined

        console.log('🔄 Synchronisation des bactéries avec le hook:', bacteriaIds);
        
        // Utiliser la nouvelle fonction de synchronisation du hook
        syncBacteriaSelection(bacteriaIds);

        console.log('✅ Bactéries synchronisées avec succès');
        
        // Afficher un message de confirmation seulement si ce n'est pas le chargement initial
        if (!isInitialLoading) {
          toast({
            title: "Bactéries chargées",
            description: `${bacteriaData.length} bactérie(s) restaurée(s) depuis la base de données`,
            duration: 3000
          });
        }
      } else {
        console.log('ℹ️ Aucune bactérie trouvée pour ce formulaire');
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des bactéries:', error);
      throw error;
    }
  };

  // Effet pour charger les bactéries quand le formulaire est chargé
  // SUPPRIMÉ - doublon avec l'effet ajouté plus haut

  // Fonction synchrone pour la suppression d'échantillon
  const handleDeleteSampleSync = (id: string | number): boolean => {
    // Lancer la suppression en arrière-plan
    handleDeleteSample(id).catch(error => {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'échantillon",
        variant: "destructive"
      });
    });
    return true; // Retourner immédiatement true
  };

  // FONCTION DÉSACTIVÉE : Les bactéries sont maintenant sauvegardées automatiquement par le hook useBacteriaSelection
  // Cette fonction locale n'est plus nécessaire et créait des doublons
  // Conservée commentée pour référence historique
  /*
  const saveBacteriaSelections = async (formId: string, selectedBacteriaIds: string[]) => {
    // Cette fonction est désactivée - voir le hook useBacteriaSelection
  };
  */

  // Fonction pour appliquer les changements des bactéries aux lots
  const handleApplyBacteria = () => {
    // Fonction supprimée - lots non définis dans ce composant
    console.log('handleApplyBacteria: Fonction supprimée');
  };

  // Hook pour la persistance automatique
  const { saveData, loadData, clearData } = useFormPersistence(currentFormId);
  
  // Hook pour le debug de persistance
  const { log } = usePersistenceDebug('SampleEntryPage');

  // Ajouter des références pour éviter les boucles infinies
  const lastSavedData = useRef<any>(null);
  const hasLoadedInitialData = useRef(false);

  // Nettoyer les données expirées au chargement (UNE SEULE FOIS)
  useEffect(() => {
    cleanExpiredFormData();
    log('FORM_LOAD', { action: 'cleanExpiredFormData' }, currentFormId);
  }, []); // Pas de dépendances - se lance une seule fois

  // Charger les données sauvegardées au démarrage si disponibles (PRIORITÉ 1)
  useEffect(() => {
    if (currentFormId && !isFromHistory && !comingFromReadingPage && !isInitialLoading && !hasLoadedInitialData.current) {
      log('FORM_LOAD', { 
        currentFormId, 
        isFromHistory, 
        comingFromReadingPage, 
        isInitialLoading 
      }, currentFormId);
      
      const savedData = loadData();
      if (savedData) {
        console.log('📂 Restauration des données sauvegardées:', savedData);
        log('SUCCESS', { action: 'dataRestored', dataKeys: Object.keys(savedData) }, currentFormId);
        
        // Note: Les données sont dans location.state - pas besoin de les restaurer ici
        // Seules les bactéries peuvent être restaurées si nécessaire
        if (savedData.selectedBacteria && savedData.selectedBacteria.length > 0) {
          setBacteriaSelection(savedData.selectedBacteria);
        }
        
        // Afficher une notification
        toast({
          title: "Données restaurées",
          description: "Vos données de travail précédentes ont été restaurées",
          duration: 3000
        });
        
        lastSavedData.current = savedData;
      } else {
        log('WARNING', { action: 'noSavedData' }, currentFormId);
      }
      
      hasLoadedInitialData.current = true;
    }
  }, [currentFormId, isFromHistory, comingFromReadingPage, isInitialLoading]); // Enlever loadData des dépendances

  // Sauvegarder automatiquement les données importantes (PRIORITÉ 2)
  useEffect(() => {
    // Conditions strictes pour éviter les sauvegardes intempestives
    if (currentFormId && 
        !isInitialLoading && 
        !isFromHistory && 
        !comingFromReadingPage &&
        hasLoadedInitialData.current &&
        (reportTitle || brand || site || samples.length > 0)) {
      
      const dataToSave = {
        reportTitle,
        brand,
        site,
        sampleDate,
        reference,
        bacterie,
        jour,
        delai,
        samples,
        selectedBacteria
      };
      
      // Vérifier si les données ont vraiment changé pour éviter les sauvegardes inutiles
      const dataString = JSON.stringify(dataToSave);
      const lastDataString = JSON.stringify(lastSavedData.current);
      
      if (dataString !== lastDataString) {
        log('FORM_SAVE', { 
          hasData: !!(reportTitle || brand || site || samples.length > 0),
          samplesCount: samples.length,
          bacteriaCount: selectedBacteria.length
        }, currentFormId);
        
        // Sauvegarder avec un délai pour éviter les sauvegardes trop fréquentes
        const timeoutId = setTimeout(() => {
          // Vérifier à nouveau les conditions avant de sauvegarder
          if (!isInitialLoading && !isFromHistory && !comingFromReadingPage && hasLoadedInitialData.current) {
            saveData(dataToSave);
            lastSavedData.current = dataToSave;
            log('SUCCESS', { action: 'dataSaved' }, currentFormId);
          } else {
            log('WARNING', { action: 'saveSkipped', reason: 'conditions changed' }, currentFormId);
          }
        }, 1000); // Réduire le délai à 1 seconde

        return () => {
          clearTimeout(timeoutId);
        };
      }
    }
  }, [
    currentFormId,
    isInitialLoading,
    isFromHistory,
    comingFromReadingPage,
    reportTitle,
    brand,
    site,
    sampleDate,
    reference,
    bacterie,
    jour,
    delai,
    samples,
    selectedBacteria
  ]); // Enlever saveData des dépendances

  // Fonction pour créer des échantillons de test avec différents délais
  const createTestSamplesWithDifferentDelays = async () => {
    try {
      const testDelays = [
        { hours: -50, name: 'Test Entérobactéries (En retard)', bacteria: 'entero' }, // En retard
        { hours: -1, name: 'Test E.coli (Prêt maintenant)', bacteria: 'ecoli' }, // Prêt
        { hours: 5, name: 'Test Coliformes (Bientôt)', bacteria: 'coliformes' }, // Bientôt
        { hours: 30, name: 'Test Listeria (En attente)', bacteria: 'listeria' } // En attente
      ];

      // 1. Générer un form_id si nécessaire
      let formId = currentFormId;
      if (!formId) {
        formId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setCurrentFormId(formId);
      }

      // 2. Sélectionner toutes les bactéries de test automatiquement
      const testBacteriaIds = testDelays.map(test => test.bacteria);
      console.log('🦠 Sélection automatique des bactéries de test:', testBacteriaIds);
      
      // Utiliser setBacteriaSelection pour sélectionner les bactéries
      // Le hook useBacteriaSelection sauvegarde automatiquement
      setBacteriaSelection(testBacteriaIds);
      
      // Attendre un peu que le hook sauvegarde
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Bactéries de test sauvegardées automatiquement par le hook');

      // 4. Créer les échantillons
      for (const test of testDelays) {
        const testDate = new Date();
        testDate.setHours(testDate.getHours() + test.hours);
        
        const testData = {
          readyTime: '10:00',
          fabrication: testDate.toISOString().split('T')[0],
          dlc: new Date(testDate.getTime() + 48*60*60*1000).toISOString().split('T')[0],
          smell: 'A',
          texture: 'A',
          taste: 'A',
          aspect: 'A',
          site: site || 'R1',
          reportTitle: `Test bactéries - ${new Date().toLocaleDateString()}`,
          brand: brand || 'Test',
          formId: formId
        };

        // Créer l'échantillon avec une date personnalisée
        const sampleResult = await addSample(test.name, testData);
        
        if (sampleResult) {
          // Mettre à jour la date de création dans Supabase pour le test
          await supabase
            .from('samples')
            .update({ 
              created_at: testDate.toISOString(),
              status: 'waiting_reading', // S'assurer que le statut est correct
              form_id: formId
              // Date d'ensemencement gérée via form_bacteria_selections
            })
            .eq('id', sampleResult.sampleId);

          console.log(`✅ Échantillon test créé: ${test.name} avec date ${testDate.toISOString()}`);
        }
      }

      // 5. Mettre à jour le statut du formulaire
      setFormStatus('waiting_reading');

      // 6. Recharger les échantillons pour voir les nouvelles dates
      if (formId) {
        await loadSamplesByFormId(formId);
      }

      toast({
        title: "Tests créés !",
        description: `4 échantillons de test avec ${testBacteriaIds.length} bactéries ont été créés et sont maintenant disponibles dans les lectures en attente`,
        duration: 5000
      });

      // 7. Pas de redirection automatique - l'utilisateur navigue manuellement
      console.log('✅ Échantillons de test créés. L\'utilisateur peut naviguer manuellement.');

    } catch (error) {
      console.error('Erreur création échantillons test:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer les échantillons de test",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      <SamplePageHeader title={reportTitle || `Analyse de ${bacterie} (${delai})`} />

      {/* Indicateur de chargement initial */}
      {isInitialLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 font-medium">Chargement des données...</span>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${dataLoadingState.samples ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Échantillons</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${dataLoadingState.bacteria ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Bactéries</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${dataLoadingState.formStatus ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Statut du formulaire</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boutons de connexion rapide pour les tests */}
      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
          <h3 className="text-yellow-800 font-medium mb-2">Mode Test - Connexion Rapide</h3>
          <div className="flex gap-2">
            <Button onClick={() => handleQuickLogin('coordinator')} variant="outline" size="sm">
              Se connecter comme Demandeur
            </Button>
            <Button onClick={() => handleQuickLogin('technician')} variant="outline" size="sm">
              Se connecter comme Technicien
            </Button>
          </div>
        </div>
      )}



      <main className="container mx-auto px-4 py-8">
        {comingFromReadingPage && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToPendingReadings}
              className="flex items-center gap-2 text-[#0091CA] border-[#0091CA] hover:bg-[#e6f7ff]"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au planning
            </Button>
          </div>
        )}

        {comingFromReadingPage && samples.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-green-800 font-medium mb-2">Échantillons créés automatiquement</h3>
            <p className="text-green-700">
              {samples.length} échantillon(s) ont été créés automatiquement pour cette analyse.
              Vous pouvez maintenant les compléter et les enregistrer.
            </p>
          </div>
        )}

        {isFromHistory && samples.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-blue-800 font-medium mb-2">Formulaire chargé depuis l'historique</h3>
            <p className="text-blue-700">
              Vous consultez un formulaire existant contenant {samples.length} échantillon(s).
              {user?.role === 'coordinator' && " Vous pouvez modifier ces échantillons si nécessaire."}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 border-0 transition-all duration-300 hover:shadow-2xl bg-gradient-to-br from-white to-gray-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800">Saisie des Échantillons</h2>
              </div>
              {reportTitle ? (
                <p className="text-gray-500 mt-1">{reportTitle}</p>
              ) : bacterie && delai ? (
                <p className="text-gray-500 mt-1">Analyse de {bacterie} ({delai}) - {jour}</p>
              ) : null}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>Site: {site ? (SITE_MAPPING[site] || site) : ''}</span>
                {jour && <><span>•</span><span>Jour: {jour}</span></>}
                {reference && <><span>•</span><span>Référence: {reference}</span></>}
                {sampleDate && <><span>•</span><span>Date: {sampleDate}</span></>}
              </div>
              {bacterie && delai && (
                <div className="mt-2 text-sm">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {bacterie} - Délai: {delai}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Bouton supprimé - sera déplacé plus bas */}
            </div>
          </div>

          {/* Simplified form info card */}
          <div className="mb-6">
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  {/* Titre du formulaire */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {reportTitle || `Formulaire ${currentFormId}`}
                    </h3>
                  </div>
                  
                  {/* Informations essentielles */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 font-medium">Site:</span>
                      {site ? (
                        <div className="text-gray-800">{SITE_MAPPING[site] || site}</div>
                      ) : (
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white"
                          value={site}
                          onChange={(e) => setSite(e.target.value)}
                        >
                          <option value="">Choisir un site...</option>
                          <option value="R1">Laiterie Collet (R1)</option>
                          <option value="R2">Végétal Santé (R2)</option>
                          <option value="BAIKO">Laiterie Baiko</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Référence:</span>
                      <div className="text-gray-800">{reference || 'REF-' + currentFormId.slice(-6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Date:</span>
                      <div className="text-gray-800">{sampleDate || new Date().toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Type d'analyse:</span>
                      <div className="text-gray-800 font-medium text-blue-600">{analysisType}</div>
                    </div>
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center gap-3">
                      {/* Boutons principaux à gauche */}
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleSendToAnalysisInProgress}
                        className="bg-green-600 hover:bg-green-700 text-white transition-colors"
                        disabled={samples.length === 0 || formStatus === 'analyses_en_cours'}
                      >
                        Envoyer analyses en cours
                      </Button>
                      
                      <Button 
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        disabled={samples.length === 0 || formStatus !== 'analyses_en_cours'}
                      >
                        Enregistrer lecture en attente
                        </Button>
                      </div>
                      
                      {/* Bouton Actualiser à droite */}
                      <Button 
                        onClick={() => window.location.reload()}
                        className="bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                        variant="outline"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Actualiser
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Status Display for Created Samples */}
          {samples.length > 0 && formStatus === 'waiting_reading' && (
            <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-gray-800 font-medium mb-4 flex items-center gap-2">
                📊 Statut des bactéries par échantillon
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="text-sm text-gray-600 mb-3">
                  <strong>Date de référence :</strong> {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span>Pas encore temps (+ de 6h)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Bientôt prêt (- de 6h)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Prêt à lire maintenant</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-red-700 rounded-full animate-pulse"></div>
                    <span>En retard (+ de 2h)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Lecture terminée</span>
                  </div>
                </div>
                
                <BacteriaSelector
                  selectedBacteria={selectedBacteria}
                  onToggle={() => {}} // Mode lecture seule
                  className="opacity-75"
                  showStatus={true}
                  createdAt={samples[0]?.fabrication || new Date().toISOString()}
                />
              </div>
              
              {selectedBacteria.length === 0 && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    Aucune bactérie associée à ces échantillons. Vous devez créer de nouveaux échantillons pour voir les statuts.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reading planning form */}
          {renderReadingPlanningForm()}

          {/* Reading results form for microbiological analysis */}
          {renderReadingResultsForm()}

          <div className="bg-white p-5 rounded-xl border border-gray-200 mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
            {samples.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun échantillon</h3>
                <p className="text-gray-500 max-w-md mb-6">Ajoutez des échantillons pour commencer l'analyse.</p>
                {isCoordinator && !isLocked && (
                  <Button
                    onClick={handleAddSample}
                    className="bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un échantillon
                  </Button>
                )}
              </div>
            ) : (
              <>
                <SamplesTable
                  samples={samples}
                  isGrandFrais={isGrandFrais}
                  GF_PRODUCTS={GF_PRODUCTS}
                  updateSample={(id, updates) => {
                    updateSample(id, updates);
                    return true;
                  }}
                  toggleConformity={(id, field, value) => {
                    toggleConformity(id, field, value);
                    return true;
                  }}
                  isLocked={isLocked}
                  userRole={user?.role || 'guest'}
                  selectedSamples={selectedSamples}
                  onToggleSelectSample={handleToggleSelectSample}
                  onDeleteSample={handleDeleteSampleSync}
                  site={site}
                  brandName={brandName}
                />
              </>
            )}
          </div>

          {samples.length > 0 && isCoordinator && !isLocked && (
            <div className="flex justify-center mb-8">
              <Button
                variant="outline"
                onClick={handleAddSample}
                className="w-full md:w-auto max-w-xs mx-auto border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un échantillon
              </Button>
            </div>
          )}

          {samples.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  <span className="font-medium">{samples.length}</span> échantillon{samples.length > 1 ? 's' : ''} au total
                </div>
                {selectedSamples.length > 0 && (
                  <div>
                    <span className="font-medium">{selectedSamples.length}</span> sélectionné{selectedSamples.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              {/* Affichage des bactéries sélectionnées en petit format */}
              {selectedBacteria.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">Bactéries à analyser :</span>
                    {selectedBacteria.map((bacteriaId) => {
                      const bacteriaNames = {
                        'entero': 'Entérobactéries',
                        'ecoli': 'E. coli',
                        'coliformes': 'Coliformes',
                        'staphylocoques': 'Staphylocoques',
                        'listeria': 'Listeria',
                        'levures3j': 'Lev/Moi (3j)',
                        'flores': 'Flore',
                        'leuconostoc': 'Leuco.',
                        'levures5j': 'Lev/Moi (5j)'
                      };
                      
                      const bacteriaDelays = {
                        'entero': '24h',
                        'ecoli': '24h',
                        'coliformes': '24h',
                        'staphylocoques': '24h',
                        'listeria': '48h',
                        'levures3j': '72h',
                        'flores': '72h',
                        'leuconostoc': '96h',
                        'levures5j': '120h'
                      };
                      
                      return (
                        <Badge 
                          key={bacteriaId} 
                          variant="secondary" 
                          className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          {bacteriaNames[bacteriaId as keyof typeof bacteriaNames]} ({bacteriaDelays[bacteriaId as keyof typeof bacteriaDelays]})
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SampleEntryPage;
