import React from 'react';
import { AlertCircle, CheckCircle, Clock, Database, ClipboardCheck, FileBarChart, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types de statut possibles pour un formulaire microbiologique
export type FormStatus = 
  | 'draft' 
  | 'analyses_en_cours'
  | 'in_progress' 
  | 'waiting_reading' 
  | 'completed' 
  | 'cancelled';

interface FormStatusCardProps {
  formId: string;
  status: FormStatus;
  bacteriaType?: string;
  readingDay?: string;
  sampleCount?: number;
  selectedBacteria?: string[];
  onStatusChange?: (newStatus: FormStatus) => void;
}

const statusConfig = {
  draft: {
    label: 'Brouillon',
    description: 'Le formulaire est en cours de rédaction',
    color: 'bg-gray-100 text-gray-800',
    icon: AlertCircle,
    nextStatus: 'analyses_en_cours' as FormStatus,
    nextLabel: 'Envoyer aux analyses en cours'
  },
  analyses_en_cours: {
    label: 'Analyses en cours',
    description: 'Le formulaire est en cours d\'analyse par un technicien',
    color: 'bg-orange-100 text-orange-800',
    icon: Database,
    nextStatus: 'waiting_reading' as FormStatus,
    nextLabel: 'Envoyer aux lectures en attente'
  },
  in_progress: {
    label: 'En progression',
    description: 'Le formulaire est en cours de traitement',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock,
    nextStatus: 'waiting_reading' as FormStatus,
    nextLabel: 'Planifier la lecture'
  },
  waiting_reading: {
    label: 'Lecture en attente',
    description: 'Le formulaire attend une lecture des résultats',
    color: 'bg-amber-100 text-amber-800',
    icon: Database,
    nextStatus: 'completed' as FormStatus,
    nextLabel: 'Marquer comme lu'
  },
  completed: {
    label: 'Terminé',
    description: 'Toutes les analyses sont terminées',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    nextStatus: null,
    nextLabel: null
  },
  cancelled: {
    label: 'Annulé',
    description: 'Le formulaire a été annulé',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle,
    nextStatus: 'draft' as FormStatus,
    nextLabel: 'Réactiver'
  }
};

const FormStatusCard: React.FC<FormStatusCardProps> = ({ 
  formId, 
  status, 
  bacteriaType,
  readingDay,
  sampleCount = 0,
  selectedBacteria,
  onStatusChange 
}) => {
  const { toast } = useToast();
  const currentStatus = statusConfig[status] || statusConfig.draft;
  
  const handleChangeStatus = async () => {
    if (!currentStatus.nextStatus) return;
    
    try {
      // Mettre à jour le statut dans Supabase
      const { data, error } = await supabase
        .from('samples')
        .update({ status: currentStatus.nextStatus })
        .eq('form_id', formId);
        
      if (error) {
        console.error("Erreur lors de la mise à jour du statut:", error);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le statut du formulaire",
          variant: "destructive"
        });
        return;
      }
      
      // Notification de succès
      toast({
        title: "Statut mis à jour",
        description: `Le formulaire est maintenant en statut "${statusConfig[currentStatus.nextStatus].label}"`,
        duration: 3000
      });
      
      // Appeler le callback
      if (onStatusChange) {
        onStatusChange(currentStatus.nextStatus);
      }
      
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du statut",
        variant: "destructive"
      });
    }
  };
  
  const handleCancelForm = async () => {
    try {
      // Mettre à jour le statut dans Supabase
      const { data, error } = await supabase
        .from('samples')
        .update({ status: 'cancelled' })
        .eq('form_id', formId);
        
      if (error) {
        console.error("Erreur lors de l'annulation du formulaire:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'annuler le formulaire",
          variant: "destructive"
        });
        return;
      }
      
      // Notification de succès
      toast({
        title: "Formulaire annulé",
        description: "Le formulaire a été marqué comme annulé",
        duration: 3000
      });
      
      // Appeler le callback
      if (onStatusChange) {
        onStatusChange('cancelled');
      }
      
    } catch (error) {
      console.error("Erreur lors de l'annulation du formulaire:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'annulation",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <currentStatus.icon className="h-5 w-5" />
          Statut du formulaire
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <Badge className={`self-start ${currentStatus.color} border mb-2`}>
            {currentStatus.label}
          </Badge>
          <p className="text-sm text-gray-600 mb-3">
            {currentStatus.description}
          </p>
          
          {bacteriaType && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <FileBarChart className="h-4 w-4" />
              <span>Type: {bacteriaType}</span>
            </div>
          )}
          
          {readingDay && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Clock className="h-4 w-4" />
              <span>Jour de lecture: {readingDay}</span>
            </div>
          )}
          
          {sampleCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <ClipboardCheck className="h-4 w-4" />
              <span>Échantillons: {sampleCount}</span>
            </div>
          )}
          
          {selectedBacteria && selectedBacteria.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Analyses à effectuer :</h4>
              <div className="flex flex-wrap gap-1">
                {selectedBacteria.map((bacteriaId) => {
                  const bacteriaNames = {
                    'entero': 'Entérobactéries',
                    'ecoli': 'E. coli',
                    'coliformes': 'Coliformes',
                    'staphylocoques': 'Staphylocoques',
                    'listeria': 'Listeria',
                    'levures3j': 'Levures/Moisissures (3j)',
                    'flores': 'Flore totales',
                    'leuconostoc': 'Leuconostoc',
                    'levures5j': 'Levures/Moisissures (5j)'
                  };
                  
                  return (
                    <Badge 
                      key={bacteriaId} 
                      variant="secondary" 
                      className="text-xs bg-blue-100 text-blue-700"
                    >
                      {bacteriaNames[bacteriaId as keyof typeof bacteriaNames] || bacteriaId}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        {currentStatus.nextStatus && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleChangeStatus}
          >
            {currentStatus.nextLabel}
          </Button>
        )}
        
        {status !== 'cancelled' && status !== 'completed' && (
          <Button 
            variant="outline" 
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={handleCancelForm}
          >
            Annuler
          </Button>
        )}
        
        {status === 'cancelled' && (
          <Button 
            variant="outline" 
            className="border-green-300 text-green-600 hover:bg-green-50"
            onClick={() => handleChangeStatus()}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Réactiver
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default FormStatusCard; 