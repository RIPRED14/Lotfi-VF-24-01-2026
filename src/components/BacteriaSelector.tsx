import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useBacteriaCompat, Bacteria } from '@/hooks/useBacteriaCompat';
import { getBacteriaDelay, formatBacteriaDelay, isBacteriaReady, isDemoMode } from '../utils/demoMode';

interface BacteriaSelectorProps {
  selectedBacteria: string[];
  onToggle: (id: string) => void;
  className?: string;
  showStatus?: boolean;
  createdAt?: string;
}

// Fonction pour déterminer le statut d'une bactérie avec support du mode démo
const getBacteriaStatus = (bacteriaName: string, createdAt?: string): 'pending' | 'ready' | 'overdue' | 'completed' => {
  if (!createdAt) return 'pending';
  
  const creationDate = new Date(createdAt);
  
  // Utiliser la fonction du mode démo pour vérifier si la bactérie est prête
  if (isBacteriaReady(bacteriaName, creationDate)) {
    return 'ready';
  } else {
    return 'pending';
  }
};

// Obtenir la couleur selon le statut (version simplifiée pour la page de saisie)
const getSimpleStatusColor = (status: string) => {
  switch (status) {
    case 'pending': 
      return 'bg-gray-400 text-white'; // Gris - pas encore temps
    case 'ready': 
      return 'bg-red-500 text-white'; // Rouge - prêt maintenant
    case 'overdue': 
      return 'bg-red-700 text-white animate-pulse'; // Rouge foncé - en retard
    case 'completed':
      return 'bg-green-500 text-white'; // Vert - terminé
    default: 
      return 'bg-gray-300 text-gray-700';
  }
};

// Obtenir l'icône selon le statut
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return '⏳';
    case 'ready': return '🔴';
    case 'overdue': return '🚨';
    case 'completed': return '✅';
    default: return '🦠';
  }
};

// Obtenir le message de statut détaillé avec support du mode démo
const getStatusMessage = (bacteriaName: string, createdAt?: string) => {
  if (!createdAt) return '';
  
  const status = getBacteriaStatus(bacteriaName, createdAt);
  
  switch (status) {
    case 'pending': 
      return isDemoMode() ? 'En attente (délai démo)' : 'En attente';
    case 'ready': return 'PRÊT MAINTENANT';
    case 'overdue': return 'EN RETARD';
    case 'completed': return 'TERMINÉ';
    default: return '';
  }
};

const BacteriaSelector: React.FC<BacteriaSelectorProps> = ({
  selectedBacteria = [],
  onToggle,
  className = '',
  showStatus = false,
  createdAt
}) => {
  const { bacteria, isLoading, error } = useBacteriaCompat();
  
  const safeBacteria = Array.isArray(selectedBacteria) ? selectedBacteria : [];

  console.log('🦠 BacteriaSelector - État:', {
    selectedBacteria: safeBacteria,
    showStatus,
    bacteriaCount: bacteria.length,
    isLoading,
    error
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-gray-600">Chargement des bactéries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
        Erreur lors du chargement des bactéries: {error}
      </div>
    );
  }

  if (!bacteria || bacteria.length === 0) {
    return (
      <div className="text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
        Aucune bactérie disponible
      </div>
    );
  }

  if (showStatus && createdAt) {
    // Affichage avec statut temporel
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {bacteria.map((bact) => {
          const isSelected = safeBacteria.includes(bact.id);
          const status = getBacteriaStatus(bact.name, createdAt);
          const statusMessage = getStatusMessage(bact.name, createdAt);
          
          return (
            <div
              key={bact.id}
              onClick={() => onToggle(bact.id)}
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'border-blue-500 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm text-gray-800">{bact.name}</div>
                {isSelected && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 mb-3">
                Délai: {formatBacteriaDelay(bact.name)}
              </div>
              
              {/* Badge de statut avec couleur */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getSimpleStatusColor(status)}`}>
                <span>{getStatusIcon(status)}</span>
                <span>
                  {status === 'pending' && 'Pas encore temps'}
                  {status === 'ready' && 'PRÊT MAINTENANT'}
                  {status === 'overdue' && 'EN RETARD'}
                  {status === 'completed' && 'TERMINÉ'}
                </span>
              </div>
              
              {statusMessage && (
                <div className="text-xs text-gray-600 mt-2 font-medium">
                  {statusMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Affichage simple (mode normal)
  return (
    <div className={`flex flex-wrap gap-2 mb-4 ${className}`}>
      {bacteria.map((bact) => (
        <Badge
          key={bact.id}
          variant={safeBacteria.includes(bact.id) ? "default" : "outline"}
          onClick={() => onToggle(bact.id)}
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          data-bacteria-id={bact.id}
          data-selected={safeBacteria.includes(bact.id)}
        >
          {bact.name} ({formatBacteriaDelay(bact.name)})
        </Badge>
      ))}
    </div>
  );
};

export default BacteriaSelector;

// Export des bactéries pour compatibilité avec le code existant
export { useBacteriaCompat };
export type { Bacteria };

// Constante pour la compatibilité (avec délais dynamiques selon le mode démo)
export const BACTERIES: Bacteria[] = [
  { id: "entero", name: "Entérobactéries", delai: formatBacteriaDelay("Entérobactéries") },
  { id: "ecoli", name: "Escherichia coli", delai: formatBacteriaDelay("Escherichia coli") },
  { id: "coliformes", name: "Coliformes totaux", delai: formatBacteriaDelay("Coliformes totaux") },
  { id: "staphylocoques", name: "Staphylocoques", delai: formatBacteriaDelay("Staphylocoques") },
  { id: "listeria", name: "Listeria", delai: formatBacteriaDelay("Listeria") },
  { id: "levures3j", name: "Levures/Moisissures", delai: formatBacteriaDelay("Levures/Moisissures") },
  { id: "flores", name: "Flore totales", delai: formatBacteriaDelay("Flore totales") },
  { id: "leuconostoc", name: "Leuconostoc", delai: formatBacteriaDelay("Leuconostoc") },
  { id: "levures5j", name: "Levures/Moisissures", delai: formatBacteriaDelay("Levures/Moisissures (5j)") },
];