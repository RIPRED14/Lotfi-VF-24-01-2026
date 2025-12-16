// Composant de formulaire de produit - Workflow simplifié selon vos spécifications
import React, { useState, useEffect } from 'react';
import { ProductData, BacterieSelection, BacterieType, ValidationErrors } from '../../types/products';
import { ProductValidationService } from '../../services/ProductValidationService';
import { useTraceability } from '../../hooks/useTraceability';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { supabase } from '../../integrations/supabase/client';

interface ProductFormProps {
  initialData?: Partial<ProductData>;
  siteId: string;
  onSubmit: (data: ProductData, bacteries: BacterieSelection[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  action?: 'create' | 'edit';
  sites?: Array<{ id: string; nom: string; site: string }>;
}

export const ProductFormNew: React.FC<ProductFormProps> = ({
  initialData,
  siteId,
  onSubmit,
  onCancel,
  loading = false,
  action = 'edit',
  sites = []
}) => {
  const { user } = useAuth();
  const { logAction } = useTraceability();
  
  const [formData, setFormData] = useState<Partial<ProductData>>({
    nom: '',
    type_produit: '',
    description: '',
    ph_seuil: '',
    actif: true,
    ...initialData
  });

  // Debug: Afficher les données initiales
  useEffect(() => {
    console.log('🔍 DEBUG ProductFormNew - initialData reçu:', initialData);
    console.log('🔍 DEBUG ProductFormNew - formData initialisé:', formData);
  }, [initialData, formData]);
  
  const [bacteriesDisponibles, setBacteriesDisponibles] = useState<BacterieType[]>([]);
  const [bacteriesSelectionnees, setBacteriesSelectionnees] = useState<BacterieSelection[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState(false);
  
  // Charger les bactéries disponibles
  useEffect(() => {
    const loadBacteries = async () => {
      try {
        const { data, error } = await supabase
          .from('bacteries_types')
          .select('*')
          .eq('actif', true)
          .order('nom');
        
        if (error) throw error;
        setBacteriesDisponibles(data || []);
        
        // Initialiser les bactéries sélectionnées si on est en mode édition
        if (initialData && initialData.thresholds) {
          console.log('🔍 DEBUG - Initialisation des bactéries depuis thresholds:', initialData.thresholds);
          
          // Extraire les bactéries (non PH/Acidité) des thresholds
          const bacteriaThresholds = initialData.thresholds.filter((t: any) => 
            t.parameter_type !== 'PH' && 
            t.parameter_type !== 'Acidité' &&
            t.parameter_type !== 'ph' &&
            t.parameter_type !== 'acidité' &&
            t.parameter_type !== 'pH' &&
            t.parameter_type !== 'ACIDITÉ' &&
            t.parameter_type !== 'acidity' &&
            t.parameter_type !== 'ACIDITY'
          );
          
          console.log('🦠 DEBUG - Bactéries trouvées:', bacteriaThresholds);
          console.log('🦠 DEBUG - Bactéries disponibles:', data);
          
          // Convertir en format BacterieSelection
          const bacteriesSelectionnees = bacteriaThresholds.map((threshold: any) => {
            // Trouver la bactérie correspondante dans bacteriesDisponibles
            const bacterieType = data?.find((bt: any) => bt.nom === threshold.parameter_type);
            
            return {
              bacterie_id: bacterieType?.id || threshold.id, // Utiliser l'ID de la bactérie si trouvée
              nom: threshold.parameter_type,
              seuil: threshold.comparison_operator === 'between' 
                ? `${threshold.min_value} - ${threshold.max_value}`
                : `${threshold.comparison_operator} ${threshold.min_value || threshold.max_value}`,
              actif: true
            };
          });
          
          console.log('✅ DEBUG - Bactéries sélectionnées initialisées:', bacteriesSelectionnees);
          setBacteriesSelectionnees(bacteriesSelectionnees);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des bactéries:', error);
      }
    };
    
    loadBacteries();
  }, [initialData]);
  
  // Validation en temps réel
  useEffect(() => {
    const validation = ProductValidationService.validateProduct(formData);
    setErrors(validation.errors);
    // ✅ Permettre la création sans bactéries (bactéries optionnelles)
    setIsValid(validation.isValid);
  }, [formData, bacteriesSelectionnees]);
  
  const handleInputChange = (field: keyof ProductData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validation du champ spécifique
    const fieldError = ProductValidationService.validateField(field, value, formData);
    if (fieldError) {
      setErrors(prev => ({ ...prev, [field]: fieldError }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const handleBacterieToggle = (bacterie: BacterieType) => {
    const isSelected = bacteriesSelectionnees.some(b => b.bacterie_id === bacterie.id);
    
    console.log('🦠 DEBUG - Toggle bactérie:', {
      bacterie: bacterie.nom,
      isSelected,
      bacteriesSelectionnees: bacteriesSelectionnees.map(b => ({ nom: b.nom, id: b.bacterie_id }))
    });
    
    if (isSelected) {
      // Désélectionner
      console.log('❌ Désélection de la bactérie:', bacterie.nom);
      setBacteriesSelectionnees(prev => {
        const newSelection = prev.filter(b => b.bacterie_id !== bacterie.id);
        console.log('✅ Nouvelles bactéries sélectionnées:', newSelection.map(b => b.nom));
        return newSelection;
      });
    } else {
      // Sélectionner avec seuil par défaut
      console.log('✅ Sélection de la bactérie:', bacterie.nom);
      const nouvelleBacterie: BacterieSelection = {
        bacterie_id: bacterie.id,
        nom: bacterie.nom,
        seuil: '< 10', // Seuil par défaut
        actif: true
      };
      setBacteriesSelectionnees(prev => {
        const newSelection = [...prev, nouvelleBacterie];
        console.log('✅ Nouvelles bactéries sélectionnées:', newSelection.map(b => b.nom));
        return newSelection;
      });
    }
  };
  
  const handleSeuilChange = (bacterieId: string, nouveauSeuil: string) => {
    setBacteriesSelectionnees(prev => 
      prev.map(b => 
        b.bacterie_id === bacterieId 
          ? { ...b, seuil: nouveauSeuil }
          : b
      )
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 DEBUG - Validation du formulaire:');
    console.log('🔍 DEBUG - isValid:', isValid);
    console.log('🔍 DEBUG - errors:', errors);
    console.log('🔍 DEBUG - formData:', formData);
    
    if (!isValid) {
      console.log('❌ Formulaire non valide, soumission bloquée');
      return;
    }
    
    console.log('🦠 DEBUG - Soumission du formulaire:');
    console.log('🦠 DEBUG - formData:', formData);
    console.log('🦠 DEBUG - bacteriesSelectionnees:', bacteriesSelectionnees);
    console.log('🦠 DEBUG - Nombre de bactéries sélectionnées:', bacteriesSelectionnees.length);
    
    try {
      console.log('🔄 DEBUG - Appel à onSubmit...');
      await onSubmit(formData as ProductData, bacteriesSelectionnees);
      console.log('✅ DEBUG - onSubmit terminé avec succès');
      
      // Log de la création/modification
      if (initialData) {
        await logAction(
          'UPDATE',
          'produits',
          initialData.id || '',
          initialData,
          formData,
          {
            reason: 'Modification des paramètres du produit',
            category: 'PRODUCT_UPDATE',
            impact: 'MEDIUM'
          }
        );
      } else {
        await logAction(
          'CREATE',
          'produits',
          'new',
          null,
          formData,
          {
            reason: 'Création d\'un nouveau produit',
            category: 'PRODUCT_CREATION',
            impact: 'HIGH'
          }
        );
      }
    } catch (error) {
      console.error('💥 DEBUG - Erreur dans handleSubmit:', error);
      console.error('💥 DEBUG - Type d\'erreur:', typeof error);
      console.error('💥 DEBUG - Message d\'erreur:', error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Formulaire simplifié - Seulement les champs essentiels */}
      <Card>
        <CardHeader>
          <CardTitle>Modification du Produit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 1. Nom du Produit */}
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du Produit *</Label>
            <Input
              id="nom"
              value={formData.nom || ''}
              onChange={(e) => handleInputChange('nom', e.target.value)}
              className={errors.nom ? 'border-red-500' : ''}
              placeholder="Ex: Aliments Sante (AS)"
            />
            {errors.nom && (
              <p className="text-red-600 text-sm">⚠️ {errors.nom}</p>
            )}
          </div>
          
          {/* 2. Site */}
          <div className="space-y-2">
            <Label htmlFor="site_id">Site *</Label>
            <Select
              value={formData.site_id || ''}
              onValueChange={(value) => handleInputChange('site_id', value)}
            >
              <SelectTrigger className={errors.site_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Sélectionnez un site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.nom} - {site.site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.site_id && (
              <p className="text-red-600 text-sm">⚠️ {errors.site_id}</p>
            )}
          </div>
          
          {/* 3. PH/Acidité */}
          <div className="space-y-2">
            <Label htmlFor="ph_seuil">PH/Acidité</Label>
            <Input
              id="ph_seuil"
              value={formData.ph_seuil || ''}
              onChange={(e) => handleInputChange('ph_seuil', e.target.value)}
              className={errors.ph_seuil ? 'border-red-500' : ''}
              placeholder="Optionnel - Ex: <= 7, < 5, 4.5-6.8"
            />
            {errors.ph_seuil && (
              <p className="text-red-600 text-sm">⚠️ {errors.ph_seuil}</p>
            )}
            <p className="text-sm text-gray-600">
              Format: &lt;= 7, &lt; 5, 4.5-6.8, = 6.5
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* 3. Bactéries à Analyser */}
      <Card>
        <CardHeader>
          <CardTitle>Bactéries à Analyser</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez les bactéries et définissez leurs seuils :
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bacteriesDisponibles.map(bacterie => {
                const isSelected = bacteriesSelectionnees.some(b => b.bacterie_id === bacterie.id);
                const bacterieSelectionnee = bacteriesSelectionnees.find(b => b.bacterie_id === bacterie.id);
                
                return (
                  <div key={bacterie.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Checkbox
                        id={`bacterie-${bacterie.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleBacterieToggle(bacterie)}
                      />
                      <Label htmlFor={`bacterie-${bacterie.id}`} className="font-medium">
                        {bacterie.nom}
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {bacterie.unite}
                      </Badge>
                    </div>
                    
                    {isSelected && (
                      <div className="space-y-2">
                        <Label htmlFor={`seuil-${bacterie.id}`}>Seuil *</Label>
                        <Input
                          id={`seuil-${bacterie.id}`}
                          value={bacterieSelectionnee?.seuil || ''}
                          onChange={(e) => handleSeuilChange(bacterie.id, e.target.value)}
                          placeholder="Ex: < 10, > 5, = 100"
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Format: &lt; 10, &gt; 5, = 100, 5-10
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {bacteriesSelectionnees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Aucune bactérie sélectionnée</p>
                <p className="text-sm">Sélectionnez au moins une bactérie pour continuer</p>
              </div>
            )}
            
            {bacteriesSelectionnees.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Bactéries Sélectionnées :</h4>
                <div className="space-y-2">
                  {bacteriesSelectionnees.map(bacterie => (
                    <div key={bacterie.bacterie_id} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="text-sm text-green-700">
                        <span className="font-medium">{bacterie.nom}</span>: {bacterie.seuil} {bacteriesDisponibles.find(b => b.id === bacterie.bacterie_id)?.unite}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const bacterieType = bacteriesDisponibles.find(bt => bt.id === bacterie.bacterie_id);
                          if (bacterieType) {
                            handleBacterieToggle(bacterieType);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Supprimer
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          type="submit"
          disabled={!isValid || loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Enregistrement...' : (action === 'create' ? 'Ajouter le Produit' : 'Modifier le Produit')}
        </Button>
      </div>
    </form>
  );
};
