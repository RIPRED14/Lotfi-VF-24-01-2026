import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell } from '@/components/ui/table';
import { Sample } from '@/types/samples';
import { CalendarIcon } from 'lucide-react';
import EditableCell from '@/components/EditableCell';
import { supabase } from '@/integrations/supabase/client';

// Mapping des IDs de site vers les noms complets
const SITE_MAPPING: Record<string, string> = {
  'R1': 'Laiterie Collet (R1)',
  'R2': 'Végétal Santé (R2)',
  'BAIKO': 'Laiterie Baiko'
};

interface CoordinatorFieldsProps {
  sample: Sample;
  isGrandFrais: boolean;
  GF_PRODUCTS: string[];
  updateSample: (id: string, updates: Partial<Sample>) => boolean;
  isCoordinator: boolean;
  isLocked: boolean;
  isTechnician?: boolean;
  isAirStatic?: boolean;
  site?: string;
}

export const CoordinatorFields: React.FC<CoordinatorFieldsProps> = ({
  sample,
  isGrandFrais,
  GF_PRODUCTS,
  updateSample,
  isCoordinator,
  isLocked,
  isTechnician = false,
  isAirStatic = false,
  site = 'R1',
}) => {
  const [product, setProduct] = useState(sample.product || '');
  const [parfum, setParfum] = useState(sample.parfum || '');
  const [fabrication, setFabrication] = useState(sample.fabrication || '');
  const [dlc, setDlc] = useState(sample.dlc || '');
  const [ajDlc, setAjDlc] = useState(sample.ajDlc || 'DLC');
  const [airStaticLocations, setAirStaticLocations] = useState<any[]>([]);
  
  // Debug pour voir la valeur du site reçue
  useEffect(() => {
    console.log('🔍 DEBUG CoordinatorFields - site reçu:', site);
    console.log('🔍 DEBUG CoordinatorFields - sample.site:', sample.site);
    console.log('🔍 DEBUG CoordinatorFields - isAirStatic:', isAirStatic);
  }, [site, sample.site, isAirStatic]);

  // Utiliser le site de l'échantillon si le site en prop est vide
  const effectiveSite = site || sample.site;
  
  // Fonction pour déterminer quels champs doivent être barrés selon le produit
  const getDisabledFields = (brand: string) => {
    const disabled = {
      dlc: false,
      aj_dlc: false
    };

    switch (brand) {
      case 'Materiel':
      case 'Eaux de rincage':
      case 'Mains':
      case 'Air Statique':
        return {
          dlc: true,
          aj_dlc: true
        };
      default:
        return disabled;
    }
  };
  
  // Séparer les useEffect pour éviter les interférences entre les champs
  useEffect(() => {
    setProduct(sample.product || '');
  }, [sample.product]);

  useEffect(() => {
    setParfum(sample.parfum || '');
  }, [sample.parfum]);

  useEffect(() => {
    setFabrication(sample.fabrication || '');
  }, [sample.fabrication]);

  useEffect(() => {
    setDlc(sample.dlc || '');
  }, [sample.dlc]);

  useEffect(() => {
    setAjDlc(sample.ajDlc || 'DLC');
  }, [sample.ajDlc]);

  // Charger les lieux Air Statique si nécessaire
  useEffect(() => {
    if (isAirStatic) {
      loadAirStaticLocations();
    }
  }, [isAirStatic, effectiveSite]);

  const loadAirStaticLocations = async () => {
    try {
      const fullSiteName = SITE_MAPPING[effectiveSite] || effectiveSite;
      console.log('🔄 Chargement des lieux Air Statique pour le site:', fullSiteName, `(ID: ${effectiveSite})`);
      
      const { data, error } = await supabase
        .from('air_static_locations')
        .select('*')
        .eq('is_active', true)
        // Chercher soit par le nom complet, soit par l'ID court via .in()
        .in('site', [effectiveSite, fullSiteName])
        .order('zone, lieu', { ascending: true });

      if (error) {
        console.error('❌ Erreur chargement lieux Air Statique:', error);
        setAirStaticLocations([]);
      } else {
        console.log(`✅ Lieux Air Statique chargés pour ${effectiveSite}:`, data?.length || 0);
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

  const handleParfumChange = (value: string) => {
    setParfum(value);
    updateSample(sample.id.toString(), { parfum: value });
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

  const handleAjDlcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAjDlc = e.target.value;
    setAjDlc(newAjDlc);
    updateSample(sample.id.toString(), { ajDlc: newAjDlc });
  };

  const handleInputChange = (field: keyof Sample, value: string) => {
    updateSample(sample.id.toString(), { [field]: value });
  };

  // Fonction pour nettoyer et valider la valeur OF
  const getCleanOfValue = (ofValue: string | undefined | null): string => {
    if (!ofValue) return '';
    
    const cleanValue = String(ofValue).trim();
    if (!cleanValue) return '';
    
    // Pour OF, on peut accepter des valeurs numériques
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) {
      console.log('🚫 OF invalide (NaN):', cleanValue);
      return '';
    }
    
    console.log('✅ OF valide:', cleanValue);
    return cleanValue;
  };

  // Fonction pour gérer le changement de OF
  const handleOfChange = (inputValue: string) => {
    console.log('📝 Saisie OF brute:', inputValue);
    
    if (inputValue === '') {
      updateSample(sample.id.toString(), { of_value: '' });
      return;
    }
    
    const cleanValue = getCleanOfValue(inputValue);
    console.log('🧹 Valeur OF nettoyée:', cleanValue);
    
    updateSample(sample.id.toString(), { of_value: cleanValue });
  };

  // Fonction pour formater la date au format jj/mm/aaaa
  const formatDateForDisplay = (isoDate: string) => {
    if (!isoDate) return '';
    
    try {
      // Si la date est déjà au format jj/mm/aaaa, on la renvoie telle quelle
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) return isoDate;

      // Si c'est jj-mm-aaaa, on remplace par /
      if (/^\d{2}-\d{2}-\d{4}$/.test(isoDate)) return isoDate.replace(/-/g, '/');
      
      // Conversion de aaaa-mm-jj à jj/mm/aaaa
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return isoDate;
    } catch (e) {
      return isoDate;
    }
  };

  // Fonction pour convertir jj/mm/aaaa (ou jj-mm-aaaa) en aaaa-mm-jj (format ISO)
  const formatDateForStorage = (displayDate: string) => {
    if (!displayDate) return '';
    
    try {
      // Si la date est déjà au format aaaa-mm-jj, on la renvoie telle quelle
      if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return displayDate;
      
      // Conversion de jj/mm/aaaa ou jj-mm-aaaa à aaaa-mm-jj
      // Utilise une regex pour splitter sur / ou -
      const parts = displayDate.split(/[/-]/);
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return displayDate;
    } catch (e) {
      return displayDate;
    }
  };

  // Logique de permissions améliorée
  const canEdit = () => {
    // Si le statut est "waiting_reading", personne ne peut modifier (lecture en attente)
    if (sample.status === 'waiting_reading') {
      return false;
    }
    
    // Si le formulaire est verrouillé, personne ne peut modifier
    if (isLocked) {
      return false;
    }
    
    // Si c'est un coordinateur, il peut toujours modifier (sauf si waiting_reading)
    if (isCoordinator) {
      return true;
    }
    
    // Si c'est un technicien ET que le statut est "analyses_en_cours", il peut modifier les colonnes bleues
    if (isTechnician && sample.status === 'analyses_en_cours') {
      return true;
    }
    
    // Sinon, pas d'autorisation
    return false;
  };

  // Logique spécifique pour la colonne Produit
  const canEditProduct = () => {
    // Si le statut est "waiting_reading", personne ne peut modifier
    if (sample.status === 'waiting_reading') {
      return false;
    }
    
    // Si le formulaire est verrouillé, personne ne peut modifier
    if (isLocked) {
      return false;
    }
    
    // Si le statut est "analyses_en_cours", seul le coordinateur peut modifier le produit
    if (sample.status === 'analyses_en_cours') {
      return isCoordinator;
    }
    
    // Si c'est un coordinateur, il peut modifier le produit
    if (isCoordinator) {
      return true;
    }
    
    // Sinon, pas d'autorisation
    return false;
  };

  const isEditable = canEdit();
  const disabledFields = getDisabledFields(sample.brand || '');

  return (
    <>
      <TableCell className="px-1 py-1 border-r border-gray-200 bg-blue-50 w-[180px]">
        {isAirStatic ? (
          <Select 
            value={product} 
            onValueChange={handleProductChange}
            disabled={!canEditProduct()}
          >
            <SelectTrigger className="h-8 text-xs px-2 min-h-0 truncate" title={product}>
              <SelectValue placeholder="Choisir un lieu" className="truncate" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {/* Zone Blanche */}
              {airStaticLocations.filter(loc => loc.zone === 'Blanche').length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50">⚪ Zone Blanche</div>
                  {airStaticLocations.filter(loc => loc.zone === 'Blanche').map((location) => (
                    <SelectItem key={location.id} value={location.lieu} className="text-xs pl-4" title={location.lieu}>
                      {location.lieu} ({location.volume_prelevement}L, {location.comparison_operator} {location.limite_max})
                    </SelectItem>
                  ))}
                </>
              )}
              
              {/* Zone Propre */}
              {airStaticLocations.filter(loc => loc.zone === 'Propre').length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-50 mt-1">🟢 Zone Propre</div>
                  {airStaticLocations.filter(loc => loc.zone === 'Propre').map((location) => (
                    <SelectItem key={location.id} value={location.lieu} className="text-xs pl-4" title={location.lieu}>
                      {location.lieu} ({location.volume_prelevement}L, {location.comparison_operator} {location.limite_max})
                    </SelectItem>
                  ))}
                </>
              )}
              
              {/* Zone Grise */}
              {airStaticLocations.filter(loc => loc.zone === 'Grise').length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50 mt-1">🔘 Zone Grise</div>
                  {airStaticLocations.filter(loc => loc.zone === 'Grise').map((location) => (
                    <SelectItem key={location.id} value={location.lieu} className="text-xs pl-4" title={location.lieu}>
                      {location.lieu} ({location.volume_prelevement}L, {location.comparison_operator} {location.limite_max})
                    </SelectItem>
                  ))}
                </>
              )}
              
              {/* Message si aucun lieu trouvé */}
              {airStaticLocations.length === 0 && (
                <div className="px-2 py-1 text-xs text-gray-500 italic">
                  Aucun lieu Air Statique trouvé pour le site {site}
                </div>
              )}
            </SelectContent>
          </Select>
        ) : (
          <EditableCell
            value={product}
            onSave={(value) => handleProductChange(value)}
            canEdit={canEditProduct()}
            placeholder="TYPE PRODUIT (EN MAJUSCULES)"
            textClassName="truncate uppercase"
            inputClassName="truncate uppercase"
            className="h-8"
            forceUppercase={true}
          />
        )}
      </TableCell>

      {/* Colonne Parfum - Visible uniquement pour BAIKO */}
      {effectiveSite === 'BAIKO' && (
        <TableCell className="px-1 py-1 bg-blue-50 w-[90px] border-r border-gray-200">
          <Input
            value={parfum}
            onChange={(e) => handleParfumChange(e.target.value)}
            className="w-full h-8 text-xs px-2 text-center"
            type="text"
            placeholder="Parfum"
            title="Parfum (BAIKO uniquement)"
            readOnly={!isEditable}
            disabled={!isEditable}
          />
        </TableCell>
      )}

      {/* Colonne OF - Déplacée ici avec style bleu */}
      <TableCell className="px-1 py-1 bg-blue-50 w-[75px] border-r border-gray-200">
        <Input
          value={getCleanOfValue(sample.of_value)}
          onChange={(e) => handleOfChange(e.target.value)}
          className="w-full h-8 text-xs px-2 text-center"
          type="text"
          placeholder="000"
          title="OF"
          readOnly={!isEditable}
          disabled={!isEditable}
        />
      </TableCell>

      {/* Colonne Heure */}
      <TableCell className="p-0 border-r border-gray-200 bg-blue-50 w-[80px] text-center">
        <EditableCell
          value={sample.readyTime || ''}
          onSave={(value) => updateSample(sample.id.toString(), { readyTime: value })}
          canEdit={isEditable}
          placeholder="HH:MM"
        />
      </TableCell>

      {/* Colonne Fabrication */}
      <TableCell className="p-0 border-r border-gray-200 bg-blue-50 w-[100px] text-center">
        <EditableCell
          value={formatDateForDisplay(fabrication)}
          onSave={(value) => updateSample(sample.id.toString(), { fabrication: formatDateForStorage(value) })}
          canEdit={isEditable}
          placeholder="jj/mm/aaaa"
          className="h-8"
        />
      </TableCell>

      {/* Colonne DLC */}
      <TableCell className={`p-0 border-r border-gray-200 bg-blue-50 w-[100px] text-center ${disabledFields.dlc ? 'bg-gray-200 opacity-50' : ''}`}>
        {disabledFields.dlc ? (
          <div className="w-full h-8 bg-gray-200 opacity-50 rounded flex items-center justify-center">
            <span className="line-through text-gray-500 text-xs">-</span>
          </div>
        ) : (
          <EditableCell
            value={formatDateForDisplay(dlc)}
            onSave={(value) => updateSample(sample.id.toString(), { dlc: formatDateForStorage(value) })}
            canEdit={isEditable}
            placeholder="jj/mm/aaaa"
            className="h-8"
          />
        )}
      </TableCell>

      {/* Colonne AJ/DLC */}
      <TableCell className={`p-0 border-r border-gray-200 bg-blue-50 w-[100px] text-center ${disabledFields.aj_dlc ? 'bg-gray-200 opacity-50' : ''}`}>
        {disabledFields.aj_dlc ? (
          <div className="w-full h-8 bg-gray-200 opacity-50 rounded flex items-center justify-center">
            <span className="line-through text-gray-500 text-xs">-</span>
          </div>
        ) : (
          <div className="flex items-center h-8">
            <button
              onClick={() => {
                const newValue = ajDlc === 'DLC' ? 'AJ' : 'DLC';
                setAjDlc(newValue);
                updateSample(sample.id.toString(), { ajDlc: newValue });
              }}
              disabled={!isEditable}
              className={`
                flex-1 h-full text-xs font-bold transition-all duration-200
                ${ajDlc === 'DLC' 
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 border border-blue-300' 
                  : ajDlc === 'AJ' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }
                ${!isEditable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                rounded-sm
              `}
              title={isEditable ? "Cliquer pour basculer entre DLC et AJ" : "Non modifiable"}
            >
              {ajDlc || 'DLC'}
            </button>
          </div>
        )}
      </TableCell>
    </>
  );
};
