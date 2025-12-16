import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, AlertTriangle, Database, RefreshCw, 
  FileText, Users, Settings, Shield, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';

// Seuils microbiologiques codés en dur - SYNCHRONISÉS avec Supabase
const HARDCODED_THRESHOLDS: Record<string, Record<string, number>> = {
  "Fromage pasteurises (FP)": {
    "Escherichia coli": 100,
    "Staphylocoques": 10,
    "Levures/Moisissures (5j)": 5000
  },
  "LAIT": {
    "Flore totales": 300000
  },
  "GYMA 0%": {
    "Entérobactéries": 10,
    "Levures/Moisissures (5j)": 100
  },
  "Grand Frais": {
    "Entérobactéries": 10,
    "Levures/Moisissures (5j)": 100
  },
  "Créme Dessert Collet": {
    "Entérobactéries": 10,
    "Levures/Moisissures (5j)": 100
  },
  "Aliments Sante (AS)": {
    "Flore totales": 10
  },
  "Dessert végétal non fermenté": {
    "Flore totales": 1000,
    "Entérobactéries": 10,
    "Levures/Moisissures (5j)": 100
  },
  "Eaux de rincage": {
    "Flore totales": 10,
    "Entérobactéries": 1,
    "Levures/Moisissures (5j)": 10
  },
  "Mains": {
    "Flore totales": 51,
    "Entérobactéries": 0
  },
  "Materiel": {
    "Flore totales": 30,
    "Entérobactéries": 1,
    "Levures/Moisissures (5j)": 10
  }
};

// Mapping complet des noms de bactéries vers les champs de base de données
const BACTERIA_FIELD_MAPPING: Record<string, string> = {
  'Entérobactéries': 'enterobacteria_count',
  'Levures/Moisissures': 'yeast_mold_count',
  'Listeria': 'listeria_count',
  'Coliformes totaux': 'coliforms_count',
  'Staphylocoques': 'staphylococcus_count',
  'Escherichia coli': 'escherichia_coli_count',
  'Flore totales': 'total_flora_count',
  'Leuconostoc': 'leuconostoc_count',
  'Levures/Moisissures (3j)': 'yeast_mold_3j_count',
  'Levures/Moisissures (5j)': 'yeast_mold_5j_count',
  'Salmonella': 'salmonella_count',
  'Campylobacter': 'campylobacter_count',
  'Clostridium': 'clostridium_count',
  'Bacillus': 'bacillus_count',
  'Pseudomonas': 'pseudomonas_count',
  'Lactobacillus': 'lactobacillus_count',
  'Streptococcus': 'streptococcus_count',
  'Enterococcus': 'enterococcus_count',
  'Vibrio': 'vibrio_count',
  'Shigella': 'shigella_count'
};

interface DatabaseStats {
  samples_count: number;
  forms_count: number;
  r1_samples: number;
  r2_samples: number;
  baiko_samples: number;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DatabaseStats>({
    samples_count: 0,
    forms_count: 0,
    r1_samples: 0,
    r2_samples: 0,
    baiko_samples: 0
  });

  // Vérifier les permissions d'accès
  useEffect(() => {
    if (!user || user.role !== 'coordinator') {
      toast({
        title: "Accès refusé",
        description: "Seuls les demandeurs peuvent accéder à cette page.",
        variant: "destructive"
      });
      navigate('/quality-control');
    }
  }, [user, navigate, toast]);

  // Charger les statistiques de la base de données
  const loadDatabaseStats = async () => {
    try {
      setLoading(true);

      // Compter les échantillons
      const { count: samplesCount } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true });

      // Compter les formulaires uniques
      const { data: formsData } = await supabase
        .from('samples')
        .select('form_id')
        .not('form_id', 'is', null);

      const uniqueForms = new Set(formsData?.map(item => item.form_id) || []);

      // Compter les échantillons R1, R2 et BAIKO
      const { count: r1Count } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('site', 'R1');

      const { count: r2Count } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('site', 'R2');

      const { count: baikoCount } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('site', 'BAIKO');

      setStats({
        samples_count: samplesCount || 0,
        forms_count: uniqueForms.size,
        r1_samples: r1Count || 0,
        r2_samples: r2Count || 0,
        baiko_samples: baikoCount || 0
      });

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques de la base de données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'coordinator') {
      loadDatabaseStats();
    }
  }, [user]);

  // Fonction pour nettoyer complètement la base de données
  const handleCleanDatabase = async () => {
    try {
      setLoading(true);

      // Supprimer toutes les sélections de bactéries
      const { error: bacteriaError } = await supabase
        .from('form_bacteria_selections')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (bacteriaError) throw bacteriaError;

      // Supprimer tous les échantillons
      const { error: samplesError } = await supabase
        .from('samples')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (samplesError) throw samplesError;

      toast({
        title: "Base de données nettoyée",
        description: "Toutes les données ont été supprimées avec succès.",
        duration: 3000
      });

      // Recharger les statistiques
      await loadDatabaseStats();

    } catch (error) {
      console.error('Erreur lors du nettoyage de la base de données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer la base de données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour supprimer seulement les échantillons de test
  const handleCleanTestData = async () => {
    try {
      setLoading(true);

      // Supprimer les sélections de bactéries de test
      const { error: bacteriaError } = await supabase
        .from('form_bacteria_selections')
        .delete()
        .like('form_id', 'test-form-%');

      if (bacteriaError) throw bacteriaError;

      // Supprimer les échantillons de test
      const { error: samplesError } = await supabase
        .from('samples')
        .delete()
        .like('form_id', 'test-form-%');

      if (samplesError) throw samplesError;

      toast({
        title: "Données de test supprimées",
        description: "Tous les formulaires de test ont été supprimés.",
        duration: 3000
      });

      // Recharger les statistiques
      await loadDatabaseStats();

    } catch (error) {
      console.error('Erreur lors de la suppression des données de test:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les données de test",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour recalculer TOUS les résultats selon la nouvelle logique (Microbio uniquement)
  const handleRecalculateAllResults = async () => {
    try {
      setLoading(true);
      toast({
        title: "Démarrage du recalcul...",
        description: "Récupération des données en cours...",
      });

      // 1. Charger TOUTES les données nécessaires
      const { data: samples, error: samplesError } = await supabase.from('samples').select('*');
      if (samplesError) throw samplesError;

      const { data: thresholds, error: thresholdsError } = await supabase.from('product_thresholds').select('*').eq('is_active', true);
      if (thresholdsError) throw thresholdsError;

      const { data: airStaticLocs, error: airStaticError } = await supabase.from('air_static_locations').select('*').eq('is_active', true);
      if (airStaticError) throw airStaticError;

      const { data: bacteriaSelections, error: bacteriaError } = await supabase.from('form_bacteria_selections').select('*');
      if (bacteriaError) throw bacteriaError;

      const { data: ufcData, error: ufcError } = await supabase.from('ufc_count_levures_moisissures').select('*');
      if (ufcError) throw ufcError;

      console.log(`📊 Données chargées: ${samples?.length} échantillons, ${thresholds?.length} seuils, ${bacteriaSelections?.length} sélections.`);

      // Fonction de calcul UFC (locale)
      const calculateUfc = (levuresComptees: number, volumePrelevement: number): number => {
        const ufcRow = ufcData?.find((row: any) => row.levures_comptees === levuresComptees);
        if (!ufcRow) return levuresComptees;
        switch (volumePrelevement) {
          case 100: return ufcRow.volume_100ml || 0;
          case 250: return ufcRow.volume_250ml || 0;
          case 500: return ufcRow.volume_500ml || 0;
          default: return levuresComptees;
        }
      };

      // Fonction de validation (locale)
      const validateMicrobio = (sample: any, bacteriaName: string, value: number) => {
        const site = sample.site;
        const brand = sample.brand;
        const productType = sample.product;

        // --- LOGIQUE SPÉCIALE AJ/DLC pour Fromage FP (Migration V1.1.0) ---
        // Si Fromage pasteurises (FP) ou Fromage pasteurise (FP) ET DLC => Seuil Levures/Moisissures (5j) passe à 50 001
        const normalizedBrand = brand ? brand.trim().toLowerCase() : '';
        const isFromageFP = normalizedBrand === 'fromage pasteurises (fp)' || normalizedBrand === 'fromage pasteurise (fp)';
        
        const normalizedBacteria = bacteriaName ? bacteriaName.trim().toLowerCase() : '';
        const isLevuresMoisissures5j = 
          normalizedBacteria === 'levures/moisissures (5j)' || 
          normalizedBacteria === 'levures/moisissures' ||
          normalizedBacteria.includes('levures/moisissures');

        if (isFromageFP && isLevuresMoisissures5j) {
          const ajDlcValue = sample.aj_dlc || sample.ajDlc; // Gérer les deux noms de champ possibles
          
          // Normalisation pour éviter les erreurs de casse ou d'espaces
          if (ajDlcValue && ajDlcValue.trim().toUpperCase() === 'DLC') {
            const limit = 50001;
            return value < limit ? 'valid' : 'invalid';
          }
        }
        // ------------------------------------------------------------------

        // Air Statique
        if (brand === "Air Statique") {
          const location = airStaticLocs?.find((l: any) => 
            (l.site === site || l.site === 'Laiterie Collet (R1)' || l.site === 'R1' || l.site === 'R2') &&
            l.lieu === productType
          );
          
          if (location) {
            // Calculer UFC si nécessaire (Levures/Moisissures)
            let finalValue = value;
            if (bacteriaName === 'Levures/Moisissures (5j)' && ufcData) {
               finalValue = calculateUfc(value, location.volume_prelevement);
            }

            if (location.limite_max === 0 && location.comparison_operator === '=') {
              return finalValue === 0 ? 'valid' : 'invalid';
            } else {
              return finalValue < location.limite_max ? 'valid' : 'invalid';
            }
          }
          return 'normal';
        }

        // Autres produits : Recherche dans thresholds (Supabase)
        let threshold = thresholds?.find((t: any) => 
          t.product_brand === brand && t.parameter_type === bacteriaName && t.is_active
        );

        // Fallback variations de noms
        if (!threshold) {
           const variations = [
            bacteriaName,
            bacteriaName.replace(/&/g, 'et'),
            bacteriaName.replace(/\(/g, '').replace(/\)/g, ''),
           ];
           threshold = thresholds?.find((t: any) => 
             t.product_brand === brand && variations.some((v: string) => v === t.parameter_type) && t.is_active
           );
        }

        if (threshold) {
          if (threshold.max_value !== null) {
             if (threshold.comparison_operator === '<') return value < threshold.max_value ? 'valid' : 'invalid';
             if (threshold.comparison_operator === '<=') return value <= threshold.max_value ? 'valid' : 'invalid';
             if (threshold.comparison_operator === '=') return value === threshold.max_value ? 'valid' : 'invalid';
          }
        }

        // Fallback HARDCODED
        const hardcoded = HARDCODED_THRESHOLDS[brand];
        if (hardcoded && hardcoded[bacteriaName] !== undefined) {
           const limit = hardcoded[bacteriaName];
           return limit === 0 ? (value === 0 ? 'valid' : 'invalid') : (value < limit ? 'valid' : 'invalid');
        }

        return 'normal';
      };

      let updatedCount = 0;
      let errorCount = 0;

      // 2. Itérer et recalculer
      for (const sample of samples || []) {
        // Retrouver les bactéries sélectionnées pour ce FORMULAIRE
        const sampleBacteria = bacteriaSelections?.filter((b: any) => b.form_id === sample.form_id) || [];
        
        if (sampleBacteria.length === 0) continue;

        let isNonConforme = false;

        // Vérifier chaque bactérie
        for (const bacteria of sampleBacteria) {
          const fieldName = BACTERIA_FIELD_MAPPING[bacteria.bacteria_name] || 'enterobacteria_count';
          const value = sample[fieldName];

          if (value !== null && value !== undefined && value !== '') {
             const numValue = parseFloat(value);
             if (!isNaN(numValue)) {
                const status = validateMicrobio(sample, bacteria.bacteria_name, numValue);
                if (status === 'invalid') {
                   isNonConforme = true;
                   break; // Un seul échec suffit
                }
             }
          }
        }

        const newResult = isNonConforme ? 'Non-conforme' : 'Conforme';

        // Si le résultat change (ou est vide), mettre à jour
        if (sample.resultat !== newResult) {
           console.log(`🔄 UPDATE Sample ${sample.id} (${sample.product}): ${sample.resultat} -> ${newResult}`);
           const { error } = await supabase
             .from('samples')
             .update({ resultat: newResult })
             .eq('id', sample.id);
           
           if (error) {
             console.error('Erreur update:', error);
             errorCount++;
           } else {
             updatedCount++;
           }
        }
      }

      toast({
        title: "Recalcul terminé",
        description: `${updatedCount} échantillons mis à jour. ${errorCount} erreurs.`,
        duration: 5000
      });
      
      // Recharger les stats
      loadDatabaseStats();

    } catch (error) {
      console.error('Erreur critique recalcul:', error);
      toast({
        title: "Erreur critique",
        description: "Le recalcul a échoué.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'coordinator') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Administration" 
        hideMenuItems={['Lectures en Attente', 'Historique', 'Formulaires', 'Administration']} 
      />

      <div className="bg-[#0d47a1] text-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Panneau d'Administration
            </h1>
          </div>
          <Badge className="bg-white text-[#0d47a1] font-semibold">
            Demandeur
          </Badge>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Statistiques de la base de données */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Échantillons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.samples_count}</div>
              <p className="text-xs text-muted-foreground">Total dans la BDD</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Formulaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.forms_count}</div>
              <p className="text-xs text-muted-foreground">Formulaires uniques</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Échantillons R1
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.r1_samples}</div>
              <p className="text-xs text-muted-foreground">Site R1</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Échantillons R2
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.r2_samples}</div>
              <p className="text-xs text-muted-foreground">Site R2</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Échantillons BAIKO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.baiko_samples}</div>
              <p className="text-xs text-muted-foreground">Site BAIKO</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions d'administration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Gestion des données
              </CardTitle>
              <CardDescription>
                Outils pour gérer et nettoyer les données de l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={loadDatabaseStats}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser les statistiques
              </Button>

              <Button
                onClick={handleRecalculateAllResults}
                disabled={loading}
                variant="outline"
                className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculer tous les résultats (Migration V1.1.0)
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer les données de test
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Supprimer les données de test
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera tous les formulaires commençant par "test-form-".
                      Les données de production ne seront pas affectées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCleanTestData}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Supprimer les données de test
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={loading}
                    className="w-full"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Nettoyer toute la base de données
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Nettoyer complètement la base de données
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      ⚠️ <strong>ATTENTION :</strong> Cette action supprimera TOUTES les données de l'application :
                      <br />• {stats.samples_count} échantillons
                      <br />• {stats.forms_count} formulaires
                      <br />• {stats.r1_samples} échantillons R1
                      <br />• {stats.r2_samples} échantillons R2
                      <br />• {stats.baiko_samples} échantillons BAIKO
                      <br /><br />Cette action est irréversible !
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCleanDatabase}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Nettoyer la base de données
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Navigation rapide
              </CardTitle>
              <CardDescription>
                Accès rapide aux différentes sections de l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => navigate('/sample-entry')}
                variant="outline"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Saisie d'échantillons
              </Button>

              <Button
                onClick={() => navigate('/lectures-en-attente')}
                variant="outline"
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Lectures en attente
              </Button>

              <Button
                onClick={() => navigate('/quality-control')}
                variant="outline"
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Contrôle qualité
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informations système */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Informations système</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Utilisateur :</strong> {user?.name || 'Non défini'}
              </div>
              <div>
                <strong>Rôle :</strong> {user?.role || 'Non défini'}
              </div>
              <div>
                <strong>Dernière mise à jour :</strong> {new Date().toLocaleString('fr-FR')}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminPage;
