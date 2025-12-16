// Composant de formulaire pour les lieux Air Statique
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface AirStaticLocationFormProps {
  initialData?: any;
  sites: Array<{ id: string; nom: string; site: string }>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  action?: 'create' | 'edit';
}

export const AirStaticLocationForm: React.FC<AirStaticLocationFormProps> = ({
  initialData,
  sites,
  onSubmit,
  onCancel,
  loading = false,
  action = 'edit'
}) => {
  const [formData, setFormData] = useState({
    lieu: '',
    site: '',
    zone: '',
    volume_prelevement: '',
    limite_max: '',
    comparison_operator: '<'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialiser les données du formulaire
  useEffect(() => {
    if (initialData) {
      setFormData({
        lieu: initialData.lieu || '',
        site: initialData.site || '',
        zone: initialData.zone || '',
        volume_prelevement: initialData.volume_prelevement?.toString() || '',
        limite_max: initialData.limite_max?.toString() || '',
        comparison_operator: initialData.comparison_operator || '<'
      });
    } else {
      // Valeurs par défaut pour la création
      setFormData({
        lieu: '',
        site: sites[0]?.nom || '',
        zone: '',
        volume_prelevement: '',
        limite_max: '',
        comparison_operator: '<'
      });
    }
  }, [initialData, sites]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.lieu.trim()) {
      newErrors.lieu = 'Le nom du lieu est obligatoire';
    }

    if (!formData.site) {
      newErrors.site = 'Le site est obligatoire';
    }

    if (!formData.zone.trim()) {
      newErrors.zone = 'La zone est obligatoire';
    }

    if (!formData.volume_prelevement.trim()) {
      newErrors.volume_prelevement = 'Le volume de prélèvement est obligatoire';
    } else if (isNaN(Number(formData.volume_prelevement)) || Number(formData.volume_prelevement) <= 0) {
      newErrors.volume_prelevement = 'Le volume doit être un nombre positif';
    }

    if (!formData.limite_max.trim()) {
      newErrors.limite_max = 'La limite maximale est obligatoire';
    } else if (isNaN(Number(formData.limite_max)) || Number(formData.limite_max) < 0) {
      newErrors.limite_max = 'La limite doit être un nombre positif ou zéro';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      volume_prelevement: Number(formData.volume_prelevement),
      limite_max: Number(formData.limite_max)
    };

    await onSubmit(submitData);
  };

  const isValid = Object.keys(errors).length === 0 && 
    formData.lieu.trim() && 
    formData.site && 
    formData.zone.trim() && 
    formData.volume_prelevement.trim() && 
    formData.limite_max.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {action === 'create' ? 'Créer un Nouveau Lieu Air Statique' : 'Modifier le Lieu Air Statique'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nom du lieu */}
          <div className="space-y-2">
            <Label htmlFor="lieu">Nom du lieu *</Label>
            <Input
              id="lieu"
              value={formData.lieu}
              onChange={(e) => handleInputChange('lieu', e.target.value)}
              className={errors.lieu ? 'border-red-500' : ''}
              placeholder="Ex: PSM I, PSM II, Zone de production"
            />
            {errors.lieu && (
              <p className="text-red-600 text-sm">⚠️ {errors.lieu}</p>
            )}
          </div>

          {/* Site */}
          <div className="space-y-2">
            <Label htmlFor="site">Site *</Label>
            <Select
              value={formData.site}
              onValueChange={(value) => handleInputChange('site', value)}
            >
              <SelectTrigger className={errors.site ? 'border-red-500' : ''}>
                <SelectValue placeholder="Sélectionnez un site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.nom}>
                    {site.nom} - {site.site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.site && (
              <p className="text-red-600 text-sm">⚠️ {errors.site}</p>
            )}
          </div>

          {/* Zone */}
          <div className="space-y-2">
            <Label htmlFor="zone">Zone *</Label>
            <Input
              id="zone"
              value={formData.zone}
              onChange={(e) => handleInputChange('zone', e.target.value)}
              className={errors.zone ? 'border-red-500' : ''}
              placeholder="Ex: Zone de production, Zone d'emballage"
            />
            {errors.zone && (
              <p className="text-red-600 text-sm">⚠️ {errors.zone}</p>
            )}
          </div>

          {/* Volume de prélèvement */}
          <div className="space-y-2">
            <Label htmlFor="volume_prelevement">Volume de prélèvement (L) *</Label>
            <Input
              id="volume_prelevement"
              type="number"
              step="0.1"
              min="0"
              value={formData.volume_prelevement}
              onChange={(e) => handleInputChange('volume_prelevement', e.target.value)}
              className={errors.volume_prelevement ? 'border-red-500' : ''}
              placeholder="Ex: 1.0, 2.5"
            />
            {errors.volume_prelevement && (
              <p className="text-red-600 text-sm">⚠️ {errors.volume_prelevement}</p>
            )}
          </div>

          {/* Limite maximale */}
          <div className="space-y-2">
            <Label htmlFor="limite_max">Limite maximale (UFC/m³) *</Label>
            <Input
              id="limite_max"
              type="number"
              step="1"
              min="0"
              value={formData.limite_max}
              onChange={(e) => handleInputChange('limite_max', e.target.value)}
              className={errors.limite_max ? 'border-red-500' : ''}
              placeholder="Ex: 10, 50, 100"
            />
            {errors.limite_max && (
              <p className="text-red-600 text-sm">⚠️ {errors.limite_max}</p>
            )}
          </div>

          {/* Opérateur de comparaison */}
          <div className="space-y-2">
            <Label htmlFor="comparison_operator">Opérateur de comparaison *</Label>
            <Select
              value={formData.comparison_operator}
              onValueChange={(value) => handleInputChange('comparison_operator', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<">Inférieur à (&lt;)</SelectItem>
                <SelectItem value="<=">Inférieur ou égal à (&lt;=)</SelectItem>
                <SelectItem value="=">Égal à (=)</SelectItem>
                <SelectItem value=">">Supérieur à (&gt;)</SelectItem>
                <SelectItem value=">=">Supérieur ou égal à (&gt;=)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              Définit comment comparer les résultats avec la limite maximale
            </p>
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
          {loading ? 'Enregistrement...' : (action === 'create' ? 'Créer le Lieu' : 'Modifier le Lieu')}
        </Button>
      </div>
    </form>
  );
};
