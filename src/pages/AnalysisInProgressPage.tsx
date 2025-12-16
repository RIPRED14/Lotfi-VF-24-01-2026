import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, User, Calendar, ChevronRight, RefreshCw, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnalysisForm {
  form_id: string;
  report_title: string;
  brand: string;
  site: string;
  sample_count: number;
  created_at: string;
  modified_at: string;
  modified_by: string;
  status: string;
}

const AnalysisInProgressPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [analysisforms, setAnalysisForms] = useState<AnalysisForm[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  // Charger les formulaires en cours d'analyse
  const loadAnalysisForms = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Chargement analyses en cours depuis Supabase...');
      
      // 🛡️ Forcer une requête fraîche (pas de cache)
      const { data, error } = await supabase
        .from('samples')
        .select('form_id, report_title, brand, site, created_at, modified_at, modified_by, status')
        .eq('status', 'analyses_en_cours')
        .order('modified_at', { ascending: false });

      if (error) throw error;

      // Récupérer les form_ids uniques
      const formIds = [...new Set(data?.map(s => s.form_id).filter(Boolean) || [])];
      
      // Récupérer les infos depuis sample_forms
      console.log('📅 Récupération des infos depuis sample_forms pour', formIds.length, 'formulaires...');
      const { data: sampleFormsData } = await supabase
        .from('sample_forms')
        .select('report_id, brand_name, site, sample_date')
        .in('report_id', formIds);

      // Créer une map pour accéder rapidement aux infos
      const sampleFormsInfoMap = new Map();
      if (sampleFormsData) {
        sampleFormsData.forEach(form => {
          sampleFormsInfoMap.set(form.report_id, {
            brand: form.brand_name,
            site: form.site,
            sample_date: form.sample_date
          });
        });
      }
      console.log('✅ Infos formulaires récupérées depuis sample_forms:', sampleFormsInfoMap.size);

      // Grouper par form_id et compter les échantillons
      const groupedForms = data?.reduce((acc, sample) => {
        const formId = sample.form_id;
        if (!acc[formId]) {
          // Récupérer les infos depuis sample_forms si disponibles
          const formInfo = sampleFormsInfoMap.get(formId);
          
          acc[formId] = {
            form_id: formId,
            report_title: sample.report_title || `Formulaire ${formId}`,
            brand: sample.brand || formInfo?.brand || 'Non spécifié',
            site: sample.site || formInfo?.site || 'Non spécifié',
            sample_count: 0,
            created_at: sample.created_at,
            modified_at: sample.modified_at,
            modified_by: sample.modified_by,
            status: sample.status
          };
        }
        acc[formId].sample_count++;
        return acc;
      }, {} as Record<string, AnalysisForm>);

      const formsArray = Object.values(groupedForms || {});
      
      // Trier par date de création (du plus récent au plus ancien)
      const sortedForms = formsArray.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Plus récent en premier
      });
      
      console.log('📋 Formulaires trouvés et triés:', sortedForms.length);
      setAnalysisForms(sortedForms);
      
      if (sortedForms.length === 0) {
        console.log('⚠️ Aucun formulaire trouvé avec status=analyses_en_cours');
        toast({
          title: "Aucune analyse en cours",
          description: "Il n'y a actuellement aucun formulaire en attente d'analyse.",
          duration: 3000
        });
      } else {
        console.log('✅ Formulaires chargés avec succès:', formsArray.map(f => f.form_id));
      }

    } catch (error) {
      console.error('Erreur lors du chargement des analyses en cours:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les analyses en cours",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalysisForms();

    // 🎧 Écouter l'événement d'envoi de formulaire
    const handleFormSent = (data: any) => {
      console.log('📥 Réception événement FORM_SENT_TO_ANALYSIS:', data);
      
      // Afficher un feedback visuel
      toast({
        title: "Synchronisation en cours",
        description: "Mise à jour des analyses en cours...",
        duration: 1000
      });
      
      // Rafraîchir avec un petit délai pour laisser le temps à la DB de se synchroniser
      setTimeout(() => {
        console.log('🔄 Rafraîchissement automatique des analyses en cours');
        loadAnalysisForms();
        
        // Confirmation de synchronisation
        toast({
          title: "✅ Synchronisé",
          description: `Nouveau formulaire ajouté (${data.sampleCount} échantillons)`,
          duration: 2000
        });
      }, 500); // Délai de 500ms pour la propagation DB
    };

    // 🔄 Rafraîchir quand l'utilisateur revient sur la page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Page redevenue visible, rafraîchissement...');
        setTimeout(() => loadAnalysisForms(), 200);
      }
    };

    eventBus.on(EVENTS.FORM_SENT_TO_ANALYSIS, handleFormSent);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Nettoyage à la destruction du composant
    return () => {
      eventBus.off(EVENTS.FORM_SENT_TO_ANALYSIS, handleFormSent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Ouvrir un formulaire pour analyse
  const handleOpenForm = (formId: string, reportTitle: string) => {
    navigate('/sample-entry', {
      state: {
        formId: formId,
        isFromHistory: true,
        reportTitle: reportTitle
      }
    });
  };

  // Fonction pour supprimer un formulaire
  const handleDeleteForm = async (formId: string) => {
    try {
      setIsLoading(true);
      console.log('🗑️ Suppression du formulaire:', formId);

      const { error: bacteriaError } = await supabase
        .from('form_bacteria_selections')
        .delete()
        .eq('form_id', formId);

      if (bacteriaError) {
        console.error('Erreur suppression bactéries:', bacteriaError);
        throw bacteriaError;
      }

      const { error: formSamplesError } = await supabase
        .from('form_samples')
        .delete()
        .eq('report_id', formId);

      if (formSamplesError) {
        console.error('Erreur suppression form_samples:', formSamplesError);
        throw formSamplesError;
      }

      const { error: samplesError } = await supabase
        .from('samples')
        .delete()
        .eq('form_id', formId);

      if (samplesError) {
        console.error('Erreur suppression samples:', samplesError);
        throw samplesError;
      }

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

      toast({
        title: "Formulaire supprimé",
        description: "Le formulaire et toutes ses données ont été supprimés avec succès.",
        duration: 4000
      });

      await loadAnalysisForms();
    } catch (error) {
      console.error('Erreur lors de la suppression du formulaire:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le formulaire. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setDeleteFormId(null);
    }
  };

  const confirmDeleteForm = (formId: string) => {
    setDeleteFormId(formId);
    setShowDeleteDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-orange-600" />
                Analyses en cours
              </h1>
              <p className="text-gray-600 mt-2">
                Formulaires d'analyse en attente de traitement par les techniciens
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/quality-control')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button
                variant="outline"
                onClick={loadAnalysisForms}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-300 h-10 w-10"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
          </div>
        ) : analysisforms.length === 0 ? (
          <div className="text-center py-12">
            <div className="rounded-full bg-orange-100 p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-orange-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Aucune analyse en cours
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Tous les formulaires ont été traités ou aucun nouveau formulaire n'est disponible pour analyse.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {analysisforms.map((form) => (
              <Card
                key={form.form_id}
                className="hover:shadow-lg transition-all duration-200 group"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => handleOpenForm(form.form_id, form.report_title)}>
                      <CardTitle className="text-lg font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                        {form.report_title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                          En cours d'analyse
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors cursor-pointer" onClick={() => handleOpenForm(form.form_id, form.report_title)} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteForm(form.form_id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Échantillons</span>
                      <span className="font-medium text-gray-900">{form.sample_count}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Site</span>
                      <span className="font-medium text-gray-900">{form.site}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Marque</span>
                      <span className="font-medium text-gray-900">{form.brand}</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Modifié le {format(new Date(form.modified_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <User className="h-3 w-3" />
                        <span>Par {form.modified_by}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instructions pour le technicien */}
        {analysisforms.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-blue-900 font-medium mb-2">Instructions pour le technicien</h3>
                <div className="text-blue-800 text-sm space-y-1">
                  <p>• Cliquez sur un formulaire pour l'ouvrir et commencer l'analyse</p>
                  <p>• Remplissez les 5 champs obligatoires : odeur, texture, goût, aspect et pH</p>
                  <p>• Ajoutez un commentaire si nécessaire pour documenter l'analyse</p>
                  <p>• Sauvegardez pour envoyer vers les lectures en attente</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default AnalysisInProgressPage; 