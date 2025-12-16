// Composant de formulaire de produit - Workflow simplifié
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
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  siteId,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const { user } = useAuth();
  const { logAction } = useTraceability();
  
  const [formData, setFormData] = useState<Partial<ProductData>>({
    nom: '',
    type_produit: '',
    description: '',
    ph_minimum: 0,
    ph_maximum: 14,
    ph_optimal: 7,
    seuil_enterobacteries: 100,
    seuil_coliformes: 10,
    seuil_ecoli: 5,
    autres_bacteries: '',
    actif: true,
    ...initialData
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState(false);
  
  // Validation en temps réel
  useEffect(() => {
    const validation = ProductValidationService.validateProduct(formData);
    setErrors(validation.errors);
    setIsValid(validation.isValid);
  }, [formData]);
  
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      return;
    }
    
    try {
      await onSubmit(formData as ProductData);
      
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
      console.error('Erreur lors de la soumission:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description du Produit</Label>
              <Input
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={errors.description ? 'border-red-500' : ''}
                placeholder="Ex: Lait UHT 1L"
              />
              {errors.description && (
                <p className="text-red-600 text-sm">⚠️ {errors.description}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type_produit">Type de Produit *</Label>
              <Select
                value={formData.type_produit || ''}
                onValueChange={(value) => handleInputChange('type_produit', value)}
              >
                <SelectTrigger className={errors.type_produit ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lait">Lait</SelectItem>
                  <SelectItem value="yaourt">Yaourt</SelectItem>
                  <SelectItem value="fromage">Fromage</SelectItem>
                  <SelectItem value="dessert">Dessert Lacté</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
              {errors.type_produit && (
                <p className="text-red-600 text-sm">⚠️ {errors.type_produit}</p>
              )}
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                placeholder="Description du produit..."
              />
            </div>
            
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                id="actif"
                checked={formData.actif || false}
                onCheckedChange={(checked) => handleInputChange('actif', checked)}
              />
              <Label htmlFor="actif">Produit actif (disponible pour les analyses)</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Paramètres PH */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres PH</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ph_minimum">PH Minimum *</Label>
              <Input
                id="ph_minimum"
                type="number"
                step="0.1"
                value={formData.ph_minimum || ''}
                onChange={(e) => handleInputChange('ph_minimum', parseFloat(e.target.value))}
                className={errors.ph_minimum ? 'border-red-500' : ''}
                placeholder="6.0"
              />
              {errors.ph_minimum && (
                <p className="text-red-600 text-sm">⚠️ {errors.ph_minimum}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ph_maximum">PH Maximum *</Label>
              <Input
                id="ph_maximum"
                type="number"
                step="0.1"
                value={formData.ph_maximum || ''}
                onChange={(e) => handleInputChange('ph_maximum', parseFloat(e.target.value))}
                className={errors.ph_maximum ? 'border-red-500' : ''}
                placeholder="7.0"
              />
              {errors.ph_maximum && (
                <p className="text-red-600 text-sm">⚠️ {errors.ph_maximum}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ph_optimal">PH Optimal *</Label>
              <Input
                id="ph_optimal"
                type="number"
                step="0.1"
                value={formData.ph_optimal || ''}
                onChange={(e) => handleInputChange('ph_optimal', parseFloat(e.target.value))}
                className={errors.ph_optimal ? 'border-red-500' : ''}
                placeholder="6.5"
              />
              {errors.ph_optimal && (
                <p className="text-red-600 text-sm">⚠️ {errors.ph_optimal}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Seuils Microbiologiques */}
      <Card>
        <CardHeader>
          <CardTitle>Seuils Microbiologiques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seuil_enterobacteries">Entérobactéries (UFC/g) *</Label>
              <Input
                id="seuil_enterobacteries"
                type="number"
                value={formData.seuil_enterobacteries || ''}
                onChange={(e) => handleInputChange('seuil_enterobacteries', parseInt(e.target.value))}
                className={errors.seuil_enterobacteries ? 'border-red-500' : ''}
                placeholder="100"
              />
              {errors.seuil_enterobacteries && (
                <p className="text-red-600 text-sm">⚠️ {errors.seuil_enterobacteries}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seuil_coliformes">Coliformes (UFC/g) *</Label>
              <Input
                id="seuil_coliformes"
                type="number"
                value={formData.seuil_coliformes || ''}
                onChange={(e) => handleInputChange('seuil_coliformes', parseInt(e.target.value))}
                className={errors.seuil_coliformes ? 'border-red-500' : ''}
                placeholder="10"
              />
              {errors.seuil_coliformes && (
                <p className="text-red-600 text-sm">⚠️ {errors.seuil_coliformes}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seuil_ecoli">E.coli (UFC/g) *</Label>
              <Input
                id="seuil_ecoli"
                type="number"
                value={formData.seuil_ecoli || ''}
                onChange={(e) => handleInputChange('seuil_ecoli', parseInt(e.target.value))}
                className={errors.seuil_ecoli ? 'border-red-500' : ''}
                placeholder="5"
              />
              {errors.seuil_ecoli && (
                <p className="text-red-600 text-sm">⚠️ {errors.seuil_ecoli}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="autres_bacteries">Autres Bactéries</Label>
              <Input
                id="autres_bacteries"
                value={formData.autres_bacteries || ''}
                onChange={(e) => handleInputChange('autres_bacteries', e.target.value)}
                placeholder="Ex: Staphylocoques, Salmonella"
              />
            </div>
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
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Enregistrement...' : (initialData ? 'Modifier' : 'Créer')}
        </Button>
      </div>
    </form>
  );
};
