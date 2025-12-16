import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell } from '@/components/ui/table';
import { Sample } from '@/types/samples';
import { CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CoordinatorFieldsProps {
  sample: Sample;
  isGrandFrais: boolean;
  GF_PRODUCTS: string[];
  updateSample: (id: string, updates: Partial<Sample>) => boolean;
  isCoordinator: boolean;
  isLocked: boolean;
  isAirStatic?: boolean; // Nouveau prop pour détecter Air Statique
}

export const CoordinatorFields: React.FC<CoordinatorFieldsProps> = ({
  sample,
  isGrandFrais,
  GF_PRODUCTS,
  updateSample,
  isCoordinator,
  isLocked,
  isAirStatic = false,
}) => {
  const [product, setProduct] = useState(sample.product || '');
  const [fabrication, setFabrication] = useState(sample.fabrication || '');
  const [dlc, setDlc] = useState(sample.dlc || '');
  const [airStaticLocations, setAirStaticLocations] = useState<any[]>([]);
  
  useEffect(() => {
    setProduct(sample.product || '');
    setFabrication(sample.fabrication || '');
    setDlc(sample.dlc || '');
  }, [sample.product, sample.fabrication, sample.dlc]);

  // Charger les lieux Air Statique si nécessaire
  useEffect(() => {
    if (isAirStatic) {
      loadAirStaticLocations();
    }
  }, [isAirStatic]);

  const loadAirStaticLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('air_static_locations')
        .select('*')
        .eq('is_active', true)
        .order('zone, lieu', { ascending: true });

      if (error) {
        console.error('❌ Erreur chargement lieux Air Statique:', error);
        setAirStaticLocations([]);
      } else {
        console.log('✅ Lieux Air Statique chargés:', data?.length || 0);
        setAirStaticLocations(data || []);
      }
    } catch (error) {
      console.error('💥 Erreur générale:', error);
      setAirStaticLocations([]);
    }
  };

  const handleProductChange = (value: string) => {
    setProduct(value);
    updateSample(sample.id.toString(), { product: value });
  };

  // Nouvelle fonction pour gérer la saisie du produit avec validation majuscules
  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Convertir automatiquement en majuscules
    const upperCaseValue = inputValue.toUpperCase();
    
    // Mettre à jour l'état local et la base de données
    setProduct(upperCaseValue);
    updateSample(sample.id.toString(), { product: upperCaseValue });
  };

  const handleFabricationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFabrication = e.target.value;
    setFabrication(newFabrication);
    updateSample(sample.id.toString(), { fabrication: newFabrication });
  };
  
  const handleDlcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDlc = e.target.value;
    setDlc(newDlc);
    updateSample(sample.id.toString(), { dlc: newDlc });
  };

  const handleInputChange = (field: keyof Sample, value: string) => {
    updateSample(sample.id.toString(), { [field]: value });
  };

  return (
    <>
      <TableCell className="px-1 py-1 border-r border-gray-200 bg-blue-50 w-[180px]">
        {isGrandFrais ? (
          <Select 
            value={product} 
            onValueChange={handleProductChange}
            disabled={!isCoordinator || isLocked}
          >
            <SelectTrigger className="h-8 text-xs px-2 min-h-0 truncate" title={product}>
              <SelectValue placeholder="Gamme" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {GF_PRODUCTS.map((prod) => (
                <SelectItem key={prod} value={prod} className="text-xs" title={prod}>
                  {prod}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : isAirStatic ? (
          <Select 
            value={product} 
            onValueChange={handleProductChange}
            disabled={!isCoordinator || isLocked}
          >
            <SelectTrigger className="h-8 text-xs px-2 min-h-0 truncate" title={product}>
              <SelectValue placeholder="Choisir un lieu" className="truncate" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {/* Zone Blanche */}
              <div className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50">⚪ Zone Blanche</div>
              {airStaticLocations.filter(loc => loc.zone === 'Blanche').map((location) => (
                <SelectItem key={location.id} value={location.lieu} className="text-xs pl-4" title={location.lieu}>
                  {location.lieu} ({location.volume_prelevement}L, {location.comparison_operator} {location.limite_max})
                </SelectItem>
              ))}
              
              {/* Zone Propre */}
              <div className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-50 mt-1">🟢 Zone Propre</div>
              {airStaticLocations.filter(loc => loc.zone === 'Propre').map((location) => (
                <SelectItem key={location.id} value={location.lieu} className="text-xs pl-4" title={location.lieu}>
                  {location.lieu} ({location.volume_prelevement}L, {location.comparison_operator} {location.limite_max})
                </SelectItem>
              ))}
              
              {/* Zone Grise */}
              <div className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50 mt-1">🔘 Zone Grise</div>
              {airStaticLocations.filter(loc => loc.zone === 'Grise').map((location) => (
                <SelectItem key={location.id} value={location.lieu} className="text-xs pl-4" title={location.lieu}>
                  {location.lieu} ({location.volume_prelevement}L, {location.comparison_operator} {location.limite_max})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input 
            value={product} 
            onChange={handleProductInputChange} 
            className="w-full h-8 text-xs px-2 truncate uppercase"
            placeholder="PRODUIT (EN MAJUSCULES)"
            readOnly={!isCoordinator || isLocked}
            disabled={!isCoordinator || isLocked}
            title={product}
          />
        )}
      </TableCell>
      <TableCell className="px-1 py-1 border-r border-gray-200 bg-blue-50 w-[80px] align-middle">
        <div className="flex items-center justify-center h-full">
          <Input
            type="time"
            value={sample.readyTime || ''}
            onChange={(e) => handleInputChange('readyTime', e.target.value)}
            className="h-8 text-xs px-2 text-center w-full"
            readOnly={!isCoordinator || isLocked}
            disabled={!isCoordinator || isLocked}
          />
        </div>
      </TableCell>
      <TableCell className="px-1 py-1 border-r border-gray-200 bg-blue-50 w-[100px] align-middle">
        <div className="flex items-center justify-center h-full whitespace-nowrap">
          <Input
            type="date"
            value={fabrication}
            onChange={handleFabricationChange}
            className="h-8 text-xs text-center w-full"
            style={{ fontSize: '10px' }}
            readOnly={!isCoordinator || isLocked}
            disabled={!isCoordinator || isLocked}
          />
        </div>
      </TableCell>
      <TableCell className="px-1 py-1 border-r border-gray-200 bg-blue-50 w-[100px] align-middle">
        <div className="flex items-center justify-center h-full whitespace-nowrap">
          <Input
            type="date"
            value={dlc}
            onChange={handleDlcChange}
            className="h-8 text-xs text-center w-full"
            style={{ fontSize: '10px' }}
            readOnly={!isCoordinator || isLocked}
            disabled={!isCoordinator || isLocked}
          />
        </div>
      </TableCell>
    </>
  );
}; 