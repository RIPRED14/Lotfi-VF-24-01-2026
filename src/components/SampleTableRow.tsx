import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { UserRole } from '@/contexts/AuthContext';
import { Sample } from '@/types/samples';
import { useSampleAlertStatus } from '@/hooks/useSampleAlertStatus';
import { CoordinatorFields } from './sample-table/CoordinatorFields';
import { TechnicianFields } from './sample-table/TechnicianFields';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2 } from 'lucide-react';
import DynamicBacteriaColumns from './DynamicBacteriaColumns';

interface SampleTableRowProps {
  sample: Sample;
  isGrandFrais: boolean;
  GF_PRODUCTS: string[];
  updateSample: (id: string, updates: Partial<Sample>) => boolean;
  toggleConformity: (id: string, field: string, value: string) => boolean;
  isLocked: boolean;
  userRole: UserRole | 'guest';
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDeleteSample?: (id: number | string) => boolean;
  showSelectionColumn?: boolean;
  style?: React.CSSProperties;
  className?: string;
  selectedBacteria?: string[];
  isTechnician?: boolean;
  site?: string;
  brandName?: string;
}

const SampleTableRow: React.FC<SampleTableRowProps> = ({
  sample,
  isGrandFrais,
  GF_PRODUCTS,
  updateSample,
  toggleConformity,
  isLocked,
  userRole,
  isSelected = false,
  onToggleSelect,
  onDeleteSample,
  showSelectionColumn = false,
  style,
  className = '',
  selectedBacteria = [],
  isTechnician = false,
  site = 'R1',
  brandName = ''
}) => {
  const isCoordinator = userRole === 'coordinator';
  const alertStatus = useSampleAlertStatus(sample);
  const rowClassName = alertStatus === 'urgent' ? 'bg-red-50' : 
                      alertStatus === 'warning' ? 'bg-yellow-50' : '';
  const [comment, setComment] = useState(sample.labComment || '');

  // Synchroniser l'état local avec les changements de sample.labComment
  useEffect(() => {
    setComment(sample.labComment || '');
  }, [sample.labComment]);

  const handleToggleSelect = () => {
    if (onToggleSelect) {
      onToggleSelect(Number(sample.id));
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newComment = e.target.value;
    setComment(newComment);
    updateSample(sample.id.toString(), { labComment: newComment });
  };

  const handleDelete = () => {
    if (!isCoordinator || isLocked) {
      console.log('Suppression impossible:', { isCoordinator, isLocked });
      return;
    }
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet échantillon ?')) {
      try {
        console.log('Tentative de suppression de l\'échantillon:', {
          id: sample.id,
          type: typeof sample.id,
          number: sample.number
        });
        
        if (onDeleteSample) {
          const success = onDeleteSample(sample.id as number | string);
          console.log('Résultat de la suppression:', success);
        } else {
          console.error('Fonction onDeleteSample non définie');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  return (
    <TableRow 
      style={style}
      className={`border-t border-gray-200 hover:bg-gray-50 transition-all duration-150 ${
        isSelected ? 'bg-blue-50' : ''
      } ${rowClassName} ${className}`}
    >
      {showSelectionColumn && (
        <TableCell className="text-center py-2">
          <div className="flex items-center justify-center">
            <Checkbox 
              checked={isSelected}
              onCheckedChange={handleToggleSelect}
              aria-label={`Sélectionner l'échantillon ${sample.number}`}
              className="h-4 w-4 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            />
          </div>
        </TableCell>
      )}
      
      {/* Numéro d'échantillon */}
      <TableCell className="text-center py-2 font-medium text-gray-800 bg-blue-50">
        <Input 
          value={sample.number} 
          onChange={(e) => updateSample(sample.id.toString(), { number: e.target.value })} 
          className="w-full h-8 text-xs font-medium text-center"
          readOnly={sample.status === 'waiting_reading' || (!isCoordinator && !(isTechnician && sample.status === 'analyses_en_cours')) || isLocked}
          disabled={sample.status === 'waiting_reading' || (!isCoordinator && !(isTechnician && sample.status === 'analyses_en_cours')) || isLocked}
        />
      </TableCell>

      {/* Site */}
      <TableCell className="text-center py-2 font-medium text-gray-800 bg-blue-50">
        <Input 
          value={sample.site || site} 
          onChange={(e) => updateSample(sample.id.toString(), { site: e.target.value })} 
          className="w-full h-8 text-xs font-medium text-center"
          readOnly={sample.status === 'waiting_reading' || (!isCoordinator && !(isTechnician && sample.status === 'analyses_en_cours')) || isLocked}
          disabled={sample.status === 'waiting_reading' || (!isCoordinator && !(isTechnician && sample.status === 'analyses_en_cours')) || isLocked}
        />
      </TableCell>

      {/* Produit */}
      <TableCell className="text-center py-2 font-medium text-gray-800 bg-blue-50">
        <Input 
          value={sample.brand || brandName || ''} 
          className="w-full h-8 text-xs font-medium text-center bg-gray-50"
          readOnly={true}
          disabled={true}
          title={sample.brand || brandName || ''}
        />
      </TableCell>
      
      {/* Autres colonnes de demandeur */}
      <CoordinatorFields
        sample={sample}
        isGrandFrais={isGrandFrais}
        GF_PRODUCTS={GF_PRODUCTS}
        updateSample={updateSample}
        isCoordinator={isCoordinator}
        isLocked={isLocked}
        isTechnician={isTechnician}
        isAirStatic={sample.brand === 'Air Statique'}
        site={site}
      />
      
      {/* Colonnes de technicien - sensorielles et pH */}
      <TechnicianFields
        sample={sample}
        toggleConformity={toggleConformity}
        updateSample={updateSample}
        isTechnician={isTechnician}
        alertStatus={alertStatus}
        site={site}
      />
      
      {/* Colonnes dynamiques de bactéries */}
      {selectedBacteria && selectedBacteria.length > 0 && (
        <DynamicBacteriaColumns
          selectedBacteria={selectedBacteria}
          removeBacteria={() => {}}  // On ne peut pas supprimer de cette rangée
          sample={sample}
          updateSample={updateSample}
          isTechnician={isTechnician}
        />
      )}
      
      {/* Colonne de commentaire */}
      {(isCoordinator || isTechnician) && (
     <>
       <TableCell className="text-center py-2">
         <div className="relative">
           <MessageSquare className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
           <Input
             value={comment}
             onChange={handleCommentChange}
             placeholder="Commentaire..."
             className="pl-6 text-xs h-8 bg-gray-50 hover:bg-white focus:bg-white transition-colors"
             disabled={false}
           />
         </div>
       </TableCell>
       <TableCell className="text-center py-2">
         <div className="flex justify-center">
           <Button
             variant="ghost"
             size="icon"
             onClick={handleDelete}
             className="w-7 h-7 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
             title="Supprimer l'échantillon"
             disabled={isLocked || !isCoordinator}
           >
             <Trash2 className="h-4 w-4" />
           </Button>
         </div>
       </TableCell>
     </>
   )}
    </TableRow>
  );
};

export default SampleTableRow;
