// Page de création de produit
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductForm } from '../components/products/ProductForm';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../contexts/AuthContext';
import { useTraceability } from '../hooks/useTraceability';
import { ProductData } from '../types/products';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

export const ProductCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProduct, sites, loadSites } = useProducts();
  const { logAction } = useTraceability();
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadSites();
  }, [loadSites]);
  
  const handleSubmit = async (productData: ProductData) => {
    if (!selectedSite) {
      toast.error('Veuillez sélectionner un site');
      return;
    }
    
    if (!user) {
      toast.error('Utilisateur non authentifié');
      return;
    }
    
    setLoading(true);
    
    try {
      const newProduct = await createProduct(productData, selectedSite, user.id);
      
      // Log de la création
      await logAction(
        'CREATE',
        'produits',
        newProduct.id,
        null,
        newProduct,
        {
          reason: 'Création d\'un nouveau produit',
          category: 'PRODUCT_CREATION',
          impact: 'HIGH'
        }
      );
      
      toast.success('Produit créé avec succès !');
      navigate('/products');
    } catch (error) {
      toast.error('Erreur lors de la création du produit');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    navigate('/products');
  };
  
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">🆕 Nouveau Produit</h1>
          <p className="text-gray-600">Créez un nouveau produit avec ses paramètres de qualité</p>
        </div>
        
        {/* Sélection du site */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1️⃣ Sélection du Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site">Site de Production *</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSite && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Site Sélectionné:</h3>
                <p className="text-blue-700">
                  {sites.find(s => s.id === selectedSite)?.nom}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Formulaire de produit */}
        {selectedSite && (
          <ProductForm
            siteId={selectedSite}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};
