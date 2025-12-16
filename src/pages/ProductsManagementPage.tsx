// Page de gestion des produits
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../contexts/AuthContext';
import { useTraceability } from '../hooks/useTraceability';
import { ProductForm } from '../components/products/ProductForm';
import { Product } from '../types/products';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export const ProductsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading, error, loadProducts, updateProduct, deleteProduct } = useProducts();
  const { logAction } = useTraceability();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [action, setAction] = useState<'create' | 'edit' | null>(null);
  
  const handleCreateProduct = () => {
    navigate('/products/new');
  };
  
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setAction('edit');
    setShowForm(true);
  };
  
  const handleDeleteProduct = async (product: Product) => {
    if (!user) {
      toast.error('Utilisateur non authentifié');
      return;
    }
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.nom}" ?`)) {
      try {
        await deleteProduct(product.id, user.id);
        
        // Log de la suppression
        await logAction(
          'DELETE',
          'produits',
          product.id,
          product,
          null,
          {
            reason: 'Suppression du produit',
            category: 'PRODUCT_DELETION',
            impact: 'HIGH'
          }
        );
        
        toast.success('Produit supprimé avec succès');
        loadProducts();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };
  
  const handleFormSubmit = async (productData: any) => {
    if (!user || !selectedProduct) return;
    
    try {
      if (action === 'edit') {
        await updateProduct(selectedProduct.id, productData, user.id);
        
        // Log de la modification
        await logAction(
          'UPDATE',
          'produits',
          selectedProduct.id,
          selectedProduct,
          productData,
          {
            reason: 'Modification des paramètres du produit',
            category: 'PRODUCT_UPDATE',
            impact: 'MEDIUM'
          }
        );
        
        toast.success('Produit modifié avec succès');
      }
      
      setShowForm(false);
      setSelectedProduct(null);
      setAction(null);
      loadProducts();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };
  
  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedProduct(null);
    setAction(null);
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Chargement des produits...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <h3 className="text-red-800 font-semibold">Erreur</h3>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">📦 Gestion des Produits</h1>
            <p className="text-gray-600">Gérez les produits et leurs paramètres de qualité</p>
          </div>
          
          <Button 
            onClick={handleCreateProduct}
            className="bg-green-600 hover:bg-green-700"
          >
            🆕 Nouveau Produit
          </Button>
        </div>
        
        {/* Liste des produits */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>PH</TableHead>
                    <TableHead>Seuils</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.type_produit}</div>
                          {product.description && (
                            <div className="text-sm text-gray-600">{product.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {product.type_produit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{product.site?.nom}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Min: {product.ph_minimum}</div>
                          <div>Max: {product.ph_maximum}</div>
                          <div>Opt: {product.ph_optimal}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Ent: {product.seuil_enterobacteries}</div>
                          <div>Col: {product.seuil_coliformes}</div>
                          <div>E.coli: {product.seuil_ecoli}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.actif ? "default" : "destructive"}>
                          {product.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            ✏️ Modifier
                          </Button>
                          <Button 
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            🗑️ Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Modal de modification */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le Produit</DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <ProductForm
                initialData={selectedProduct}
                siteId={selectedProduct.site_id}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
