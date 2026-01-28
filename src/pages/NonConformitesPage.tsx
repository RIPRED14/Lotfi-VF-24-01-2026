import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  RefreshCw, AlertTriangle, Filter, Eye, XCircle, 
  FileText, Beaker, Building, Calendar, CheckCircle,
  CheckSquare, Square, History, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';

// Clé localStorage pour backup
const MANAGED_FORMS_KEY = 'nc_managed_forms';

// Fonction helper pour récupérer TOUS les enregistrements avec pagination
const fetchAllRecords = async (table: string, selectFields: string, filters?: { eq?: Record<string, any>, neq?: Record<string, any>, in?: { field: string, values: string[] } }) => {
  let allRecords: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(selectFields).range(from, from + batchSize - 1);

    if (filters?.eq) {
      for (const [field, value] of Object.entries(filters.eq)) {
        query = query.eq(field, value);
      }
    }
    if (filters?.neq) {
      for (const [field, value] of Object.entries(filters.neq)) {
        query = query.neq(field, value);
      }
    }
    if (filters?.in) {
      query = query.in(filters.in.field, filters.in.values);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Erreur pagination ${table}:`, error.message);
      return { data: allRecords, error };
    }

    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return { data: allRecords, error: null };
};

// Mapping entre nom de bactérie et champ dans la table samples
const BACTERIA_FIELD_MAPPING: Record<string, string> = {
  "Entérobactéries": "enterobacteria_count",
  "Escherichia coli": "escherichia_coli_count",
  "Coliformes totaux": "coliforms_count",
  "Staphylocoques": "staphylococcus_count",
  "Listeria": "listeria_count",
  "Levures/Moisissures (3j)": "yeast_mold_3j_count",
  "Levures/Moisissures (5j)": "yeast_mold_5j_count",
  "Levures/Moisissures": "yeast_mold_count",
  "Flore totales": "total_flora_count",
  "Leuconostoc": "leuconostoc_count"
};

// Interface pour les formulaires avec non-conformités bactériologiques
interface NonConformForm {
  form_id: string;
  report_title: string;
  brand: string;
  site: string;
  sample_count: number;
  non_conform_samples: NonConformSample[];
  created_at: string;
  sample_date?: string;
  total_bacteria: number;
  completed_bacteria: number;
}

// Interface pour les échantillons non conformes
interface NonConformSample {
  sample_id: string;
  sample_number: string;
  product: string;
  resultat: string;
  completed_bacteria_values: { name: string, value: number | null }[];
}

// Interface pour le statut de gestion
interface ManagedStatus {
  form_id: string;
  is_managed: boolean;
  managed_at: string | null;
  notes?: string;
}

const NonConformitesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nonConformForms, setNonConformForms] = useState<NonConformForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  const [managedForms, setManagedForms] = useState<Record<string, ManagedStatus>>({});
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => {
    loadManagedStatus();
    loadNonConformForms();
  }, []);

  // Charger les statuts de gestion (Supabase ou localStorage)
  const loadManagedStatus = async () => {
    // Essayer Supabase d'abord
    try {
      const { data, error } = await supabase
        .from('nc_form_status')
        .select('*');
      
      if (!error && data) {
        setUseSupabase(true);
        const statusMap: Record<string, ManagedStatus> = {};
        data.forEach((item: any) => {
          statusMap[item.form_id] = {
            form_id: item.form_id,
            is_managed: item.is_managed,
            managed_at: item.managed_at,
            notes: item.notes
          };
        });
        setManagedForms(statusMap);
        console.log('✅ Statuts chargés depuis Supabase:', Object.keys(statusMap).length);
        return;
      }
    } catch (e) {
      console.log('Supabase nc_form_status non disponible, utilisation localStorage');
    }

    // Fallback localStorage
    setUseSupabase(false);
    const stored = localStorage.getItem(MANAGED_FORMS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setManagedForms(parsed);
        console.log('✅ Statuts chargés depuis localStorage:', Object.keys(parsed).length);
      } catch (e) {
        console.error('Erreur parsing localStorage:', e);
      }
    }
  };

  // Sauvegarder le statut de gestion
  const saveManaged = async (formId: string, isManaged: boolean) => {
    const now = new Date().toISOString();
    const newStatus: ManagedStatus = {
      form_id: formId,
      is_managed: isManaged,
      managed_at: isManaged ? now : null
    };

    // Mettre à jour l'état local immédiatement
    const updatedForms = {
      ...managedForms,
      [formId]: newStatus
    };
    setManagedForms(updatedForms);

    // Sauvegarder dans Supabase si disponible
    if (useSupabase) {
      try {
        const { error } = await supabase
          .from('nc_form_status')
          .upsert({
            form_id: formId,
            is_managed: isManaged,
            managed_at: isManaged ? now : null,
            updated_at: now
          }, { onConflict: 'form_id' });
        
        if (error) {
          console.error('Erreur Supabase:', error);
          // Fallback localStorage
          localStorage.setItem(MANAGED_FORMS_KEY, JSON.stringify(updatedForms));
        } else {
          console.log('✅ Statut sauvegardé dans Supabase');
        }
      } catch (e) {
        console.error('Erreur Supabase:', e);
        localStorage.setItem(MANAGED_FORMS_KEY, JSON.stringify(updatedForms));
      }
    } else {
      // Sauvegarder dans localStorage
      localStorage.setItem(MANAGED_FORMS_KEY, JSON.stringify(updatedForms));
      console.log('✅ Statut sauvegardé dans localStorage');
    }

    toast({
      title: isManaged ? "✅ Marqué comme Géré" : "⏳ Marqué comme Non géré",
      description: `Le formulaire a été marqué comme ${isManaged ? 'géré (vu)' : 'non géré'}. Cela n'affecte PAS le formulaire dans Lectures en Attente.`,
    });
  };

  // Vérifier si un formulaire est géré
  const isFormManaged = (formId: string): boolean => {
    return managedForms[formId]?.is_managed || false;
  };

  // Obtenir la date de gestion
  const getManagedDate = (formId: string): string | null => {
    return managedForms[formId]?.managed_at || null;
  };

  // Fonction pour convertir le code de marque en nom lisible
  const getBrandDisplayName = (brand: string): string => {
    if (!brand) return 'Non spécifié';
    
    const brandMapping: Record<string, string> = {
      '1': 'Grand Frais',
      'grand_frais': 'Grand Frais',
      '2': "L'Atelier Dessy",
      '3': 'BAIKO',
      'fromage_pasteurises': 'Fromage pasteurisés (FP)',
      'lait': 'LAIT',
      'gyma_0': 'GYMA 0%',
      'aliments_sante': 'Aliments Santé (AS)',
      'creme_dessert_collet': 'Crème Dessert Collet',
      'dessert_vegetal_non_fermente': 'Dessert végétal non fermenté',
      'eaux_de_rincage': 'Eaux de rinçage',
      'mains': 'Mains',
      'air_statique': 'Air Statique',
      'materiel': 'Matériel'
    };
    
    return brandMapping[brand] || brand;
  };

  const loadNonConformForms = async () => {
    try {
      setLoading(true);
      console.log('🔴 Chargement des non-conformités bactériologiques...');

      // 1. Récupérer TOUTES les bactéries sélectionnées par formulaire
      const { data: allBacteriaSelections, error: bacteriaError } = await fetchAllRecords(
        'form_bacteria_selections',
        'form_id, bacteria_name, status, created_at',
        { neq: { status: 'cancelled' } }
      );

      if (bacteriaError) {
        console.error('❌ Erreur bactéries:', bacteriaError);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les bactéries",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Grouper les bactéries par form_id
      const bacteriaByFormId: Record<string, any[]> = {};
      allBacteriaSelections?.forEach(bacteria => {
        if (!bacteria.form_id) return;
        if (!bacteriaByFormId[bacteria.form_id]) {
          bacteriaByFormId[bacteria.form_id] = [];
        }
        bacteriaByFormId[bacteria.form_id].push(bacteria);
      });

      // 3. Identifier les formulaires dans "Lectures en Attente"
      const formIdsInLecturesEnAttente: string[] = [];
      const formBacteriaInfo: Record<string, { total: number, completed: number, completedBacteria: string[] }> = {};

      Object.entries(bacteriaByFormId).forEach(([formId, bacteriaList]) => {
        const completedBacteria = bacteriaList.filter(b => b.status === 'completed');
        const isFullyCompleted = bacteriaList.length > 0 && bacteriaList.every(b => b.status === 'completed');
        
        if (!isFullyCompleted && bacteriaList.length > 0) {
          formIdsInLecturesEnAttente.push(formId);
        }
        
        formBacteriaInfo[formId] = {
          total: bacteriaList.length,
          completed: completedBacteria.length,
          completedBacteria: completedBacteria.map(b => b.bacteria_name)
        };
      });

      console.log('📋 Formulaires dans Lectures en Attente:', formIdsInLecturesEnAttente.length);

      if (formIdsInLecturesEnAttente.length === 0) {
        setNonConformForms([]);
        setLoading(false);
        return;
      }

      // 4. Récupérer les échantillons
      const { data: samplesData, error: samplesError } = await fetchAllRecords(
        'samples',
        'id, form_id, number, product, brand, site, report_title, created_at, resultat, enterobacteria_count, yeast_mold_count, listeria_count, coliforms_count, staphylococcus_count, escherichia_coli_count, total_flora_count, leuconostoc_count, yeast_mold_3j_count, yeast_mold_5j_count'
      );

      if (samplesError) {
        console.error('❌ Erreur échantillons:', samplesError);
        setLoading(false);
        return;
      }

      // Filtrer les échantillons non-conformes
      const nonConformSamples = samplesData?.filter(s => 
        s.form_id && 
        formIdsInLecturesEnAttente.includes(s.form_id) &&
        s.resultat === 'Non-conforme' &&
        formBacteriaInfo[s.form_id]?.completed > 0
      ) || [];

      console.log('🔴 Échantillons non-conformes:', nonConformSamples.length);

      // 5. Récupérer les infos depuis sample_forms
      const { data: sampleFormsData } = await fetchAllRecords(
        'sample_forms',
        'report_id, sample_date, site, reference'
      );

      const sampleFormsMap = new Map();
      sampleFormsData?.forEach(form => {
        sampleFormsMap.set(form.report_id, {
          sample_date: form.sample_date,
          site: form.site,
          reference: form.reference
        });
      });

      // 6. Grouper les échantillons par form_id
      const formGroups: Record<string, NonConformForm> = {};

      nonConformSamples.forEach(sample => {
        const formId = sample.form_id;
        if (!formId) return;

        const brandDisplayName = getBrandDisplayName(sample.brand);
        const formInfo = sampleFormsMap.get(formId);
        const bacteriaInfo = formBacteriaInfo[formId];
        
        const completedBacteriaNames = bacteriaInfo?.completedBacteria || [];
        const completedBacteriaValues: { name: string, value: number | null }[] = [];
        
        completedBacteriaNames.forEach(bacteriaName => {
          const fieldName = BACTERIA_FIELD_MAPPING[bacteriaName];
          if (fieldName && sample[fieldName] !== undefined) {
            completedBacteriaValues.push({
              name: bacteriaName,
              value: sample[fieldName]
            });
          }
        });

        if (!formGroups[formId]) {
          let reportTitle = sample.report_title;
          if (!reportTitle || reportTitle.length < 5) {
            reportTitle = formInfo?.reference;
          }
          if (!reportTitle || reportTitle.length < 5) {
            if (brandDisplayName && brandDisplayName !== 'Non spécifié') {
              reportTitle = `Formulaire contrôle microbiologique – ${brandDisplayName}`;
            } else {
              reportTitle = `Formulaire du ${new Date(sample.created_at).toLocaleDateString('fr-FR')}`;
            }
          }

          let site = sample.site;
          if (!site || site === '' || site === 'N/A') {
            site = formInfo?.site;
          }
          if (!site || site === '' || site === 'N/A') {
            site = 'Non spécifié';
          }

          formGroups[formId] = {
            form_id: formId,
            report_title: reportTitle,
            brand: brandDisplayName,
            site: site,
            sample_count: 0,
            non_conform_samples: [],
            created_at: sample.created_at,
            sample_date: formInfo?.sample_date || sample.created_at,
            total_bacteria: bacteriaInfo?.total || 0,
            completed_bacteria: bacteriaInfo?.completed || 0
          };
        }

        formGroups[formId].sample_count++;
        formGroups[formId].non_conform_samples.push({
          sample_id: sample.id,
          sample_number: sample.number,
          product: sample.product,
          resultat: sample.resultat,
          completed_bacteria_values: completedBacteriaValues
        });
      });

      const sortedForms = Object.values(formGroups).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log('✅ Formulaires avec non-conformités:', sortedForms.length);
      
      setNonConformForms(sortedForms);
      setLoading(false);

    } catch (error) {
      console.error('❌ Erreur générale:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du chargement des données",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getTotalNonConformSamples = () => {
    return nonConformForms.reduce((total, form) => total + form.non_conform_samples.length, 0);
  };

  const getUniqueSites = () => {
    const sites = nonConformForms.map(form => form.site);
    return [...new Set(sites)].sort();
  };

  const getFilteredForms = () => {
    let filtered = nonConformForms;
    
    if (selectedSite !== 'all') {
      filtered = filtered.filter(form => form.site === selectedSite);
    }
    
    if (selectedStatus === 'managed') {
      filtered = filtered.filter(form => isFormManaged(form.form_id));
    } else if (selectedStatus === 'not_managed') {
      filtered = filtered.filter(form => !isFormManaged(form.form_id));
    }
    
    return filtered;
  };

  const getManagedCount = () => {
    return nonConformForms.filter(form => isFormManaged(form.form_id)).length;
  };

  const getNotManagedCount = () => {
    return nonConformForms.filter(form => !isFormManaged(form.form_id)).length;
  };

  const toggleExpand = (formId: string) => {
    setExpandedFormId(expandedFormId === formId ? null : formId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <Header hideMenuItems={['Lectures en Attente', 'Historique', 'Formulaires', 'Administration']} />
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8" />
                Non-Conformités Bactériologiques
              </h1>
              <p className="text-red-100 text-lg">
                Formulaires de "Lectures en Attente" avec des résultats <strong>Non-conforme</strong>
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/30 text-center">
                <div className="text-2xl font-bold text-white">{getNotManagedCount()}</div>
                <div className="text-red-200 text-xs">Non géré(s)</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/30 text-center">
                <div className="text-2xl font-bold text-white">{getManagedCount()}</div>
                <div className="text-green-200 text-xs">Géré(s)</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/30 text-center">
                <div className="text-2xl font-bold text-white">{getTotalNonConformSamples()}</div>
                <div className="text-red-200 text-xs">Échantillon(s) NC</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Page de consultation uniquement</h3>
              <p className="text-sm text-amber-700 mt-1">
                Le bouton <strong>"Géré / Non géré"</strong> permet de marquer les formulaires comme <strong>vus</strong>. 
                <span className="text-amber-900 font-medium"> Cela n'affecte PAS le formulaire dans "Lectures en Attente"</span> - 
                c'est juste pour votre suivi personnel et les audits.
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <CardTitle className="text-xl font-bold text-red-800">
                  Échantillons Non-Conformes
                </CardTitle>
                <CardDescription>
                  Formulaires en attente avec résultat = "Non-conforme"
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filtre par statut Géré/Non géré */}
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-gray-500" />
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous ({nonConformForms.length})</SelectItem>
                      <SelectItem value="not_managed">Non géré ({getNotManagedCount()})</SelectItem>
                      <SelectItem value="managed">Géré ({getManagedCount()})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtre par site */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les sites</SelectItem>
                      {getUniqueSites().map((site) => (
                        <SelectItem key={site} value={site}>
                          {site}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { loadManagedStatus(); loadNonConformForms(); }}
                  className="text-xs flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 rounded-full border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-500">Chargement des non-conformités...</p>
              </div>
            ) : nonConformForms.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg bg-green-50 border-green-200">
                <Beaker className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-green-800 mb-2">Aucune non-conformité</h3>
                <p className="text-green-600">Tous les échantillons dans "Lectures en Attente" sont conformes.</p>
              </div>
            ) : getFilteredForms().length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg bg-gray-50">
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Aucun résultat</h3>
                <p className="text-gray-500">Aucun formulaire ne correspond aux filtres sélectionnés.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info filtres actifs */}
                {(selectedSite !== 'all' || selectedStatus !== 'all') && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Filtres actifs:</span>
                      {selectedStatus !== 'all' && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {selectedStatus === 'managed' ? 'Géré' : 'Non géré'}
                        </Badge>
                      )}
                      {selectedSite !== 'all' && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Site: {selectedSite}
                        </Badge>
                      )}
                    </div>
                    <Badge className="bg-blue-500 text-white">
                      {getFilteredForms().length} formulaire(s)
                    </Badge>
                  </div>
                )}

                {getFilteredForms().map((form) => {
                  const isManaged = isFormManaged(form.form_id);
                  const managedDate = getManagedDate(form.form_id);
                  
                  return (
                    <div 
                      key={form.form_id} 
                      className={`border rounded-xl bg-white overflow-hidden transition-all ${
                        isManaged 
                          ? 'border-green-300 bg-green-50/30' 
                          : 'border-red-200'
                      }`}
                    >
                      {/* En-tête du formulaire */}
                      <div 
                        className={`p-6 cursor-pointer transition-colors ${
                          isManaged 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100' 
                            : 'bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100'
                        }`}
                        onClick={() => toggleExpand(form.form_id)}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {isManaged ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <h3 className="text-lg font-semibold text-gray-900">
                                {form.report_title}
                              </h3>
                              {isManaged && (
                                <Badge className="bg-green-500 text-white text-xs">
                                  ✓ Géré
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Beaker className="h-4 w-4 text-gray-400" />
                                <span>Marque: <strong>{form.brand}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span>Site: <strong>{form.site}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Bactéries: <strong>{form.completed_bacteria}/{form.total_bacteria}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>Date: <strong>{format(new Date(form.sample_date || form.created_at), 'dd/MM/yyyy', { locale: fr })}</strong></span>
                              </div>
                            </div>
                            {isManaged && managedDate && (
                              <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Géré le {format(new Date(managedDate), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-red-500 text-white text-sm px-3 py-1">
                              {form.non_conform_samples.length} NC
                            </Badge>
                            
                            {/* Bouton Géré/Non géré */}
                            <Button
                              variant={isManaged ? "outline" : "default"}
                              size="sm"
                              className={`text-xs ${
                                isManaged 
                                  ? 'border-green-500 text-green-700 hover:bg-green-100' 
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                saveManaged(form.form_id, !isManaged);
                              }}
                            >
                              {isManaged ? (
                                <>
                                  <Square className="h-3 w-3 mr-1" />
                                  Marquer Non géré
                                </>
                              ) : (
                                <>
                                  <CheckSquare className="h-3 w-3 mr-1" />
                                  Marquer Géré
                                </>
                              )}
                            </Button>
                            
                            <span className="text-xs text-gray-500">
                              {expandedFormId === form.form_id ? '▲ Réduire' : '▼ Détails'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Détails des échantillons */}
                      {expandedFormId === form.form_id && (
                        <div className="p-6 border-t border-gray-200 bg-white">
                          <h4 className="text-sm font-semibold text-red-800 mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Échantillons non-conformes:
                          </h4>
                          <div className="space-y-3">
                            {form.non_conform_samples.map((sample, idx) => (
                              <div 
                                key={`${sample.sample_id}-${idx}`} 
                                className="p-4 bg-red-50 border border-red-200 rounded-lg"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-medium text-gray-900">
                                      Échantillon #{sample.sample_number}
                                    </span>
                                    <span className="text-gray-500 ml-2">
                                      ({sample.product})
                                    </span>
                                  </div>
                                  <Badge className="bg-red-600 text-white">
                                    {sample.resultat}
                                  </Badge>
                                </div>
                                
                                {sample.completed_bacteria_values.length > 0 && (
                                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                                    <span className="text-sm text-gray-600">Bactéries:</span>
                                    {sample.completed_bacteria_values.map((bv, i) => (
                                      <div key={i} className="flex items-center gap-1">
                                        <span className="text-sm font-medium text-gray-700">{bv.name}:</span>
                                        <Badge variant="outline" className="text-sm">
                                          {bv.value ?? 'N/A'}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Légende */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-700 mb-2">Légende</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Non géré (à voir)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Géré (vu)</span>
            </div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-blue-500" />
              <span>Historique conservé {useSupabase ? '(Supabase)' : '(localStorage)'}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            ⚠️ Le statut "Géré/Non géré" est <strong>uniquement</strong> pour cette page. 
            Il n'affecte PAS le formulaire dans "Lectures en Attente" ni les bactéries.
          </p>
        </div>
      </main>
    </div>
  );
};

export default NonConformitesPage;
