// Page de création de produit - Workflow simplifié selon vos spécifications
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductData, BacterieSelection } from '../types/products';
import { ProductFormNew } from '../components/products/ProductFormNew';
import { useProductsNew } from '../hooks/useProductsNew';
import { supabase } from '../integrations/supabase/client';
import { useTraceability } from '../hooks/useTraceability';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export const ProductCreationPageNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logAction } = useTraceability();
  const { sites, bacteriesTypes, createProduct, loading, error } = useProductsNew();

  // Fonction pour parser les seuils (copiée de ProductsManagementPageNew)
  const parseThreshold = (thresholdStr: string) => {
    const cleanStr = thresholdStr.trim();
    
    // Format "X à Y" (between)
    if (cleanStr.includes(' à ')) {
      const parts = cleanStr.split(' à ');
      return {
        min_value: parseFloat(parts[0]),
        max_value: parseFloat(parts[1]),
        comparison_operator: 'between'
      };
    }
    
    // Format "> X" ou "< X"
    if (cleanStr.startsWith('>')) {
      return {
        min_value: parseFloat(cleanStr.substring(1)),
        max_value: null,
        comparison_operator: '>'
      };
    }
    
    if (cleanStr.startsWith('<')) {
      return {
        min_value: null,
        max_value: parseFloat(cleanStr.substring(1)),
        comparison_operator: '<'
      };
    }
    
    // Format simple "X" (=)
    return {
      min_value: parseFloat(cleanStr),
      max_value: parseFloat(cleanStr),
      comparison_operator: '='
    };
  };

  // Fonction pour créer un nouveau produit dans product_thresholds
  const createNewProduct = async (productData: any, bacteries: BacterieSelection[]) => {
    try {
      console.log('🆕 Création d\'un nouveau produit:', productData.nom);
      console.log('📊 Données reçues:', { productData, bacteries });
      console.log('🔍 DEBUG - sites disponibles:', sites);
      console.log('🔍 DEBUG - bacteriesTypes disponibles:', bacteriesTypes);

      // Trouver le site correspondant
      console.log('🔍 DEBUG - Recherche du site avec ID:', productData.site_id);
      const site = sites.find(s => s.id === productData.site_id);
      if (!site) {
        console.error('❌ Site non trouvé avec ID:', productData.site_id);
        console.error('❌ Sites disponibles:', sites.map(s => ({ id: s.id, nom: s.nom })));
        throw new Error('Site non trouvé');
      }

      const siteName = site.nom; // Utiliser le nom du site (ex: "R1")
      console.log('✅ Site trouvé:', siteName);

      // 1. Créer le seuil PH/Acidité si défini
      if (productData.ph_seuil !== undefined && productData.ph_seuil !== null && productData.ph_seuil.trim() !== '') {
        console.log('1️⃣ Création du seuil PH/Acidité...');
        
        const phThreshold = parseThreshold(productData.ph_seuil);
        const { error: phError } = await supabase
          .from('product_thresholds')
          .insert({
            site: siteName,
            product_brand: productData.nom,
            parameter_type: 'pH',
            min_value: phThreshold.min_value,
            max_value: phThreshold.max_value,
            comparison_operator: phThreshold.comparison_operator,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (phError) {
          console.error('❌ Erreur création seuil PH:', phError);
          throw phError;
        }
        console.log('✅ Seuil PH/Acidité créé');
      }

      // 2. Créer les seuils des bactéries
      if (bacteries && bacteries.length > 0) {
        console.log('2️⃣ Création des seuils bactéries...');
        
        for (const bacterie of bacteries) {
          const bacterieType = bacteriesTypes?.find(bt => bt.id === bacterie.bacterie_id);
          if (!bacterieType) {
            console.warn(`⚠️ Type de bactérie non trouvé: ${bacterie.bacterie_id}`);
            continue;
          }

          console.log(`   • ${bacterieType.nom}: ${bacterie.seuil}`);

          const bacterieThreshold = parseThreshold(bacterie.seuil);
          const { error: bacterieError } = await supabase
            .from('product_thresholds')
            .insert({
              site: siteName,
              product_brand: productData.nom,
              parameter_type: bacterieType.nom,
              min_value: bacterieThreshold.min_value,
              max_value: bacterieThreshold.max_value,
              comparison_operator: bacterieThreshold.comparison_operator,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (bacterieError) {
            console.error(`❌ Erreur création seuil ${bacterieType.nom}:`, bacterieError);
            throw bacterieError;
          }
        }
        console.log('✅ Seuils bactéries créés');
      }

      console.log('🎉 Produit créé avec succès dans product_thresholds');
      return true;
    } catch (error) {
      console.error('💥 Erreur lors de la création du produit:', error);
      throw error;
    }
  };
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const handleSiteSelect = (siteId: string) => {
    setSelectedSiteId(siteId);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: ProductData, bacteries: BacterieSelection[]) => {
    try {
      console.log('🚀 DEBUG - handleFormSubmit démarré');
      setFormLoading(true);
      
      // Ajouter les métadonnées
      const productData = {
        ...data,
        site_id: selectedSiteId,
        created_by: user?.email || 'unknown',
        updated_by: user?.email || 'unknown'
      };

      console.log('📝 DEBUG - productData final:', productData);
      console.log('🦠 DEBUG - bacteries finales:', bacteries);

      // Créer le produit dans product_thresholds (pour qu'il apparaisse dans technical-info)
      console.log('🔄 DEBUG - Appel à createNewProduct...');
      await createNewProduct(productData, bacteries);
      console.log('✅ DEBUG - createNewProduct terminé avec succès');
      
      // Log de la création
      await logAction(
        'CREATE',
        'product_thresholds',
        null,
        null,
        { ...productData, bacteries },
        {
          reason: 'Création d\'un nouveau produit avec bactéries',
          category: 'PRODUCT_CREATION',
          impact: 'HIGH',
          bacteries_count: bacteries.length
        }
      );

      // Redirection vers la gestion des produits
      navigate('/products', { 
        state: { 
          message: 'Produit créé avec succès !',
          type: 'success'
        }
      });
      
    } catch (error: any) {
      console.error('💥 DEBUG - Erreur dans handleFormSubmit:', error);
      console.error('💥 DEBUG - Type d\'erreur:', typeof error);
      console.error('💥 DEBUG - Message d\'erreur:', error.message);
      console.error('💥 DEBUG - Stack trace:', error.stack);
      toast.error('Erreur lors de la création du produit');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = () => {
    if (showForm) {
      setShowForm(false);
      setSelectedSiteId('');
    } else {
      navigate('/products');
    }
  };

  const selectedSite = sites.find(site => site.id === selectedSiteId);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Intégration de Nouveau Produit
            </h1>
            <p className="text-gray-600 mt-2">
              Workflow simplifié : Site → Nom → PH → Bactéries → Seuils
            </p>
          </div>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {/* Étape 1: Sélection du site */}
        {!showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                  1
                </span>
                Sélection du Site
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Choisissez le site où ce produit sera analysé :
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="site-select">Site *</Label>
                  <Select value={selectedSiteId} onValueChange={handleSiteSelect}>
                    <SelectTrigger id="site-select">
                      <SelectValue placeholder="Sélectionner un site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{site.nom}</span>
                            {site.adresse && (
                              <span className="text-sm text-gray-500">{site.adresse}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSiteId && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Site sélectionné :</span>
                    </div>
                    <p className="text-green-700 mt-1">
                      {selectedSite?.nom}
                    </p>
                    {selectedSite?.adresse && (
                      <p className="text-green-600 text-sm mt-1">
                        {selectedSite.adresse}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Formulaire de création */}
        {showForm && selectedSite && (
          <div className="space-y-6">
            {/* Récapitulatif du site */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Site sélectionné</h3>
                    <p className="text-blue-700">{selectedSite.nom}</p>
                    {selectedSite.adresse && (
                      <p className="text-blue-600 text-sm">{selectedSite.adresse}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    className="text-blue-700 border-blue-300"
                  >
                    Changer de site
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Formulaire */}
            <ProductFormNew
              siteId={selectedSiteId}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
              loading={formLoading}
            />
          </div>
        )}

        {/* Instructions */}
        <Card className="mt-8 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">📋 Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium min-w-[24px] text-center">1</span>
                <div>
                  <strong>Sélection du site :</strong> Choisissez le site où le produit sera analysé
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium min-w-[24px] text-center">2</span>
                <div>
                  <strong>Nom du produit :</strong> Entrez le nom et type du produit
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium min-w-[24px] text-center">3</span>
                <div>
                  <strong>PH du produit :</strong> Définissez le seuil PH (ex: &lt; 7, &gt; 6.5)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium min-w-[24px] text-center">4</span>
                <div>
                  <strong>Bactéries à analyser :</strong> Sélectionnez les bactéries et leurs seuils
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium min-w-[24px] text-center">5</span>
                <div>
                  <strong>Validation :</strong> Le produit sera intégré dans l'application et la base de données
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
