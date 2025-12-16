// Hook pour la gestion des produits - Workflow simplifié
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Product, Site, BacterieType, BacterieSelection, ProduitBacterie } from '../types/products';

export const useProductsNew = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [bacteriesTypes, setBacteriesTypes] = useState<BacterieType[]>([]);
  const [airStaticLocations, setAirStaticLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les sites
  const loadSites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('nom');

      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      setError(`Erreur lors du chargement des sites: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Charger les types de bactéries
  const loadBacteriesTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bacteries_types')
        .select('*')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setBacteriesTypes(data || []);
    } catch (error: any) {
      setError(`Erreur lors du chargement des bactéries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Charger les lieux Air Statique
  const loadAirStaticLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('air_static_locations')
        .select('*')
        .eq('is_active', true)
        .order('lieu');

      if (error) {
        console.log('⚠️ Table air_static_locations non disponible:', error.message);
        setAirStaticLocations([]);
        return;
      }

      console.log('🔍 DEBUG - Lieux Air Statique:', data);
      console.log('🔍 DEBUG - Nombre de lieux:', data?.length);
      setAirStaticLocations(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des lieux Air Statique:', error);
      setAirStaticLocations([]);
    }
  };

  // Charger les produits depuis product_thresholds uniquement
  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Charger les produits depuis product_thresholds
      const { data: thresholdsData, error: thresholdsError } = await supabase
        .from('product_thresholds')
        .select('*')
        .eq('is_active', true)
        .order('product_brand');

      if (thresholdsError) throw thresholdsError;
      
      console.log('🔍 DEBUG - Données product_thresholds:', thresholdsData);
      console.log('🔍 DEBUG - Nombre de lignes produits:', thresholdsData?.length);

      // Grouper les produits par (site + product_brand) pour éviter les doublons
      const uniqueProducts = new Map();
      
      (thresholdsData || []).forEach(threshold => {
        const key = `${threshold.site}_${threshold.product_brand}`;
        
        if (!uniqueProducts.has(key)) {
          uniqueProducts.set(key, {
            id: threshold.id,
            site: threshold.site,
            product_brand: threshold.product_brand,
            type: 'product',
            thresholds: []
          });
        }
        
        // Ajouter le seuil à ce produit
        uniqueProducts.get(key).thresholds.push(threshold);
      });

      const productsArray = Array.from(uniqueProducts.values());
      console.log('🔍 DEBUG - Produits uniques:', productsArray);
      console.log('🔍 DEBUG - Nombre de produits:', productsArray.length);

      // Debug spécifique pour "Aliments Sante (AS)"
      const alimentSanteProduct = productsArray.find(p => p.product_brand === 'Aliments Sante (AS)');
      if (alimentSanteProduct) {
        console.log('🥗 DEBUG - Aliments Sante (AS) trouvé:', alimentSanteProduct);
        console.log('🥗 DEBUG - Nombre de seuils:', alimentSanteProduct.thresholds?.length);
        console.log('🥗 DEBUG - Seuils détaillés:', alimentSanteProduct.thresholds);
        
        const phThresholds = alimentSanteProduct.thresholds?.filter(t => 
          t.parameter_type === 'PH' || 
          t.parameter_type === 'Acidité' ||
          t.parameter_type === 'ph' ||
          t.parameter_type === 'acidité' ||
          t.parameter_type === 'pH' ||
          t.parameter_type === 'ACIDITÉ' ||
          t.parameter_type === 'acidity' ||
          t.parameter_type === 'ACIDITY'
        ) || [];
        
        const bacteriaThresholds = alimentSanteProduct.thresholds?.filter(t => 
          t.parameter_type !== 'PH' && 
          t.parameter_type !== 'Acidité' &&
          t.parameter_type !== 'ph' &&
          t.parameter_type !== 'acidité' &&
          t.parameter_type !== 'pH' &&
          t.parameter_type !== 'ACIDITÉ' &&
          t.parameter_type !== 'acidity' &&
          t.parameter_type !== 'ACIDITY'
        ) || [];
        
        console.log('🥗 DEBUG - Seuils PH/Acidité:', phThresholds);
        console.log('🥗 DEBUG - Bactéries:', bacteriaThresholds);
      } else {
        console.log('❌ DEBUG - Aliments Sante (AS) NON TROUVÉ dans les produits');
      }

      setProducts(productsArray);
    } catch (error: any) {
      setError(`Erreur lors du chargement des produits: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Charger les bactéries d'un produit spécifique
  const loadProductBacteries = async (produitId: string) => {
    try {
      const { data, error } = await supabase
        .from('produit_bacteries')
        .select(`
          id,
          seuil,
          actif,
          bacteries_types (
            id,
            nom,
            nom_technique,
            unite
          )
        `)
        .eq('produit_id', produitId)
        .eq('actif', true);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error(`Erreur lors du chargement des bactéries pour le produit ${produitId}:`, error);
      return [];
    }
  };

  // Créer un nouveau produit avec ses bactéries
  const createProduct = async (productData: any, bacteries: BacterieSelection[]) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Créer le produit
      const { data: product, error: productError } = await supabase
        .from('produits')
        .insert([{
          site_id: productData.site_id,
          type_produit: productData.type_produit,
          description: productData.description,
          ph_seuil: productData.ph_seuil,
          actif: productData.actif,
          created_by: productData.created_by
        }])
        .select()
        .single();

      if (productError) throw productError;

      // 2. Créer les relations produit-bactéries
      if (bacteries.length > 0) {
        const bacteriesData = bacteries.map(bacterie => ({
          produit_id: product.id,
          bacterie_id: bacterie.bacterie_id,
          seuil: bacterie.seuil,
          actif: bacterie.actif
        }));

        const { error: bacteriesError } = await supabase
          .from('produit_bacteries')
          .insert(bacteriesData);

        if (bacteriesError) throw bacteriesError;
      }

      // 3. Recharger les produits
      await loadProducts();

      return product;
    } catch (error: any) {
      setError(`Erreur lors de la création du produit: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour un produit
  const updateProduct = async (id: string, productData: any, bacteries: BacterieSelection[]) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Mettre à jour le produit
      const { error: productError } = await supabase
        .from('produits')
        .update({
          nom: productData.nom,
          type_produit: productData.type_produit,
          description: productData.description,
          ph_seuil: productData.ph_seuil,
          actif: productData.actif,
          updated_by: productData.updated_by,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (productError) throw productError;

      // 2. Supprimer les anciennes relations bactéries
      const { error: deleteError } = await supabase
        .from('produit_bacteries')
        .delete()
        .eq('produit_id', id);

      if (deleteError) throw deleteError;

      // 3. Créer les nouvelles relations bactéries
      if (bacteries.length > 0) {
        const bacteriesData = bacteries.map(bacterie => ({
          produit_id: id,
          bacterie_id: bacterie.bacterie_id,
          seuil: bacterie.seuil,
          actif: bacterie.actif
        }));

        const { error: bacteriesError } = await supabase
          .from('produit_bacteries')
          .insert(bacteriesData);

        if (bacteriesError) throw bacteriesError;
      }

      // 4. Recharger les produits
      await loadProducts();

    } catch (error: any) {
      setError(`Erreur lors de la mise à jour du produit: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un produit
  const deleteProduct = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Supprimer les relations bactéries d'abord (CASCADE)
      const { error: bacteriesError } = await supabase
        .from('produit_bacteries')
        .delete()
        .eq('produit_id', id);

      if (bacteriesError) throw bacteriesError;

      // Supprimer le produit
      const { error: productError } = await supabase
        .from('produits')
        .delete()
        .eq('id', id);

      if (productError) throw productError;

      // Recharger les produits
      await loadProducts();

    } catch (error: any) {
      setError(`Erreur lors de la suppression du produit: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Charger les données initiales
  useEffect(() => {
    loadSites();
    loadBacteriesTypes();
    loadProducts();
    loadAirStaticLocations();
  }, []);

  return {
    products,
    sites,
    bacteriesTypes,
    airStaticLocations,
    loading,
    error,
    loadProducts,
    loadSites,
    loadBacteriesTypes,
    loadAirStaticLocations,
    loadProductBacteries,
    createProduct,
    updateProduct,
    deleteProduct
  };
};
