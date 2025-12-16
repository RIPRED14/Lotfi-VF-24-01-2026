import React from 'react';
import { TableHead, TableCell } from '@/components/ui/table';
import { BACTERIES } from './BacteriaSelector';
import { X } from 'lucide-react';
import { Sample } from '@/types/samples';
import { Input } from '@/components/ui/input';

interface DynamicBacteriaColumnsProps {
  selectedBacteria: string[];
  removeBacteria: (id: string) => void;
  showHeader?: boolean;
  sample?: Sample;
  updateSample?: (id: string, updates: Partial<Sample>) => boolean;
  isTechnician?: boolean;
}

export const DynamicBacteriaColumns: React.FC<DynamicBacteriaColumnsProps> = ({
  selectedBacteria,
  removeBacteria,
  showHeader = false,
  sample,
  updateSample,
  isTechnician = false
}) => {
  // Pour les colonnes d'en-tête
  if (showHeader) {
    return (
      <>
        {selectedBacteria.map(bacteriaId => {
          const bacteria = BACTERIES.find(b => b.id === bacteriaId);
          if (!bacteria) return null;

          return (
            <TableHead
              key={bacteriaId}
              className="text-white py-2 px-2 w-[90px] bg-purple-600 text-white border-r border-purple-500 font-medium text-xs text-center align-middle"
            >
              <div className="flex items-center justify-center">
                <span className="truncate mr-1">{bacteria.name}</span>
                <div
                  onClick={() => removeBacteria(bacteriaId)}
                  className="cursor-pointer hover:bg-purple-700 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </div>
              </div>
              <div className="text-[10px] opacity-75">({bacteria.delai})</div>
            </TableHead>
          );
        })}
      </>
    );
  }

  // Pour les cellules de données
  if (sample && updateSample) {
    return (
      <>
        {selectedBacteria.map(bacteriaId => {
          const bacteria = BACTERIES.find(b => b.id === bacteriaId);
          if (!bacteria) return null;

          // Déterminer quel champ de sample utiliser selon le type de bactérie
          let fieldKey: keyof Sample;
          let fieldValue: string = '';

          switch (bacteriaId) {
            case 'entero':
              fieldKey = 'enterobacteria';
              fieldValue = sample.enterobacteria || '';
              break;
            case 'levures3j':
            case 'levures5j':
              fieldKey = 'yeastMold';
              fieldValue = sample.yeastMold || '';
              break;
            case 'coliformes':
              fieldKey = 'coliforms_count';
              fieldValue = sample.coliforms_count?.toString() || '';
              break;
            case 'staphylocoques':
              fieldKey = 'staphylococcus_count';
              fieldValue = sample.staphylococcus_count?.toString() || '';
              break;
            case 'listeria':
              fieldKey = 'listeria_count';
              fieldValue = sample.listeria_count?.toString() || '';
              break;
            default:
              // Pour les autres bactéries, on peut utiliser un champ dynamique comme:
              fieldKey = `bacteria_${bacteriaId}` as keyof Sample;
              fieldValue = (sample as any)[fieldKey] || '';
          }

          return (
            <TableCell
              key={bacteriaId}
              className="px-1 py-1 bg-purple-50 w-[90px] border-r border-gray-200"
            >
              <Input
                value={fieldValue}
                onChange={(e) => updateSample(sample.id.toString(), { [fieldKey]: e.target.value })}
                className="w-full h-8 text-xs px-2"
                placeholder={bacteria.name}
              />
            </TableCell>
          );
        })}
      </>
    );
  }

  return null;
};

export default DynamicBacteriaColumns;