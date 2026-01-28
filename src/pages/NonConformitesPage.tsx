import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  RefreshCw, AlertTriangle, Filter, Eye, XCircle, 
  FileText, Beaker, Building, Calendar, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';

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

const NonConformitesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nonConformForms, setNonConformForms] = useState<NonConformForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);

  useEffect(() => {
    loadNonConformForms();
  }, []);

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
      // = Formulaires qui ne sont PAS entièrement complétés
      const formIdsInLecturesEnAttente: string[] = [];
      const formBacteriaInfo: Record<string, { total: number, completed: number, completedBacteria: string[] }> = {};

      Object.entries(bacteriaByFormId).forEach(([formId, bacteriaList]) => {
        const completedBacteria = bacteriaList.filter(b => b.status === 'completed');
        const isFullyCompleted = bacteriaList.length > 0 && bacteriaList.every(b => b.status === 'completed');
        
        // Un formulaire est dans "Lectures en Attente" s'il n'est PAS entièrement complété
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

      // 4. Récupérer les échantillons de ces formulaires
      // FILTRE SIMPLE: resultat = 'Non-conforme'
      const { data: samplesData, error: samplesError } = await fetchAllRecords(
        'samples',
        'id, form_id, number, product, brand, site, report_title, created_at, resultat, enterobacteria_count, yeast_mold_count, listeria_count, coliforms_count, staphylococcus_count, escherichia_coli_count, total_flora_count, leuconostoc_count, yeast_mold_3j_count, yeast_mold_5j_count'
      );

      if (samplesError) {
        console.error('❌ Erreur échantillons:', samplesError);
        setLoading(false);
        return;
      }

      // Filtrer: 
      // - Formulaires dans Lectures en Attente
      // - Échantillons avec resultat = 'Non-conforme'
      // - Formulaires avec au moins une bactérie complétée
      const nonConformSamples = samplesData?.filter(s => 
        s.form_id && 
        formIdsInLecturesEnAttente.includes(s.form_id) &&
        s.resultat === 'Non-conforme' &&
        formBacteriaInfo[s.form_id]?.completed > 0
      ) || [];

      console.log('🔴 Échantillons non-conformes dans Lectures en Attente:', nonConformSamples.length);

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
        
        // Récupérer les valeurs des bactéries complétées
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

      // Convertir en tableau et trier par date (plus récent en premier)
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
    if (selectedSite === 'all') {
      return nonConformForms;
    }
    return nonConformForms.filter(form => form.site === selectedSite);
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8" />
                Non-Conformités Bactériologiques
              </h1>
              <p className="text-red-100 text-lg">
                Formulaires de "Lectures en Attente" avec des résultats <strong>Non-conforme</strong>
              </p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30">
                <div className="text-3xl font-bold text-white">{getTotalNonConformSamples()}</div>
                <div className="text-red-200 text-sm">Échantillon(s) non conforme(s)</div>
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
                Cette page affiche les formulaires de <strong>"Lectures en Attente"</strong> où un échantillon a un résultat <strong>"Non-conforme"</strong> et au moins une bactérie complétée.
                C'est un simple filtre d'affichage - les formulaires restent dans "Lectures en Attente".
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold text-red-800">
                  Échantillons Non-Conformes
                </CardTitle>
                <CardDescription>
                  Formulaires en attente avec résultat = "Non-conforme"
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {/* Filtre par site */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrer par site" />
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
                  onClick={loadNonConformForms}
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
                <h3 className="text-lg font-medium text-gray-700 mb-1">Aucune non-conformité pour ce site</h3>
                <p className="text-gray-500">Aucun formulaire avec non-conformité pour le site sélectionné.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Affichage du nombre de formulaires filtrés */}
                {selectedSite !== 'all' && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-900">
                        Filtré par site: {selectedSite}
                      </span>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {getFilteredForms().length} formulaire(s)
                    </Badge>
                  </div>
                )}

                {getFilteredForms().map((form) => (
                  <div 
                    key={form.form_id} 
                    className="border border-red-200 rounded-xl bg-white overflow-hidden"
                  >
                    {/* En-tête du formulaire */}
                    <div 
                      className="p-6 bg-gradient-to-r from-red-50 to-orange-50 cursor-pointer hover:from-red-100 hover:to-orange-100 transition-colors"
                      onClick={() => toggleExpand(form.form_id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            {form.report_title}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm text-gray-600">
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
                              <span>Bactéries: <strong>{form.completed_bacteria}/{form.total_bacteria} complétées</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>Date: <strong>{format(new Date(form.sample_date || form.created_at), 'dd/MM/yyyy', { locale: fr })}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className="bg-red-500 text-white text-sm px-3 py-1">
                            {form.non_conform_samples.length} échantillon(s) NC
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {expandedFormId === form.form_id ? '▲ Réduire' : '▼ Voir détails'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Détails des échantillons non conformes (expandable) */}
                    {expandedFormId === form.form_id && (
                      <div className="p-6 border-t border-red-200 bg-white">
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
                              
                              {/* Afficher les valeurs des bactéries complétées */}
                              {sample.completed_bacteria_values.length > 0 && (
                                <div className="mt-3 flex items-center gap-4 flex-wrap">
                                  <span className="text-sm text-gray-600">Bactéries remplies:</span>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Légende */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-700 mb-2">Comment ça fonctionne</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Résultat = "Non-conforme"</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Bactérie complétée (remplie)</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <span>Filtre d'affichage uniquement</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NonConformitesPage;
