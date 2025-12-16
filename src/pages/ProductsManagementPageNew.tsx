// Page de gestion des produits - Version avec nouveau workflow
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductsNew } from '../hooks/useProductsNew';
import { ChevronDown, ChevronRight, Plus, MapPin, Droplets, Target, Edit, Trash2, Eye, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTraceability } from '../hooks/useTraceability';
import { ProductFormNew } from '../components/products/ProductFormNew';
import { AirStaticLocationForm } from '../components/airStatic/AirStaticLocationForm';
import { Product, BacterieSelection } from '../types/products';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { supabase } from '../integrations/supabase/client';

export const ProductsManagementPageNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, sites, bacteriesTypes, airStaticLocations, loading, error, loadProducts, loadAirStaticLocations, updateProduct, deleteProduct } = useProductsNew();
  const { logAction } = useTraceability();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [action, setAction] = useState<'create' | 'edit' | null>(null);
  const [airStaticExpanded, setAirStaticExpanded] = useState(false);
  
  // États pour la gestion Air Statique
  const [selectedAirStaticLocation, setSelectedAirStaticLocation] = useState<any>(null);
  const [showAirStaticForm, setShowAirStaticForm] = useState(false);
  const [airStaticAction, setAirStaticAction] = useState<'create' | 'edit' | null>(null);
  
  // État pour le filtre par site
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  
  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setAction('create');
    setShowForm(true);
  };
  
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setAction('edit');
    setShowForm(true);
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };
  
  const handleDeleteProduct = async (product: Product) => {
    if (!user) {
      toast.error('Utilisateur non authentifié');
      return;
    }
    
    const confirmMessage = `⚠️ ATTENTION : Suppression définitive du produit "${product.product_brand}"\n\nCette action va supprimer :\n• Tous les seuils PH et bactéries\n• Toutes les analyses associées\n• Tous les échantillons\n• Toutes les données liées\n\nCette action est IRRÉVERSIBLE !\n\nÊtes-vous absolument sûr ?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ Suppression complète du produit:', product.product_brand);
        
        // Suppression complète du produit et de toutes ses données
        await deleteProductCompletely(product);
        
        // Log de la suppression
        await logAction(
          'DELETE',
          'product_thresholds',
          product.id,
          product,
          null,
          {
            reason: 'Suppression complète du produit et de toutes ses données',
            category: 'PRODUCT_DELETION',
            impact: 'CRITICAL',
            deleted_thresholds: product.thresholds?.length || 0
          }
        );
        
        toast.success(`Produit "${product.product_brand}" supprimé complètement avec succès`);
        loadProducts();
      } catch (error) {
        console.error('❌ Erreur lors de la suppression complète:', error);
        toast.error('Erreur lors de la suppression complète du produit');
      }
    }
  };
  
  const handleFormSubmit = async (productData: any, bacteries: BacterieSelection[]) => {
    console.log('🚀 DEBUG - handleFormSubmit dans ProductsManagementPageNew démarré');
    console.log('📝 DEBUG - productData reçu:', productData);
    console.log('🦠 DEBUG - bacteries reçues:', bacteries);
    console.log('🎯 DEBUG - action:', action);
    
    if (!user) {
      console.error('❌ DEBUG - Pas d\'utilisateur connecté');
      toast.error('Vous devez être connecté pour créer un produit');
      return;
    }
    
    try {
      if (action === 'create') {
        console.log('🔄 DEBUG - Création d\'un nouveau produit...');
        // Créer un nouveau produit
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
            reason: 'Création d\'un nouveau produit',
            category: 'PRODUCT_CREATION',
            impact: 'MEDIUM',
            bacteries_count: bacteries.length
          }
        );
        
        toast.success('Produit créé avec succès');
      } else if (action === 'edit' && selectedProduct) {
        // Mettre à jour dans product_thresholds
        await updateProductThresholds(selectedProduct, productData, bacteries);
        
        // Log de la modification
        await logAction(
          'UPDATE',
          'product_thresholds',
          selectedProduct.id,
          selectedProduct,
          { ...productData, bacteries },
          {
            reason: 'Modification des paramètres du produit',
            category: 'PRODUCT_UPDATE',
            impact: 'MEDIUM',
            bacteries_count: bacteries.length
          }
        );
        
        toast.success('Produit modifié avec succès');
      }
      
      setShowForm(false);
      setSelectedProduct(null);
      setAction(null);
      loadProducts();
    } catch (error) {
      console.error('💥 DEBUG - Erreur dans handleFormSubmit ProductsManagementPageNew:', error);
      console.error('💥 DEBUG - Type d\'erreur:', typeof error);
      console.error('💥 DEBUG - Message d\'erreur:', error.message);
      toast.error(action === 'create' ? 'Erreur lors de la création' : 'Erreur lors de la modification');
    }
  };
  
  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedProduct(null);
    setAction(null);
  };

  // Fonctions de filtrage
  const getFilteredProducts = () => {
    if (selectedSiteFilter === 'all') {
      return products;
    }
    return products.filter(product => product.site === selectedSiteFilter);
  };

  const getFilteredAirStaticLocations = () => {
    if (selectedSiteFilter === 'all') {
      return airStaticLocations;
    }
    return airStaticLocations.filter(location => {
      // 1. Correspondance exacte
      if (location.site === selectedSiteFilter) return true;
      
      // 2. Correspondance avec le nom complet (Mapping)
      // La base de données stocke souvent le nom complet (ex: "Laiterie Collet (R1)")
      // alors que le filtre utilise le nom court (ex: "R1")
      if (selectedSiteFilter === 'R1' && (location.site === 'Laiterie Collet (R1)' || location.site.includes('Collet'))) return true;
      if (selectedSiteFilter === 'R2' && (location.site === 'Végétal Santé (R2)' || location.site.includes('Végétal'))) return true;
      if (selectedSiteFilter === 'BAIKO' && (location.site === 'Laiterie Baiko' || location.site.includes('Baiko'))) return true;
      
      return false;
    });
  };

  const handleSiteFilterChange = (siteId: string) => {
    setSelectedSiteFilter(siteId);
  };

  // Fonctions pour la gestion Air Statique
  const handleCreateAirStaticLocation = () => {
    setSelectedAirStaticLocation(null);
    setAirStaticAction('create');
    setShowAirStaticForm(true);
  };

  const handleEditAirStaticLocation = (location: any) => {
    setSelectedAirStaticLocation(location);
    setAirStaticAction('edit');
    setShowAirStaticForm(true);
  };

  const handleDeleteAirStaticLocation = async (location: any) => {
    if (!user) {
      toast.error('Utilisateur non authentifié');
      return;
    }
    
    const confirmMessage = `⚠️ ATTENTION : Suppression définitive du lieu "${location.lieu}"\n\nCette action va supprimer :\n• Le lieu de prélèvement\n• Tous les seuils associés\n• Toutes les analyses liées\n\nCette action est IRRÉVERSIBLE !\n\nÊtes-vous absolument sûr ?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ Suppression du lieu Air Statique:', location.lieu);
        
        // Supprimer le lieu de la table air_static_locations
        const { error } = await supabase
          .from('air_static_locations')
          .delete()
          .eq('id', location.id);

        if (error) {
          console.error('❌ Erreur suppression lieu:', error);
          throw error;
        }

        // Log de la suppression
        await logAction(
          'DELETE',
          'air_static_locations',
          location.id,
          location,
          null,
          {
            reason: 'Suppression du lieu Air Statique',
            category: 'AIR_STATIC_DELETION',
            impact: 'CRITICAL'
          }
        );
        
        toast.success(`Lieu "${location.lieu}" supprimé avec succès`);
        loadAirStaticLocations();
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        toast.error('Erreur lors de la suppression du lieu');
      }
    }
  };

  const handleAirStaticFormSubmit = async (locationData: any) => {
    if (!user) return;
    
    try {
      if (airStaticAction === 'create') {
        // Créer un nouveau lieu
        const { error } = await supabase
          .from('air_static_locations')
          .insert({
            lieu: locationData.lieu,
            site: locationData.site,
            zone: locationData.zone,
            volume_prelevement: locationData.volume_prelevement,
            limite_max: locationData.limite_max,
            comparison_operator: locationData.comparison_operator,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        // Log de la création
        await logAction(
          'CREATE',
          'air_static_locations',
          null,
          null,
          locationData,
          {
            reason: 'Création d\'un nouveau lieu Air Statique',
            category: 'AIR_STATIC_CREATION',
            impact: 'MEDIUM'
          }
        );
        
        toast.success('Lieu Air Statique créé avec succès');
      } else if (airStaticAction === 'edit' && selectedAirStaticLocation) {
        // Mettre à jour le lieu existant
        const { error } = await supabase
          .from('air_static_locations')
          .update({
            lieu: locationData.lieu,
            site: locationData.site,
            zone: locationData.zone,
            volume_prelevement: locationData.volume_prelevement,
            limite_max: locationData.limite_max,
            comparison_operator: locationData.comparison_operator,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAirStaticLocation.id);

        if (error) throw error;

        // Log de la modification
        await logAction(
          'UPDATE',
          'air_static_locations',
          selectedAirStaticLocation.id,
          selectedAirStaticLocation,
          locationData,
          {
            reason: 'Modification du lieu Air Statique',
            category: 'AIR_STATIC_UPDATE',
            impact: 'MEDIUM'
          }
        );
        
        toast.success('Lieu Air Statique modifié avec succès');
      }
      
      setShowAirStaticForm(false);
      setSelectedAirStaticLocation(null);
      setAirStaticAction(null);
      loadAirStaticLocations();
    } catch (error) {
      console.error('Erreur lors de l\'opération:', error);
      toast.error(airStaticAction === 'create' ? 'Erreur lors de la création' : 'Erreur lors de la modification');
    }
  };

  const handleAirStaticFormCancel = () => {
    setShowAirStaticForm(false);
    setSelectedAirStaticLocation(null);
    setAirStaticAction(null);
  };

  // Fonction pour supprimer complètement un produit et toutes ses données
  const deleteProductCompletely = async (product: Product) => {
    try {
      console.log('🗑️ Début de la suppression complète pour:', product.product_brand);
      
      // 1. Supprimer tous les seuils du produit dans product_thresholds
      console.log('1️⃣ Suppression des seuils dans product_thresholds...');
      const { error: thresholdsError } = await supabase
        .from('product_thresholds')
        .delete()
        .eq('product_brand', product.product_brand)
        .eq('site', product.site);

      if (thresholdsError) {
        console.error('❌ Erreur suppression seuils:', thresholdsError);
        throw thresholdsError;
      }
      console.log('✅ Seuils supprimés');

      // 2. Supprimer tous les échantillons associés au produit
      console.log('2️⃣ Suppression des échantillons...');
      const { error: samplesError } = await supabase
        .from('samples')
        .delete()
        .eq('brand', product.product_brand)
        .eq('site', product.site);

      if (samplesError) {
        console.error('❌ Erreur suppression échantillons:', samplesError);
        // Ne pas arrêter si pas d'échantillons
        console.log('⚠️ Aucun échantillon à supprimer ou erreur non critique');
      } else {
        console.log('✅ Échantillons supprimés');
      }

      // 3. Supprimer les formulaires d'analyse associés
      console.log('3️⃣ Suppression des formulaires d\'analyse...');
      const { error: formsError } = await supabase
        .from('forms')
        .delete()
        .eq('product_brand', product.product_brand)
        .eq('site', product.site);

      if (formsError) {
        console.error('❌ Erreur suppression formulaires:', formsError);
        // Ne pas arrêter si pas de formulaires
        console.log('⚠️ Aucun formulaire à supprimer ou erreur non critique');
      } else {
        console.log('✅ Formulaires supprimés');
      }

      // 4. Supprimer les sélections de bactéries associées
      console.log('4️⃣ Suppression des sélections de bactéries...');
      const { error: bacteriaSelectionsError } = await supabase
        .from('form_bacteria_selections')
        .delete()
        .eq('product_brand', product.product_brand);

      if (bacteriaSelectionsError) {
        console.error('❌ Erreur suppression sélections bactéries:', bacteriaSelectionsError);
        // Ne pas arrêter si pas de sélections
        console.log('⚠️ Aucune sélection de bactéries à supprimer ou erreur non critique');
      } else {
        console.log('✅ Sélections de bactéries supprimées');
      }

      // 5. Supprimer les logs d'audit associés
      console.log('5️⃣ Suppression des logs d\'audit...');
      const { error: auditLogsError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('table_name', 'product_thresholds')
        .like('record_id', `%${product.product_brand}%`);

      if (auditLogsError) {
        console.error('❌ Erreur suppression logs audit:', auditLogsError);
        // Ne pas arrêter si pas de logs
        console.log('⚠️ Aucun log d\'audit à supprimer ou erreur non critique');
      } else {
        console.log('✅ Logs d\'audit supprimés');
      }

      console.log('🎉 Suppression complète terminée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression complète:', error);
      throw error;
    }
  };

  // Fonction pour parser les seuils (PH et bactéries)
  const parseThreshold = (seuil: string) => {
    const trimmed = seuil.trim();
    
    // Format "between" : "5-10", "4.5-6.8"
    if (trimmed.includes('-') && !trimmed.includes('<') && !trimmed.includes('>') && !trimmed.includes('=')) {
      const parts = trimmed.split('-');
      if (parts.length === 2) {
        return {
          min_value: parseFloat(parts[0].trim()),
          max_value: parseFloat(parts[1].trim()),
          comparison_operator: 'between'
        };
      }
    }
    
    // Format "< 10", "<= 5", "> 100", ">= 50", "= 7"
    const match = trimmed.match(/^(<|<=|>|>=|=)\s*(\d+(?:\.\d+)?)$/);
    if (match) {
      const operator = match[1];
      const value = parseFloat(match[2]);
      
      return {
        min_value: operator === '>' || operator === '>=' ? value : null,
        max_value: operator === '<' || operator === '<=' ? value : null,
        comparison_operator: operator
      };
    }
    
    // Format par défaut
    return {
      min_value: null,
      max_value: parseFloat(trimmed) || null,
      comparison_operator: '='
    };
  };

  // Fonction pour créer un nouveau produit dans product_thresholds
  const createNewProduct = async (productData: any, bacteries: BacterieSelection[]) => {
    try {
      console.log('🆕 Création d\'un nouveau produit:', productData.nom);
      console.log('📊 Données reçues:', { productData, bacteries });
      console.log('🔍 DEBUG - bacteriesTypes disponibles:', bacteriesTypes?.length || 0);

      // Trouver le site correspondant
      const site = sites.find(s => s.id === productData.site_id);
      if (!site) {
        throw new Error('Site non trouvé');
      }

      const siteName = site.nom; // Utiliser le nom du site (ex: "R1")

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
      if (bacteries.length > 0) {
        console.log('2️⃣ Création des seuils bactéries...');
        console.log('🦠 DEBUG - Bactéries reçues:', bacteries);
        console.log('🦠 DEBUG - Nombre de bactéries:', bacteries.length);
        
        const bacteriaThresholds = bacteries.map((bacterie, index) => {
          console.log(`🦠 DEBUG - Traitement bactérie ${index + 1}:`, bacterie);
          
          // Trouver le nom exact de la bactérie depuis bacteries_types
          const bacterieType = bacteriesTypes.find(bt => bt.id === bacterie.bacterie_id);
          const nomExact = bacterieType?.nom || bacterie.nom;
          
          console.log(`🦠 DEBUG - Nom original: ${bacterie.nom}, Nom exact: ${nomExact}`);
          
          const threshold = parseThreshold(bacterie.seuil);
          const thresholdData = {
            site: siteName,
            product_brand: productData.nom,
            parameter_type: nomExact, // Utiliser le nom exact de la base
            min_value: threshold.min_value,
            max_value: threshold.max_value,
            comparison_operator: threshold.comparison_operator,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          console.log(`🦠 DEBUG - Seuil créé pour ${nomExact}:`, thresholdData);
          return thresholdData;
        });

        console.log('🦠 DEBUG - Tous les seuils à insérer:', bacteriaThresholds);

        const { error: bacteriaError } = await supabase
          .from('product_thresholds')
          .insert(bacteriaThresholds);

        if (bacteriaError) {
          console.error('❌ Erreur création seuils bactéries:', bacteriaError);
          throw bacteriaError;
        }
        console.log('✅ Seuils bactéries créés:', bacteries.length);
      } else {
        console.log('⚠️ Aucune bactérie sélectionnée pour ce produit');
      }

      console.log('🎉 Nouveau produit créé avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du produit:', error);
      throw error;
    }
  };

  // Fonction pour mettre à jour les seuils dans product_thresholds
  const updateProductThresholds = async (product: Product, productData: any, bacteries: BacterieSelection[]) => {
    try {
      console.log('🔄 Mise à jour des seuils pour le produit:', product.product_brand);
      console.log('📊 Données reçues:', { productData, bacteries });

      // 1. Mettre à jour le nom du produit dans tous les seuils existants
      if (productData.nom && productData.nom !== product.product_brand) {
        const { error: updateError } = await supabase
          .from('product_thresholds')
          .update({ product_brand: productData.nom })
          .eq('product_brand', product.product_brand)
          .eq('site', product.site);

        if (updateError) throw updateError;
        console.log('✅ Nom du produit mis à jour');
      }

      // 2. Mettre à jour le seuil PH/Acidité si modifié
      if (productData.ph_seuil !== undefined && productData.ph_seuil !== null) {
        const phThreshold = product.thresholds?.find(t => 
          t.parameter_type === 'pH' || 
          t.parameter_type === 'PH' ||
          t.parameter_type === 'ph' ||
          t.parameter_type === 'Acidité' ||
          t.parameter_type === 'acidité' ||
          t.parameter_type === 'ACIDITÉ' ||
          t.parameter_type === 'acidity' ||
          t.parameter_type === 'ACIDITY'
        );

        if (phThreshold) {
          // Parser le seuil PH (format: "4.5 - 6.8" ou "< 5.0")
          let minValue = null;
          let maxValue = null;
          let comparisonOperator = '=';

          if (productData.ph_seuil.includes(' - ')) {
            const [min, max] = productData.ph_seuil.split(' - ');
            minValue = parseFloat(min);
            maxValue = parseFloat(max);
            comparisonOperator = 'between';
          } else if (productData.ph_seuil.startsWith('< ')) {
            maxValue = parseFloat(productData.ph_seuil.replace('< ', ''));
            comparisonOperator = '<';
          } else if (productData.ph_seuil.startsWith('> ')) {
            minValue = parseFloat(productData.ph_seuil.replace('> ', ''));
            comparisonOperator = '>';
          } else {
            minValue = parseFloat(productData.ph_seuil);
            comparisonOperator = '=';
          }

          const { error: phError } = await supabase
            .from('product_thresholds')
            .update({
              min_value: minValue,
              max_value: maxValue,
              comparison_operator: comparisonOperator
            })
            .eq('id', phThreshold.id);

          if (phError) throw phError;
          console.log('✅ Seuil PH/Acidité mis à jour');
        }
      }

      // 3. Mettre à jour les bactéries
      if (bacteries && bacteries.length > 0) {
        // Supprimer les anciennes bactéries (non PH/Acidité)
        const bacteriaThresholds = product.thresholds?.filter(t => 
          t.parameter_type !== 'PH' && 
          t.parameter_type !== 'Acidité' &&
          t.parameter_type !== 'ph' &&
          t.parameter_type !== 'acidité' &&
          t.parameter_type !== 'pH' &&
          t.parameter_type !== 'ACIDITÉ' &&
          t.parameter_type !== 'acidity' &&
          t.parameter_type !== 'ACIDITY'
        ) || [];

        for (const threshold of bacteriaThresholds) {
          const { error: deleteError } = await supabase
            .from('product_thresholds')
            .delete()
            .eq('id', threshold.id);

          if (deleteError) throw deleteError;
        }

        // Ajouter les nouvelles bactéries
        const newBacteriaThresholds = bacteries.map(bacterie => {
          // Trouver le nom exact de la bactérie depuis bacteries_types
          const bacterieType = bacteriesTypes.find(bt => bt.id === bacterie.bacterie_id);
          const nomExact = bacterieType?.nom || bacterie.nom;
          
          console.log(`🦠 DEBUG - Mise à jour - Nom original: ${bacterie.nom}, Nom exact: ${nomExact}`);
          
          // Parser le seuil pour extraire l'opérateur et la valeur
          let minValue = null;
          let maxValue = null;
          let comparisonOperator = '<';

          if (bacterie.seuil.includes(' - ')) {
            const [min, max] = bacterie.seuil.split(' - ');
            minValue = parseFloat(min);
            maxValue = parseFloat(max);
            comparisonOperator = 'between';
          } else if (bacterie.seuil.startsWith('< ')) {
            maxValue = parseFloat(bacterie.seuil.replace('< ', ''));
            comparisonOperator = '<';
          } else if (bacterie.seuil.startsWith('<= ')) {
            maxValue = parseFloat(bacterie.seuil.replace('<= ', ''));
            comparisonOperator = '<=';
          } else if (bacterie.seuil.startsWith('> ')) {
            minValue = parseFloat(bacterie.seuil.replace('> ', ''));
            comparisonOperator = '>';
          } else if (bacterie.seuil.startsWith('>= ')) {
            minValue = parseFloat(bacterie.seuil.replace('>= ', ''));
            comparisonOperator = '>=';
          } else if (bacterie.seuil.startsWith('= ')) {
            minValue = parseFloat(bacterie.seuil.replace('= ', ''));
            comparisonOperator = '=';
          } else {
            // Valeur simple, utiliser comme maxValue avec opérateur <
            maxValue = parseFloat(bacterie.seuil);
            comparisonOperator = '<';
          }

          return {
            site: product.site,
            product_brand: productData.nom || product.product_brand,
            parameter_type: nomExact, // Utiliser le nom exact de la base
            min_value: minValue,
            max_value: maxValue,
            comparison_operator: comparisonOperator,
            is_active: true
          };
        });

        console.log('🦠 DEBUG - Nouvelles bactéries à insérer:', newBacteriaThresholds);
        
        const { error: insertError } = await supabase
          .from('product_thresholds')
          .insert(newBacteriaThresholds);

        if (insertError) {
          console.error('❌ Erreur lors de l\'insertion des bactéries:', insertError);
          throw insertError;
        }
        console.log('✅ Bactéries mises à jour');
      }

      console.log('✅ Mise à jour terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      throw error;
    }
  };

  const getBacteriesForProduct = (product: Product) => {
    return product.bacteries?.map(pb => ({
      bacterie_id: pb.bacterie_id,
      nom: pb.bacterie?.nom || 'Bactérie inconnue',
      seuil: pb.seuil,
      actif: pb.actif
    })) || [];
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">🍶 Gestion des Produits</h1>
              <p className="text-gray-600">Gérez les produits et leurs paramètres de qualité microbiologique</p>
            </div>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{products.length}</div>
              <div className="text-sm text-gray-600">Produits</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{sites.length}</div>
              <div className="text-sm text-gray-600">Sites</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{bacteriesTypes.length}</div>
              <div className="text-sm text-gray-600">Types de Bactéries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {products.filter(p => p.actif).length}
              </div>
              <div className="text-sm text-gray-600">Produits Actifs</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filtre par site */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-700">Filtrer par site :</span>
            </div>
            <Select value={selectedSiteFilter} onValueChange={handleSiteFilterChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionnez un site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.nom}>
                    {site.nom} - {site.site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSiteFilter !== 'all' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {sites.find(s => s.nom === selectedSiteFilter)?.nom || selectedSiteFilter}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Liste des produits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste des Produits</CardTitle>
                <CardDescription>
                  Produits avec leurs caractéristiques (PH, bactéries, seuils)
                </CardDescription>
              </div>
              <Button 
                onClick={handleCreateProduct}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau Produit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement des produits et bactéries...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 font-medium">Erreur de chargement</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>PH/Acidité</TableHead>
                    <TableHead>Bactéries à Analyser</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredProducts().map(product => {
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-lg">{product.product_brand}</div>
                            <div className="text-sm text-gray-600">
                              {product.thresholds?.length || 0} paramètre(s)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{product.site}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {(() => {
                              // Debug: Voir la structure des données
                              console.log('🔍 DEBUG Product PH/Acidité:', {
                                productId: product.id,
                                productBrand: product.product_brand,
                                thresholds: product.thresholds,
                                thresholdsLength: product.thresholds?.length,
                                parameterNames: product.thresholds?.map(t => t.parameter_name),
                                parameterTypes: product.thresholds?.map(t => t.parameter_type)
                              });
                              
                              // Chercher les seuils PH/Acidité dans les thresholds (parameter_type)
                              const phThresholds = product.thresholds?.filter(t => 
                                t.parameter_type === 'pH' || 
                                t.parameter_type === 'PH' ||
                                t.parameter_type === 'ph' ||
                                t.parameter_type === 'Acidité' ||
                                t.parameter_type === 'acidité' ||
                                t.parameter_type === 'ACIDITÉ' ||
                                t.parameter_type === 'acidity' ||
                                t.parameter_type === 'ACIDITY'
                              ) || [];
                              
                              console.log('🔍 DEBUG PH Thresholds trouvés:', phThresholds);
                              
                              // Debug spécifique pour LAIT
                              if (product.product_brand === 'LAIT') {
                                console.log('🥛 DEBUG LAIT - Tous les thresholds:', product.thresholds);
                                console.log('🥛 DEBUG LAIT - Parameter types:', product.thresholds?.map(t => t.parameter_type));
                                console.log('🥛 DEBUG LAIT - PH Thresholds trouvés:', phThresholds);
                              }
                              
                              if (phThresholds.length > 0) {
                                return (
                                  <div className="space-y-1">
                                    {phThresholds.map((threshold, index) => (
                                      <div key={index} className="text-xs">
                                        <span className="font-medium text-green-600">
                                          {threshold.parameter_type}:
                                        </span>
                                        <span className="text-gray-600 ml-1">
                                          {threshold.comparison_operator === 'between' 
                                            ? `${threshold.min_value} - ${threshold.max_value}`
                                            : `${threshold.comparison_operator} ${threshold.min_value || threshold.max_value}`
                                          }
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                return (
                                  <Badge variant="outline" className="text-orange-600">
                                    À définir
                                  </Badge>
                                );
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {(() => {
                              // Chercher les bactéries dans les thresholds (parameter_type)
                              const bacteriaThresholds = product.thresholds?.filter(t => 
                                t.parameter_type !== 'PH' && 
                                t.parameter_type !== 'Acidité' &&
                                t.parameter_type !== 'ph' &&
                                t.parameter_type !== 'acidité' &&
                                t.parameter_type !== 'pH' &&
                                t.parameter_type !== 'ACIDITÉ' &&
                                t.parameter_type !== 'acidity' &&
                                t.parameter_type !== 'ACIDITY'
                              ) || [];
                              
                              console.log('🦠 DEBUG Bactéries trouvées pour', product.product_brand, ':', bacteriaThresholds);
                              
                              if (bacteriaThresholds.length > 0) {
                                return (
                                  <div className="space-y-1">
                                    {bacteriaThresholds.slice(0, 3).map((threshold, index) => (
                                      <div key={index} className="text-xs">
                                        <span className="font-medium text-blue-600">
                                          {threshold.parameter_type}:
                                        </span>
                                        <span className="text-gray-600 ml-1">
                                          {threshold.comparison_operator === 'between' 
                                            ? `${threshold.min_value} - ${threshold.max_value}`
                                            : `${threshold.comparison_operator} ${threshold.min_value || threshold.max_value}`
                                          }
                                        </span>
                                      </div>
                                    ))}
                                    {bacteriaThresholds.length > 3 && (
                                      <div className="text-xs text-gray-500">
                                        +{bacteriaThresholds.length - 3} autres bactéries...
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="text-xs text-gray-400 italic">
                                    Aucune bactérie définie
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            Actif
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(product)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Détails
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Modifier
                            </Button>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Supprimer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Air Statique */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Gestion des Lieux Air Statique</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {getFilteredAirStaticLocations().length} lieu{getFilteredAirStaticLocations().length > 1 ? 'x' : ''}
                  {selectedSiteFilter !== 'all' && ` (${selectedSiteFilter})`}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAirStaticExpanded(!airStaticExpanded)}
                  className="flex items-center gap-1"
                >
                  {airStaticExpanded ? (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      Voir les lieux
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCreateAirStaticLocation}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau lieu
                </Button>
              </div>
            </div>
            <CardDescription>
              Gestion des lieux de prélèvement d'air statique avec leurs seuils et paramètres
            </CardDescription>
          </CardHeader>
          
          {airStaticExpanded && (
            <CardContent>
              {getFilteredAirStaticLocations().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun lieu Air Statique configuré</p>
                  <p className="text-sm">Cliquez sur "Nouveau lieu" pour commencer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredAirStaticLocations().map((location, index) => (
                    <Card key={location.id || index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{location.lieu}</h4>
                              <Badge variant="outline" className="text-xs">
                                {location.site}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-blue-600" />
                                <div>
                                  <span className="font-medium">Zone:</span>
                                  <span className="ml-1">{location.zone || 'Non définie'}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Droplets className="w-4 h-4 text-green-600" />
                                <div>
                                  <span className="font-medium">Volume:</span>
                                  <span className="ml-1">{location.volume_prelevement || 'N/A'}L</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                <div>
                                  <span className="font-medium">Seuil max:</span>
                                  <span className="ml-1">{location.limite_max !== null && location.limite_max !== undefined ? location.limite_max : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAirStaticLocation(location)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Modifier
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteAirStaticLocation(location)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
        
        {/* Modal de détails */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du Produit</DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="space-y-6">
                {/* Informations générales */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informations Générales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Nom du Produit</label>
                        <div className="text-lg font-semibold">{selectedProduct.product_brand}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Type</label>
                        <div className="capitalize">{selectedProduct.type || 'Produit'}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Site</label>
                        <div className="font-medium">{selectedProduct.site}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">PH/Acidité</label>
                        <div className="text-lg font-semibold text-blue-600">
                          {(() => {
                            // Chercher les seuils PH/Acidité
                            const phThresholds = selectedProduct.thresholds?.filter(t => 
                              t.parameter_type === 'PH' || 
                              t.parameter_type === 'Acidité' ||
                              t.parameter_type === 'ph' ||
                              t.parameter_type === 'acidité' ||
                              t.parameter_type === 'pH' ||
                              t.parameter_type === 'ACIDITÉ' ||
                              t.parameter_type === 'acidity' ||
                              t.parameter_type === 'ACIDITY'
                            ) || [];
                            
                            if (phThresholds.length > 0) {
                              return phThresholds.map((threshold, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium text-green-600">
                                    {threshold.parameter_type}:
                                  </span>
                                  <span className="text-gray-600 ml-1">
                                    {threshold.comparison_operator === 'between' 
                                      ? `${threshold.min_value} - ${threshold.max_value}`
                                      : `${threshold.comparison_operator} ${threshold.min_value || threshold.max_value}`
                                    }
                                  </span>
                                </div>
                              ));
                            } else {
                              return <span className="text-gray-500">Non défini</span>;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                    {selectedProduct.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <div className="text-gray-700">{selectedProduct.description}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bactéries à analyser */}
                <Card>
                  <CardHeader>
                    <CardTitle>Bactéries à Analyser</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        // Chercher les bactéries dans les thresholds
                        const bacteriaThresholds = selectedProduct.thresholds?.filter(t => 
                          t.parameter_type !== 'PH' && 
                          t.parameter_type !== 'Acidité' &&
                          t.parameter_type !== 'ph' &&
                          t.parameter_type !== 'acidité' &&
                          t.parameter_type !== 'pH' &&
                          t.parameter_type !== 'ACIDITÉ' &&
                          t.parameter_type !== 'acidity' &&
                          t.parameter_type !== 'ACIDITY'
                        ) || [];
                        
                        if (bacteriaThresholds.length > 0) {
                          return bacteriaThresholds.map((threshold, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium text-blue-600">{threshold.parameter_type}</div>
                                <div className="text-sm text-gray-600">
                                  Paramètre microbiologique
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-green-600">
                                  {threshold.comparison_operator === 'between' 
                                    ? `${threshold.min_value} - ${threshold.max_value}`
                                    : `${threshold.comparison_operator} ${threshold.min_value || threshold.max_value}`
                                  }
                                </div>
                                <div className="text-sm text-gray-500">
                                  Seuil de conformité
                                </div>
                              </div>
                            </div>
                          ));
                        } else {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <div className="text-sm">Aucune bactérie définie pour ce produit</div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Métadonnées */}
                <Card>
                  <CardHeader>
                    <CardTitle>Métadonnées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-600">ID du Produit</label>
                        <div className="font-mono text-xs">{selectedProduct.id}</div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Nombre de Seuils</label>
                        <div>{selectedProduct.thresholds?.length || 0} paramètre(s)</div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Statut</label>
                        <div>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Actif
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-600">Source</label>
                        <div>Table product_thresholds</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Modal de création/modification */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {action === 'create' ? 'Créer un Nouveau Produit' : 'Modifier le Produit'}
              </DialogTitle>
            </DialogHeader>
            
            <ProductFormNew
              initialData={action === 'create' ? {
                nom: '',
                type_produit: 'Produit',
                description: '',
                ph_seuil: '',
                actif: true,
                site_id: '',
                thresholds: []
              } : selectedProduct ? {
                id: selectedProduct.id,
                nom: selectedProduct.product_brand,
                type_produit: selectedProduct.type || 'Produit',
                description: selectedProduct.description || '',
                ph_seuil: (() => {
                  // Extraire le seuil PH/Acidité
                  const phThreshold = selectedProduct.thresholds?.find(t => 
                    t.parameter_type === 'pH' || 
                    t.parameter_type === 'PH' ||
                    t.parameter_type === 'ph' ||
                    t.parameter_type === 'Acidité' ||
                    t.parameter_type === 'acidité' ||
                    t.parameter_type === 'ACIDITÉ' ||
                    t.parameter_type === 'acidity' ||
                    t.parameter_type === 'ACIDITY'
                  );
                  return phThreshold ? 
                    (phThreshold.comparison_operator === 'between' 
                      ? `${phThreshold.min_value} - ${phThreshold.max_value}`
                      : `${phThreshold.comparison_operator} ${phThreshold.min_value || phThreshold.max_value}`
                    ) : '';
                })(),
                actif: true,
                site_id: (() => {
                  // Trouver l'ID du site correspondant
                  const site = sites.find(s => s.nom === selectedProduct.site);
                  return site?.id || '';
                })(),
                thresholds: selectedProduct.thresholds || []
              } : {}}
              siteId={action === 'create' ? '' : (() => {
                // Trouver l'ID du site correspondant
                const site = sites.find(s => s.nom === selectedProduct?.site);
                return site?.id || '';
              })()}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              action={action}
              sites={sites}
            />
          </DialogContent>
        </Dialog>

        {/* Modal Air Statique */}
        <Dialog open={showAirStaticForm} onOpenChange={setShowAirStaticForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {airStaticAction === 'create' ? 'Créer un Nouveau Lieu Air Statique' : 'Modifier le Lieu Air Statique'}
              </DialogTitle>
            </DialogHeader>
            
            <AirStaticLocationForm
              initialData={airStaticAction === 'create' ? null : selectedAirStaticLocation}
              sites={sites}
              onSubmit={handleAirStaticFormSubmit}
              onCancel={handleAirStaticFormCancel}
              action={airStaticAction}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};