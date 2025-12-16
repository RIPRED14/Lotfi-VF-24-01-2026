import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import SampleTableRow from './SampleTableRow';
import { UserRole } from '@/contexts/AuthContext';
import { Sample } from '@/types/samples';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Plus, FlaskConical, Check, Trash2 } from 'lucide-react';
import { useBacteriaSelection } from '@/hooks/useBacteriaSelection';
import BacteriaSelector from './BacteriaSelector';
import DynamicBacteriaColumns from './DynamicBacteriaColumns';

interface SamplesTableProps {
  samples: Sample[];
  isGrandFrais: boolean;
  GF_PRODUCTS: string[];
  updateSample: (id: string, updates: Partial<Sample>) => boolean;
  toggleConformity: (id: string, field: string, value: string) => boolean;
  isLocked?: boolean;
  userRole: UserRole | 'guest';
  selectedSamples?: number[];
  onToggleSelectSample?: (id: number) => void;
  onDeleteSample?: (id: number | string) => boolean;
  site?: string;
  brandName?: string;
}

const SamplesTable: React.FC<SamplesTableProps> = ({
  samples,
  isGrandFrais,
  GF_PRODUCTS,
  updateSample,
  toggleConformity,
  isLocked = false,
  userRole,
  selectedSamples = [],
  onToggleSelectSample,
  onDeleteSample,
  site = 'R1',
  brandName = ''
}) => {
  const isCoordinator = userRole === 'coordinator';
  const isTechnician = userRole === 'technician';
  // ❌ Cases à cocher supprimées - plus de sélection d'échantillons
  const showSelectionColumn = false;

  // Debug pour voir le rôle de l'utilisateur
  console.log('SamplesTable - userRole:', userRole, 'isCoordinator:', isCoordinator, 'isTechnician:', isTechnician);

  // Déterminer le site réel à partir des échantillons ou de la prop
  const actualSite = samples.length > 0 ? samples[0].site : site;
  console.log('SamplesTable - site prop:', site, 'actualSite from samples:', actualSite);

  // Extraire le formId du premier échantillon pour une sélection de bactéries spécifique au formulaire
  const currentFormId = samples.length > 0 ? samples[0].formId : undefined;
  
  // Utiliser notre hook personnalisé pour la gestion des bactéries avec le formId
  const { selectedBacteria, toggleBacteria, removeBacteria } = useBacteriaSelection(currentFormId);

  // ❌ Fonction de sélection globale supprimée

  return (
    <div className="w-full space-y-6">
      {/* Sélecteur de bactéries au-dessus du tableau */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              🦠
            </div>
            Sélection des bactéries à analyser
          </h3>
          <div className="text-sm text-gray-500">
            {selectedBacteria.length} bactérie(s) sélectionnée(s)
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Sélectionnez les bactéries que vous souhaitez analyser. Les couleurs indiquent leur statut selon les délais.
          </p>
          <BacteriaSelector
            selectedBacteria={selectedBacteria}
            onToggle={toggleBacteria}
            className="gap-3"
            showStatus={samples.length > 0 && !!samples[0]?.createdAt}
            createdAt={samples.length > 0 ? samples[0]?.createdAt : undefined}
          />
        </div>

        {selectedBacteria.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-purple-800 mb-2">Bactéries sélectionnées :</h4>
            <div className="flex flex-wrap gap-2">
              {selectedBacteria.map(bacteriaId => {
                const bacteria = selectedBacteria.find(id => id === bacteriaId);
                return (
                  <span key={bacteriaId} className="inline-flex items-center bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                    {bacteriaId}
                    <button
                      onClick={() => removeBacteria(bacteriaId)}
                      className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tableau des échantillons - Style simplifié */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-full">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                {/* Selection column */}
                {showSelectionColumn && (
                  <TableHead className="text-white w-12 bg-blue-600 text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={samples.length > 0 && samples.every(sample => selectedSamples.includes(Number(sample.id)))}
                        onCheckedChange={handleSelectAllSamples}
                        aria-label="Sélectionner tous les échantillons"
                        className="h-4 w-4 border-white text-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                      />
                    </div>
                  </TableHead>
                )}

                {/* Colonnes principales simplifiées */}
                <TableHead className="text-white text-center bg-blue-500 w-20 min-w-[80px]">N° Éch.</TableHead>
                <TableHead className="text-white text-center bg-blue-500 w-24 min-w-[100px]">Site</TableHead>
                <TableHead className="text-white text-center bg-blue-500 w-40 min-w-[160px]">Gamme</TableHead>
                <TableHead className="text-white text-center bg-blue-500 w-28 min-w-[112px]">Produit</TableHead>
                {actualSite === 'BAIKO' && (
                  <TableHead className="text-white text-center bg-blue-500 w-24 min-w-[96px]">Parfum</TableHead>
                )}
                <TableHead className="text-white text-center bg-blue-500 w-20 min-w-[80px]">OF</TableHead>
                <TableHead className="text-white text-center bg-blue-500 w-20 min-w-[80px]">Heure</TableHead>
                <TableHead className="text-white text-center bg-blue-500 w-24 min-w-[96px]">Fabric.</TableHead>
                <TableHead className="text-white text-center bg-blue-500 w-24 min-w-[96px]">DLC</TableHead>
                <TableHead className="text-white text-center bg-blue-500 w-24 min-w-[96px]">AJ/DLC</TableHead>

                {/* Colonnes techniques - condensées */}
                <TableHead className="text-white text-center bg-green-600">Odeur</TableHead>
                <TableHead className="text-white text-center bg-green-600">Texture</TableHead>
                <TableHead className="text-white text-center bg-green-600">Goût</TableHead>
                <TableHead className="text-white text-center bg-green-600">Aspect</TableHead>
                <TableHead className="text-white text-center bg-green-600">pH</TableHead>
                <TableHead className="text-white text-center bg-green-600">Acidité</TableHead>

                {/* Colonnes dynamiques de bactéries */}
                <DynamicBacteriaColumns
                  selectedBacteria={selectedBacteria}
                  removeBacteria={removeBacteria}
                  showHeader={true}
                />

                {/* Colonnes d'actions */}
                {(isCoordinator || isTechnician) && (
                  <>
                    <TableHead className="text-white text-center bg-gray-600">Commentaires</TableHead>
                    <TableHead className="text-white text-center bg-gray-600 w-12">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.length > 0 ? (
                samples.map((sample, index) => (
                  <SampleTableRow
                    key={sample.id}
                    sample={sample}
                    isGrandFrais={isGrandFrais}
                    GF_PRODUCTS={GF_PRODUCTS}
                    updateSample={updateSample}
                    toggleConformity={toggleConformity}
                    isLocked={isLocked}
                    userRole={userRole}
                    isSelected={selectedSamples.includes(Number(sample.id))}
                    onToggleSelect={onToggleSelectSample}
                    showSelectionColumn={showSelectionColumn}
                    onDeleteSample={onDeleteSample}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className="animate-fadeIn"
                    // Passer les données pour les colonnes dynamiques
                    selectedBacteria={selectedBacteria}
                    isTechnician={isTechnician}
                    site={site}
                    brandName={brandName}
                  />
                ))
              ) : (
                <TableRow className="hover:bg-gray-50">
                  <TableHead
                    colSpan={
                      (showSelectionColumn ? 1 : 0) +
                      15 + // colonnes de base simplifiées (9 principales + 6 techniques) - ajout de AJ/DLC
                      selectedBacteria.length + // colonnes de bactéries
                      ((isCoordinator || isTechnician) ? 2 : 0) // colonnes d'actions
                    }
                    className="text-center py-8 text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <div className="rounded-full bg-gray-50 p-4 mb-2 shadow-inner">
                        <div className="rounded-full bg-blue-50 p-6">
                          <FlaskConical className="h-12 w-12 text-blue-500" />
                        </div>
                      </div>
                      <div className="text-center max-w-md space-y-2">
                        <h3 className="text-lg font-medium text-gray-700">Aucun échantillon disponible</h3>
                        <p className="text-sm text-gray-500">
                          {isCoordinator && !isLocked
                            ? "Vous pouvez commencer par ajouter un nouvel échantillon."
                            : "Aucun échantillon n'a été ajouté à ce rapport pour le moment."}
                        </p>
                        {isCoordinator && !isLocked && (
                          <Button
                            onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})}
                            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter un échantillon
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableHead>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {samples.length > 0 && (
          <div className="mt-2 px-4 py-3 flex items-center justify-between text-sm text-gray-600 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                <Check className="w-3 h-3 mr-1" />
                {samples.filter(s => s.status === 'completed').length} complétés
              </span>
              <span className="inline-flex items-center bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                {samples.filter(s => s.status !== 'completed').length} en attente
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Total : {samples.length} échantillon{samples.length > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SamplesTable;
