import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell } from '@/components/ui/table';
import { Check, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { Sample } from '@/types/samples';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TechnicianFieldsProps {
  sample: Sample;
  toggleConformity: (id: string, field: string, value: string) => boolean;
  updateSample: (id: string, updates: Partial<Sample>) => boolean;
  isTechnician: boolean;
  alertStatus: string | null;
  site?: string;
}

export const TechnicianFields: React.FC<TechnicianFieldsProps> = ({
  sample,
  toggleConformity,
  updateSample,
  isTechnician,
  alertStatus,
  site
}) => {
  // Debug pour voir la valeur de isTechnician
  console.log('TechnicianFields - isTechnician:', isTechnician, 'sample:', sample.id);
  
  // Fonction pour déterminer quels champs doivent être barrés selon le produit
  const getDisabledFields = (brand: string, site?: string) => {
    const disabled = {
      smell: false,
      texture: false,
      taste: false,
      aspect: false,
      ph: false,
      acidity: false
    };

    // Pour le site BAIKO, permettre l'édition des colonnes organoleptiques
    if (site === 'BAIKO') {
      return {
        smell: false,    // Débloqué pour BAIKO
        texture: false,  // Débloqué pour BAIKO
        taste: false,    // Débloqué pour BAIKO
        aspect: false,   // Débloqué pour BAIKO
        ph: false,
        acidity: false
      };
    }

    switch (brand) {
      case 'Materiel':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: true,
          ph: true,
          acidity: true
        };
      case 'Eaux de rincage':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: false, // Pas mentionné dans la demande
          ph: false,     // Pas mentionné dans la demande
          acidity: true
        };
      case 'Mains':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: true,
          ph: true,
          acidity: true
        };
      case 'Air Statique':
        return {
          smell: true,
          texture: true,
          taste: true,
          aspect: true,
          ph: true,
          acidity: true
        };
      default:
        return disabled;
    }
  };
  
  // Logique de permissions pour les colonnes vertes (technicien)
  const canEditGreenColumns = () => {
    // Si le statut est "waiting_reading", personne ne peut modifier (lecture en attente)
    if (sample.status === 'waiting_reading') {
      return false;
    }
    
    // Pour le site BAIKO, permettre l'édition par les coordinateurs aussi
    const effectiveSite = site || sample.site;
    if (effectiveSite === 'BAIKO') {
      // Les coordinateurs peuvent modifier les colonnes organoleptiques sur BAIKO
      return (sample.status === 'analyses_en_cours' || sample.status === 'draft' || sample.status === 'pending' || !sample.status);
    }
    
    // Pour les autres sites, seuls les techniciens peuvent modifier (quand statut = analyses_en_cours ou draft)
    return isTechnician && (sample.status === 'analyses_en_cours' || sample.status === 'draft' || !sample.status);
  };

  const isGreenEditable = canEditGreenColumns();
  const effectiveSite = site || sample.site;
  const disabledFields = getDisabledFields(sample.brand || '', effectiveSite);
  
  const renderConformityButton = (field: 'smell' | 'texture' | 'taste' | 'aspect') => {
    const currentValue = sample[field] || 'NA';
    
    // Cycle à 3 états : C → N → NA → C
    let nextValue: string;
    if (currentValue === 'C') {
      nextValue = 'N';
    } else if (currentValue === 'N') {
      nextValue = 'NA';
    } else {
      nextValue = 'C';
    }
    
    const isFieldDisabled = disabledFields[field];
    const effectiveSite = site || sample.site;
    
    // Pour BAIKO, permettre l'édition même si l'utilisateur n'est pas technicien
    const canEditThisField = effectiveSite === 'BAIKO' ? 
      !isFieldDisabled && (sample.status === 'analyses_en_cours' || sample.status === 'draft' || sample.status === 'pending' || !sample.status) :
      isGreenEditable && !isFieldDisabled;


    // Si le champ est désactivé pour ce produit, afficher comme barré
    if (isFieldDisabled) {
      return (
        <div className="w-full h-8 bg-gray-200 opacity-50 rounded flex items-center justify-center">
          <span className="line-through text-gray-500 text-xs">-</span>
        </div>
      );
    }

    // Déterminer la couleur et l'icône selon la valeur
    let buttonColor = 'bg-gray-400 hover:bg-gray-500';
    let icon = null;
    
    if (currentValue === 'C') {
      buttonColor = 'bg-green-500 hover:bg-green-600';
      icon = <Check className="w-3 h-3 mr-1" />;
    } else if (currentValue === 'N') {
      buttonColor = 'bg-red-500 hover:bg-red-600';
      icon = <X className="w-3 h-3 mr-1" />;
    } else {
      buttonColor = 'bg-gray-400 hover:bg-gray-500';
      icon = <span className="mr-1">-</span>;
    }

    return (
      <Button
        onClick={() => {
          if (!canEditThisField) return; // Empêcher le clic si non éditable
          console.log(`Clic sur ${field}: ${currentValue} -> ${nextValue}`);
          toggleConformity(sample.id.toString(), field, nextValue);
        }}
        className={`w-full h-8 ${buttonColor} text-white p-0`}
        disabled={!canEditThisField} // Désactiver le bouton si non éditable
      >
        {icon}
        <span className="text-xs">{currentValue}</span>
      </Button>
    );
  };

  // Fonction pour nettoyer et valider la valeur pH
  const getCleanPhValue = (phValue: string | undefined | null): string => {
    if (!phValue) return '';
    
    // Convertir en string et trimmer
    const cleanValue = String(phValue).trim();
    
    // Si vide après trim, retourner vide
    if (!cleanValue) return '';
    
    // Si c'est juste une lettre (comme "p"), retourner vide
    if (cleanValue.length === 1 && /^[a-zA-Z]$/.test(cleanValue)) {
      console.log('🚫 pH invalide (lettre seule):', cleanValue);
      return '';
    }
    
    // Si ça contient seulement des lettres (pas de chiffres), retourner vide
    if (/^[a-zA-Z]+$/.test(cleanValue)) {
      console.log('🚫 pH invalide (lettres uniquement):', cleanValue);
      return '';
    }
    
    // Essayer de parser comme nombre
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) {
      console.log('🚫 pH invalide (NaN):', cleanValue);
      return '';
    }
    
    // Vérifier que c'est dans une plage raisonnable pour le pH (0-14)
    if (numValue < 0 || numValue > 14) {
      console.log('🚫 pH invalide (hors plage):', cleanValue);
      return '';
    }
    
    // Retourner la valeur d'origine si elle est valide
    console.log('✅ pH valide:', cleanValue);
    return cleanValue;
  };

  // Fonction pour gérer le changement de pH
  const handlePhChange = (inputValue: string) => {
    console.log('📝 Saisie pH brute:', inputValue);
    
    // Si l'utilisateur efface tout, permettre le champ vide
    if (inputValue === '') {
      updateSample(sample.id.toString(), { ph: '' });
      return;
    }
    
    // Nettoyer et valider la valeur
    const cleanValue = getCleanPhValue(inputValue);
    console.log('🧹 Valeur pH nettoyée:', cleanValue);
    
    // Toujours sauvegarder la valeur nettoyée (même si vide)
    updateSample(sample.id.toString(), { ph: cleanValue });
  };

  // Fonction pour nettoyer et valider la valeur Acidité
  const getCleanAcidityValue = (acidityValue: string | undefined | null): string => {
    if (!acidityValue) return '';
    
    const cleanValue = String(acidityValue).trim();
    if (!cleanValue) return '';
    
    // Pour acidité, on peut accepter des valeurs numériques décimales
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) {
      console.log('🚫 Acidité invalide (NaN):', cleanValue);
      return '';
    }
    
    console.log('✅ Acidité valide:', cleanValue);
    return cleanValue;
  };

  // Fonction pour gérer le changement d'acidité
  const handleAcidityChange = (inputValue: string) => {
    console.log('📝 Saisie Acidité brute:', inputValue);
    
    if (inputValue === '') {
      updateSample(sample.id.toString(), { acidity: '' });
      return;
    }
    
    const cleanValue = getCleanAcidityValue(inputValue);
    console.log('🧹 Valeur Acidité nettoyée:', cleanValue);
    
    updateSample(sample.id.toString(), { acidity: cleanValue });
  };


  return (
    <>
      <TableCell className="px-1 py-1 bg-green-50 w-[70px] border-r border-gray-200">{renderConformityButton('smell')}</TableCell>
      <TableCell className="px-1 py-1 bg-green-50 w-[70px] border-r border-gray-200">{renderConformityButton('texture')}</TableCell>
      <TableCell className="px-1 py-1 bg-green-50 w-[70px] border-r border-gray-200">{renderConformityButton('taste')}</TableCell>
      <TableCell className="px-1 py-1 bg-green-50 w-[70px] border-r border-gray-200">{renderConformityButton('aspect')}</TableCell>
      <TableCell className={`px-1 py-1 bg-green-50 w-[75px] border-r border-gray-200 ${disabledFields.ph ? 'bg-gray-200 opacity-50' : ''}`}>
        {disabledFields.ph ? (
          <div className="w-full h-8 bg-gray-200 opacity-50 rounded flex items-center justify-center">
            <span className="line-through text-gray-500 text-xs">-</span>
          </div>
        ) : (
          <Input
            value={getCleanPhValue(sample.ph)}
            onChange={(e) => handlePhChange(e.target.value)}
            className="w-full h-8 text-xs px-2"
            type="text"
            placeholder="pH"
            title="pH"
            disabled={!isGreenEditable}
            readOnly={!isGreenEditable}
          />
        )}
      </TableCell>
      <TableCell className={`px-1 py-1 bg-green-50 w-[75px] border-r border-gray-200 ${disabledFields.acidity ? 'bg-gray-200 opacity-50' : ''}`}>
        {disabledFields.acidity ? (
          <div className="w-full h-8 bg-gray-200 opacity-50 rounded flex items-center justify-center">
            <span className="line-through text-gray-500 text-xs">-</span>
          </div>
        ) : (
          <Input
            value={getCleanAcidityValue(sample.acidity)}
            onChange={(e) => handleAcidityChange(e.target.value)}
            className="w-full h-8 text-xs px-2"
            type="text"
            placeholder="Acidité"
            title="Acidité"
            disabled={!isGreenEditable}
            readOnly={!isGreenEditable}
          />
        )}
      </TableCell>
    </>
  );
};
