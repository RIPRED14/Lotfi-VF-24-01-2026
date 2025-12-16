// Hook de gestion des produits
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { ProductData, Product, Site } from '../types/products';
import { toast } from 'sonner';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const loadProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase
        .from('produits')
        .select(`
          *,
          sites:site_id (id, nom, adresse, responsable)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      setError(error.message);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };
  
  const loadSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('nom');
      
      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des sites');
    }
  };
  
  const createProduct = async (productData: ProductData, siteId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('produits')
        .insert({
          ...productData,
          site_id: siteId,
          created_by: userId,
          updated_by: userId
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  };
  
  const updateProduct = async (id: string, productData: Partial<ProductData>, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('produits')
        .update({
          ...productData,
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  };
  
  const deleteProduct = async (id: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('produits')
        .update({ 
          actif: false,
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  };
  
  useEffect(() => {
    loadProducts();
    loadSites();
  }, []);
  
  return {
    products,
    sites,
    loading,
    error,
    loadProducts,
    loadSites,
    createProduct,
    updateProduct,
    deleteProduct
  };
};
