import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  RefreshCw, AlertTriangle, Filter, Eye, XCircle, 
  FileText, Beaker, Building, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';

// Fonction helper pour récupérer TOUS les enregistrements avec pagination
const fetchAllRecords = async (table: string, selectFields: string, filters?: { eq?: Record<string, any>, neq?: Record<string, any>, in?: { field: string, values: string[] }, ilike?: { field: string, value: string } }) => {
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
    if (filters?.ilike) {
      query = query.ilike(filters.ilike.field, filters.ilike.value);
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

// Interface pour les formulaires avec non-conformités
interface NonConformForm {
  form_id: string;
  report_title: string;
  brand: string;
  site: string;
  sample_count: number;
  non_conform_count: number;
  non_conform_samples: NonConformSample[];
  created_at: string;
  sample_date?: string;
}

// Interface pour les échantillons non conformes
interface NonConformSample {
  id: string;
  number: string;
  product: string;
  brand: string;
  resultat: string;
  bacteria_details?: string[];
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
      console.log('🔴 Chargement des formulaires avec non-conformités...');

      // 1. Récupérer les échantillons avec résultat "Non-conforme"
      const { data: nonConformSamples, error: samplesError } = await fetchAllRecords(
        'samples',
        'id, form_id, number, product, brand, site, report_title, resultat, created_at, modified_at, enterobacteria_count, yeast_mold_count, listeria_count, coliforms_count, staphylococcus_count, escherichia_coli_count, total_flora_count, leuconostoc_count'
      );

      if (samplesError) {
        console.error('❌ Erreur échantillons:', samplesError);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les échantillons",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Filtrer les échantillons non conformes
      const filteredNonConform = nonConformSamples?.filter(s => 
        s.resultat && 
        (s.resultat.toLowerCase().includes('non-conforme') || 
         s.resultat.toLowerCase().includes('non conforme'))
      ) || [];

      console.log('🔴 Échantillons non conformes trouvés:', filteredNonConform.length);

      if (filteredNonConform.length === 0) {
        setNonConformForms([]);
        setLoading(false);
        return;
      }

      // 2. Extraire les form_ids uniques des échantillons non conformes
      const formIds = [...new Set(filteredNonConform.map(s => s.form_id).filter(Boolean))];
      console.log('📋 Form IDs avec non-conformités:', formIds.length);

      // 3. Vérifier que ces formulaires existent dans form_bacteria_selections (= dans lectures en attente)
      const { data: bacteriaData, error: bacteriaError } = await fetchAllRecords(
        'form_bacteria_selections',
        'form_id, bacteria_name, status',
        { neq: { status: 'cancelled' } }
      );

      if (bacteriaError) {
        console.error('❌ Erreur bactéries:', bacteriaError);
      }

      // Créer un set des form_ids présents dans lectures en attente
      const formsInLecturesEnAttente = new Set(bacteriaData?.map(b => b.form_id).filter(Boolean) || []);
      console.log('📋 Formulaires dans Lectures en Attente:', formsInLecturesEnAttente.size);

      // Filtrer pour ne garder que les form_ids qui sont AUSSI dans lectures en attente
      const validFormIds = formIds.filter(fid => formsInLecturesEnAttente.has(fid));
      console.log('✅ Formulaires avec non-conformités ET dans Lectures en Attente:', validFormIds.length);

      // 4. Récupérer les infos depuis sample_forms
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

      // 5. Grouper les échantillons non conformes par form_id
      const formGroups: Record<string, NonConformForm> = {};

      filteredNonConform.forEach(sample => {
        const formId = sample.form_id;
        if (!formId || !validFormIds.includes(formId)) return;

        const formInfo = sampleFormsMap.get(formId);
        const brandDisplayName = getBrandDisplayName(sample.brand);

        // Déterminer les bactéries problématiques
        const bacteriaProblems: string[] = [];
        if (sample.enterobacteria_count !== null && sample.enterobacteria_count !== undefined) {
          bacteriaProblems.push(`Entérobactéries: ${sample.enterobacteria_count}`);
        }
        if (sample.escherichia_coli_count !== null && sample.escherichia_coli_count !== undefined) {
          bacteriaProblems.push(`E.coli: ${sample.escherichia_coli_count}`);
        }
        if (sample.coliforms_count !== null && sample.coliforms_count !== undefined) {
          bacteriaProblems.push(`Coliformes: ${sample.coliforms_count}`);
        }
        if (sample.staphylococcus_count !== null && sample.staphylococcus_count !== undefined) {
          bacteriaProblems.push(`Staphylocoques: ${sample.staphylococcus_count}`);
        }
        if (sample.listeria_count !== null && sample.listeria_count !== undefined) {
          bacteriaProblems.push(`Listeria: ${sample.listeria_count}`);
        }
        if (sample.yeast_mold_count !== null && sample.yeast_mold_count !== undefined) {
          bacteriaProblems.push(`Levures/Moisissures: ${sample.yeast_mold_count}`);
        }
        if (sample.total_flora_count !== null && sample.total_flora_count !== undefined) {
          bacteriaProblems.push(`Flore totale: ${sample.total_flora_count}`);
        }
        if (sample.leuconostoc_count !== null && sample.leuconostoc_count !== undefined) {
          bacteriaProblems.push(`Leuconostoc: ${sample.leuconostoc_count}`);
        }

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
            non_conform_count: 0,
            non_conform_samples: [],
            created_at: sample.created_at,
            sample_date: formInfo?.sample_date || sample.created_at
          };
        }

        formGroups[formId].sample_count++;
        formGroups[formId].non_conform_count++;
        formGroups[formId].non_conform_samples.push({
          id: sample.id,
          number: sample.number,
          product: sample.product,
          brand: brandDisplayName,
          resultat: sample.resultat,
          bacteria_details: bacteriaProblems
        });
      });

      // Convertir en tableau et trier par date (plus récent en premier)
      const sortedForms = Object.values(formGroups).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log('✅ Formulaires avec non-conformités traités:', sortedForms.length);
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
    return nonConformForms.reduce((total, form) => total + form.non_conform_count, 0);
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
                Visualisation des formulaires avec des résultats non conformes (lecture seule)
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
                Cette page affiche les formulaires présents dans "Lectures en Attente" qui contiennent des non-conformités bactériologiques.
                Aucune modification n'est possible ici. Pour modifier les données, utilisez la page "Lectures en Attente".
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold text-red-800">
                  Formulaires avec Non-Conformités
                </CardTitle>
                <CardDescription>
                  Liste des formulaires contenant au moins un échantillon non conforme
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
                <h3 className="text-xl font-medium text-green-800 mb-2">Aucune non-conformité détectée</h3>
                <p className="text-green-600">Tous les formulaires en attente ont des résultats conformes.</p>
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
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span>Échantillons: <strong>{form.sample_count}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>Date: <strong>{format(new Date(form.sample_date || form.created_at), 'dd/MM/yyyy', { locale: fr })}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className="bg-red-500 text-white text-sm px-3 py-1">
                            {form.non_conform_count} non-conforme(s)
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {expandedFormId === form.form_id ? '▲ Cliquer pour réduire' : '▼ Cliquer pour voir les détails'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Détails des échantillons non conformes (expandable) */}
                    {expandedFormId === form.form_id && (
                      <div className="p-6 border-t border-red-200 bg-white">
                        <h4 className="text-sm font-semibold text-red-800 mb-4 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Détails des échantillons non conformes:
                        </h4>
                        <div className="space-y-3">
                          {form.non_conform_samples.map((sample) => (
                            <div 
                              key={sample.id} 
                              className="p-4 bg-red-50 border border-red-200 rounded-lg"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-medium text-gray-900">
                                    Échantillon #{sample.number}
                                  </span>
                                  <span className="text-gray-500 ml-2">
                                    ({sample.product})
                                  </span>
                                </div>
                                <Badge className="bg-red-100 text-red-800 border border-red-300">
                                  {sample.resultat}
                                </Badge>
                              </div>
                              
                              {sample.bacteria_details && sample.bacteria_details.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-medium text-gray-600 mb-2">
                                    Valeurs bactériologiques relevées:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {sample.bacteria_details.map((detail, idx) => (
                                      <span 
                                        key={idx}
                                        className="text-xs bg-white px-2 py-1 rounded border border-red-200 text-red-700"
                                      >
                                        {detail}
                                      </span>
                                    ))}
                                  </div>
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
          <h4 className="font-medium text-gray-700 mb-2">Légende</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Non-conforme (seuil bactériologique dépassé)</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <span>Consultation uniquement - Aucune modification possible</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NonConformitesPage;
