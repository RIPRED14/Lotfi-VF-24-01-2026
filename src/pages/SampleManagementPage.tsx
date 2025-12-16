import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search, Filter, Eye, Edit, CheckCircle, AlertTriangle, Clock, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Sample {
  id: string;
  form_id: string;
  report_title: string;
  product: string;
  site: string;
  brand: string;
  status: string;
  smell: string | null;
  texture: string | null;
  taste: string | null;
  aspect: string | null;
  ph: string | null;
  aj_dlc?: string | null;
  analysis_type?: string;
  created_at: string;
  modified_at: string;
  modified_by: string;
}

const SampleManagementPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');

  // Charger tous les échantillons en cours d'analyse
  const loadSamples = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('samples')
        .select('*')
        .in('status', ['analyses_en_cours', 'waiting_reading', 'in_progress'])
        .order('modified_at', { ascending: false });

      if (error) throw error;

      // Mapper les données pour correspondre à l'interface Sample
      const mappedSamples: Sample[] = (data || []).map((sample: any) => ({
        id: sample.id,
        form_id: sample.form_id,
        report_title: sample.report_title || '',
        product: sample.product || '',
        site: sample.site || '',
        brand: sample.brand || '',
        status: sample.status || '',
        smell: sample.smell,
        texture: sample.texture,
        taste: sample.taste,
        aspect: sample.aspect,
        ph: sample.ph,
        of_value: sample.of_value || '',
        acidity: sample.acidity || '',
        parfum: sample.parfum || '',
        aj_dlc: sample.aj_dlc || null,
        analysis_type: sample.analysis_type || '',
        created_at: sample.created_at || '',
        modified_at: sample.modified_at || '',
        modified_by: sample.modified_by || ''
      }));

      setSamples(mappedSamples);
      setFilteredSamples(mappedSamples);
      
    } catch (error) {
      console.error('Erreur lors du chargement des échantillons:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les échantillons",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSamples();
  }, []);

  // Filtrer les échantillons
  useEffect(() => {
    let filtered = samples;

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(sample =>
        sample.report_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.form_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sample => sample.status === statusFilter);
    }

    // Filtre par site
    if (siteFilter !== 'all') {
      filtered = filtered.filter(sample => sample.site === siteFilter);
    }

    setFilteredSamples(filtered);
  }, [samples, searchTerm, statusFilter, siteFilter]);

  // Ouvrir un échantillon pour édition
  const handleEditSample = (sample: Sample) => {
    navigate('/sample-entry', {
      state: {
        formId: sample.form_id,
        isFromHistory: true,
        reportTitle: sample.report_title
      }
    });
  };

  // Obtenir la couleur du badge selon le statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'analyses_en_cours':
        return { label: 'En cours d\'analyse', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'waiting_reading':
        return { label: 'Lecture en attente', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'in_progress':
        return { label: 'En progression', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      default:
        return { label: 'Inconnu', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  // Calculer le pourcentage de complétude des analyses de base
  const getCompletionPercentage = (sample: Sample) => {
    const fields = [sample.smell, sample.texture, sample.taste, sample.aspect, sample.ph];
    const completed = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  // Obtenir les sites uniques
  const uniqueSites = Array.from(new Set(samples.map(sample => sample.site))).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-blue-600" />
                Gestion des Échantillons
              </h1>
              <p className="text-gray-600 mt-2">
                Suivi et gestion des échantillons en cours d'analyse
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadSamples}
                disabled={isLoading}
              >
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="analyses_en_cours">En cours d'analyse</SelectItem>
                <SelectItem value="waiting_reading">Lecture en attente</SelectItem>
                <SelectItem value="in_progress">En progression</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {uniqueSites.map(site => (
                  <SelectItem key={site} value={site}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>{filteredSamples.length} échantillon(s)</span>
            </div>
          </div>
        </div>

        {/* Liste des échantillons */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des échantillons...</p>
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun échantillon trouvé
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || siteFilter !== 'all'
                ? 'Aucun échantillon ne correspond aux critères de recherche.'
                : 'Il n\'y a actuellement aucun échantillon en cours d\'analyse.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSamples.map((sample) => {
              const statusBadge = getStatusBadge(sample.status);
              const completion = getCompletionPercentage(sample);
              
              return (
                <Card key={sample.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-medium text-gray-900 mb-1">
                          {sample.report_title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mb-2">{sample.product}</p>
                        <Badge className={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Site</span>
                        <span className="font-medium">{sample.site}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Marque</span>
                        <span className="font-medium">{sample.brand}</span>
                      </div>
                      
                      {sample.analysis_type && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Type d'analyse</span>
                          <span className="font-medium text-xs">{sample.analysis_type}</span>
                        </div>
                      )}
                      
                      {/* Barre de progression des analyses de base */}
                      {sample.status === 'analyses_en_cours' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Analyses de base</span>
                            <span className="font-medium">{completion}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${completion === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${completion}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Modifié le {format(new Date(sample.modified_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          <span>Par {sample.modified_by}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSample(sample)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleManagementPage; 