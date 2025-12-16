import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Droplets, Pipette, FlaskConical, Beaker, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BatchNumbersProps {
  waterPeptone: string;
  setWaterPeptone: (value: string) => void;
  petriDishes: string;
  setPetriDishes: (value: string) => void;
  selectedBacteria: string[];
  geloseLots: Record<string, string>;
  setGeloseLots: (lots: Record<string, string>) => void;
}

const GEL_MAPPINGS: Record<string, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  'entero': {
    label: 'Gélose VRBG',
    description: 'Détection des entérobactéries',
    color: 'border-purple-100',
    icon: <Beaker className="w-5 h-5" />,
  },
  'levures3j': {
    label: 'Gélose SYMPHONY',
    description: 'Détection des levures/moisissures (3j)',
    color: 'border-pink-100',
    icon: <Pipette className="w-5 h-5" />,
  },
  'levures5j': {
    label: 'Gélose YGC',
    description: 'Détection des levures/moisissures (5j)',
    color: 'border-amber-100',
    icon: <Pipette className="w-5 h-5" />,
  },
  'coliformes': {
    label: 'Gélose VRBL',
    description: 'Détection des coliformes totaux',
    color: 'border-blue-200',
    icon: <Beaker className="w-5 h-5" />,
  },
  'flores': {
    label: 'Gélose PCA',
    description: 'Détection des flores totales',
    color: 'border-green-200',
    icon: <Beaker className="w-5 h-5" />,
  },
  'staphylocoques': {
    label: 'Gélose EASY STAPH',
    description: 'Détection des staphylocoques',
    color: 'border-yellow-200',
    icon: <Beaker className="w-5 h-5" />,
  },
  'ecoli': {
    label: 'Gélose TBX',
    description: 'Détection des E. coli',
    color: 'border-cyan-200',
    icon: <Beaker className="w-5 h-5" />,
  },
  'leuconostoc': {
    label: 'Gélose MAYEUX, SANDINE et ELLIKER',
    description: 'Détection des leuconostocs',
    color: 'border-gray-200',
    icon: <Beaker className="w-5 h-5" />,
  },
};

const BatchNumbers = ({
  waterPeptone,
  setWaterPeptone,
  petriDishes,
  setPetriDishes,
  selectedBacteria,
  geloseLots,
  setGeloseLots,
}: BatchNumbersProps) => {
  // Déduire les géloses à afficher selon la sélection
  const gelosesToShow = Array.from(new Set(selectedBacteria.map(bac => GEL_MAPPINGS[bac]?.label).filter(Boolean)));

  return (
    <TooltipProvider delayDuration={300}>
      <div className="animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Eau péptonée */}
          <div className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <Label htmlFor="waterPeptone" className="font-medium text-gray-700 block">Eau péptonée</Label>
                <span className="text-xs text-gray-500">Diluant pour échantillons</span>
              </div>
            </div>
            <div className="relative">
              <Input 
                id="waterPeptone" 
                value={waterPeptone} 
                onChange={(e) => setWaterPeptone(e.target.value)} 
                placeholder="Entrez le numéro de lot"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 pl-3 transition-all duration-200"
              />
              {!waterPeptone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ce champ est recommandé</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {/* Boîtes de Pétri */}
          <div className="bg-white rounded-xl p-5 border border-green-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-xl">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <Label htmlFor="petriDishes" className="font-medium text-gray-700 block">Boîtes de Petri</Label>
                <span className="text-xs text-gray-500">Culture de micro-organismes</span>
              </div>
            </div>
            <div className="relative">
              <Input 
                id="petriDishes" 
                value={petriDishes} 
                onChange={(e) => setPetriDishes(e.target.value)} 
                placeholder="Entrez le numéro de lot"
                className="border-gray-300 focus:border-green-500 focus:ring-green-500 pl-3 transition-all duration-200"
              />
              {!petriDishes && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ce champ est recommandé</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {/* Géloses dynamiques selon la sélection */}
          {gelosesToShow.map(label => {
            // Trouver la clé de la bactérie pour ce label
            const bacKey = Object.keys(GEL_MAPPINGS).find(key => GEL_MAPPINGS[key].label === label);
            const mapping = bacKey ? GEL_MAPPINGS[bacKey] : null;
            if (!mapping) return null;
            return (
              <div key={label} className={`bg-white rounded-xl p-5 border ${mapping.color} shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl`}>{mapping.icon}</div>
                  <div>
                    <Label htmlFor={label} className="font-medium text-gray-700 block">{mapping.label}</Label>
                    <span className="text-xs text-gray-500">{mapping.description}</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    id={label}
                    value={geloseLots[label] || ''}
                    onChange={e => setGeloseLots({ ...geloseLots, [label]: e.target.value })}
                    placeholder="Entrez le numéro de lot"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 pl-3 transition-all duration-200"
                  />
                  {!geloseLots[label] && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ce champ est recommandé</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-500 flex items-center justify-center">
          <p>Tous les champs sont facultatifs mais recommandés pour assurer la traçabilité.</p>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BatchNumbers;
