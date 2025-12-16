import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProductsNew } from '../hooks/useProductsNew';

// Mapping des IDs de site vers les noms complets utilisés dans la base de données (air_static_locations)
const SITE_MAPPING: Record<string, string> = {
  'R1': 'Laiterie Collet (R1)',
  'R2': 'Végétal Santé (R2)',
  'BAIKO': 'Laiterie Baiko'
};

// Les produits sont maintenant chargés dynamiquement depuis la base de données via useProductsNew
// Plus de liste codée en dur - tout vient de la table product_thresholds

interface TechnicalInfoProps {
  selectedSite?: string;
  analysisDate?: Date;
}

const TechnicalInfoPage = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedSite, analysisDate } = (location.state as TechnicalInfoProps) || {};
  const { products, sites, airStaticLocations, loading } = useProductsNew();

  const [brand, setBrand] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<string>('Analyse initiale');
  const [availableBrands, setAvailableBrands] = useState<Array<{id: string, name: string, products?: string[]}>>([]);
  
  useEffect(() => {
    console.log('🔍 DEBUG TechnicalInfo - selectedSite:', selectedSite);
    console.log('🔍 DEBUG TechnicalInfo - sites:', sites);
    console.log('🔍 DEBUG TechnicalInfo - products:', products);
    console.log('🔍 DEBUG TechnicalInfo - airStaticLocations:', airStaticLocations);
    
    // Charger les produits depuis la base de données
    if (selectedSite && (products.length > 0 || airStaticLocations.length > 0)) {
      // Trouver le site correspondant via le hook ou le mapping
      const site = sites.find(s => s.nom && s.nom.includes(selectedSite));
      const fullSiteName = SITE_MAPPING[selectedSite] || (site ? site.nom : selectedSite);
      
      console.log('🔍 DEBUG TechnicalInfo - site trouvé:', site);
      console.log('🔍 DEBUG TechnicalInfo - fullSiteName:', fullSiteName);

      // On continue si on a un site sélectionné (même si pas trouvé dans la table sites)
      if (selectedSite) {
        // Filtrer les produits pour ce site (nouvelle structure depuis product_thresholds)
        const siteProducts = products.filter(p => (p as any).site === selectedSite || (p as any).site === fullSiteName);
        console.log('🔍 DEBUG TechnicalInfo - siteProducts filtrés:', siteProducts);
        
        // Filtrer les lieux Air Statique pour ce site (comparaison très souple et normalisée)
        const normalize = (s: string) => s ? s.toLowerCase().trim() : '';
        const target = normalize(fullSiteName);
        const targetShort = normalize(selectedSite);

        console.log('🔍 DEBUG - Comparaison Air Statique:', { target, targetShort });
        if (airStaticLocations.length > 0) {
           console.log('🔍 DEBUG - Exemples de sites en base:', airStaticLocations.slice(0, 5).map(l => l.site));
        } else {
           console.log('⚠️ DEBUG - Aucune location Air Statique chargée depuis useProductsNew !');
        }

        const siteAirStatic = airStaticLocations.filter(l => {
           if (!l.site) return false;
           const lSite = normalize(l.site);
           return lSite === target || 
                  lSite === targetShort || 
                  lSite.includes(targetShort) || 
                  (target && lSite.includes(target)) ||
                  (target && target.includes(lSite));
        });
        console.log('🔍 DEBUG TechnicalInfo - siteAirStatic filtrés:', siteAirStatic);
        
        // Convertir les produits en format attendu avec leurs bactéries
        const productBrands = siteProducts.map(product => {
          // Extraire les bactéries disponibles pour ce produit
          const availableBacteria = product.thresholds?.filter(t => 
            t.parameter_type !== 'PH' && 
            t.parameter_type !== 'Acidité' &&
            t.parameter_type !== 'ph' &&
            t.parameter_type !== 'acidité' &&
            t.parameter_type !== 'pH' &&
            t.parameter_type !== 'ACIDITÉ' &&
            t.parameter_type !== 'acidity' &&
            t.parameter_type !== 'ACIDITY'
          ).map(t => ({
            name: t.parameter_type,
            threshold: {
              comparison_operator: t.comparison_operator,
              min_value: t.min_value,
              max_value: t.max_value
            }
          })) || [];

          return {
            id: product.id,
            name: (product as any).product_brand,
            products: [], // Les produits individuels peuvent être ajoutés ici si nécessaire
            availableBacteria: availableBacteria
          };
        });
        
        // Ajouter "Air Statique" comme une seule gamme (Toujours afficher)
        const allBrands = [...productBrands];
        
        // Créer l'entrée "Air Statique" (avec ou sans lieux trouvés)
        const airStaticProducts = siteAirStatic.map(location => ({
          id: location.id,
          name: location.lieu,
          zone: location.zone,
          volume_prelevement: location.volume_prelevement,
          limite_max: location.limite_max
        }));
          
        allBrands.push({
          id: 'air_statique',
          name: 'Air Statique',
          products: airStaticProducts,
          availableBacteria: [] // Les bactéries Air Statique sont gérées différemment
        } as any);
        
        console.log('🔍 DEBUG TechnicalInfo - brands convertis:', allBrands);
        setAvailableBrands(allBrands);
        
        // Si une seule marque est disponible, la sélectionner automatiquement
        if (allBrands.length === 1) {
          setBrand(allBrands[0].id);
          setReportTitle(`Formulaire contrôle microbiologique – ${allBrands[0].name}`);
        }
      }
    } else if (selectedSite && !loading) {
      // Aucun produit trouvé pour ce site
      setAvailableBrands([]);
      setBrand('');
      setReportTitle('');
    }
  }, [selectedSite, products, sites, airStaticLocations, loading]);

  // Mettre à jour le titre du rapport quand la marque change
  useEffect(() => {
    if (brand) {
      const selectedBrandInfo = availableBrands.find(b => b.id === brand);
      if (selectedBrandInfo) {
        setReportTitle(`Formulaire contrôle microbiologique – ${selectedBrandInfo.name}`);
      }
    }
  }, [brand, availableBrands]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brand) {
      toast({
        title: "Champs requis",
        description: "Veuillez sélectionner une marque.",
        variant: "destructive"
      });
      return;
    }

    // Trouver la marque sélectionnée pour accéder à ses produits
    const selectedBrandInfo = availableBrands.find(b => b.id === brand);
    const products = selectedBrandInfo?.products || [];
    const brandName = selectedBrandInfo?.name || '';

    navigate('/sample-entry', {
      state: {
        ...location.state,
        brand,
        brandName,
        reportTitle,
        analysisType,
        site: selectedSite,
        sampleDate: analysisDate ? analysisDate.toLocaleDateString() : '',
        reference: `REF-${selectedSite}-${Date.now().toString().substring(8)}`,
        GF_PRODUCTS: products, // Transmettre les produits disponibles pour cette marque
        isNew: true           // Indiquer qu'il s'agit d'un nouveau formulaire
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0091CA] text-white py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold">Contrôle Qualité Microbiologique</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-medium">Informations Techniques</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site">Site sélectionné</Label>
                <Input 
                  id="site" 
                  value={selectedSite ? SITE_MAPPING[selectedSite] || sites.find(s => s.id === selectedSite)?.nom || selectedSite : ''} 
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">Gamme</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Sélectionner une gamme" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {availableBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableBrands.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    Aucune gamme disponible pour ce site.
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reportTitle">Titre du rapport</Label>
                <Input 
                  id="reportTitle" 
                  value={reportTitle} 
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Le titre sera généré automatiquement"
                  className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analysisType">Type d'analyse</Label>
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger id="analysisType" className="border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-300">
                    <SelectValue placeholder="Sélectionner le type d'analyse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Analyse initiale">Analyse initiale</SelectItem>
                    <SelectItem value="Contre-analyse">Contre-analyse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/quality-control')}
              >
                Retour
              </Button>
              
              <Button 
                type="submit" 
                className="bg-[#0091CA] hover:bg-[#007AA8]"
                disabled={!brand}
              >
                <Check className="w-4 h-4 mr-2" />
                Valider
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

// Liste des sites pour affichage
const sites = [
  { id: 'R1', name: 'Laiterie Collet (R1)' },
  { id: 'R2', name: 'Végétal Santé (R2)' },
  { id: 'BAIKO', name: 'Laiterie Baiko' },
];

export default TechnicalInfoPage;
