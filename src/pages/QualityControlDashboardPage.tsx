import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/print-charts.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, ReferenceLine, Label, LabelList
} from 'recharts';
import { format, subMonths, subDays, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Beaker,
  Award,
  Activity,
  Clock,
  RefreshCw,
  Filter,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Composant Tooltip personnalisé avec pourcentages
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div 
        style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <p style={{ fontWeight: '500', color: '#111827', marginBottom: '8px' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, fontSize: '14px', margin: '2px 0' }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Composant Tooltip spécialisé pour l'Air Statique
const AirStaticTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const conformityEntry = payload.find((p: any) => p.dataKey === 'conformitySegment');
    const nonConformityEntry = payload.find((p: any) => p.dataKey === 'nonConformitySegment');
    
    return (
      <div 
        style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <p style={{ fontWeight: '500', color: '#111827', marginBottom: '8px' }}>{label}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '14px', color: '#059669' }}>
            ✅ Conformité: {conformityEntry?.value || 0}%
          </p>
          <p style={{ fontSize: '14px', color: '#dc2626' }}>
            ❌ Non-conformité: {nonConformityEntry?.value || 0}%
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Fonction pour créer les labels des barres empilées
const renderCustomLabel = (entry: any, dataKey: string) => {
  if (!entry || !entry[dataKey] || entry[dataKey] === 0) return null;
  
  const value = Math.round(entry[dataKey]);
  return `${value}%`;
};

// Composant Label personnalisé pour afficher les pourcentages sur les barres empilées
const CustomBarLabel = ({ x, y, width, height, value, dataKey, payload }: any) => {
  console.log('🏷️ CustomBarLabel appelé:', {
    dataKey,
    value,
    payload,
    x,
    y,
    width,
    height
  });
  
  if (!value || value === 0) {
    console.log('❌ Label non affiché - value est 0 ou null');
    return null;
  }
  
  // Le problème : Recharts passe la valeur de la barre entière (100%) pour les barres empilées
  // Nous devons utiliser les données du payload pour obtenir la vraie valeur du segment
  let displayValue = 0;
  
  if (dataKey === 'conformitySegment') {
    // Pour le segment vert, utiliser la valeur de conformité
    displayValue = payload.conformitySegment || 0;
    console.log('🟢 Segment vert - displayValue:', displayValue);
  } else if (dataKey === 'nonConformitySegment') {
    // Pour le segment rouge, utiliser la valeur de non-conformité
    displayValue = payload.nonConformitySegment || 0;
    console.log('🔴 Segment rouge - displayValue:', displayValue);
  }
  
  // Arrondir et ne pas afficher si 0
  const roundedValue = Math.round(displayValue);
  console.log('📊 Valeur finale arrondie:', roundedValue);
  
  if (roundedValue === 0) {
    console.log('❌ Label non affiché - roundedValue est 0');
    return null;
  }
  
  // Position du label au centre de ce segment
  const labelY = y + height / 2;
  
  console.log('✅ Affichage du label:', `${roundedValue}% à la position (${x + width / 2}, ${labelY})`);
  
  return (
    <text 
      x={x + width / 2} 
      y={labelY} 
      textAnchor="middle" 
      dominantBaseline="middle"
      fontSize="12"
      fontWeight="bold"
      fill="#000000"
    >
      {roundedValue}%
    </text>
  );
};

// Composant Label pour les barres simples (graphique mensuel)
const SimpleBarLabel = ({ x, y, width, height, value }: any) => {
  if (!value || value === 0) return null;
  
  return (
    <text 
      x={x + width / 2} 
      y={y - 5} 
      textAnchor="middle" 
      dominantBaseline="middle"
      fontSize="12"
      fontWeight="bold"
      fill="#000000"
    >
      {value}%
    </text>
  );
};

// Composant Label pour afficher les pourcentages dans le camembert
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent === 0) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="#000000" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="14"
      fontWeight="bold"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
};

// Composant Legend personnalisé avec les bonnes couleurs
const CustomLegend = ({ payload }: any) => {
  if (!payload || payload.length === 0) return null;
  
  return (
    <div className="flex justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => {
        const color = entry.dataKey === 'conformitySegment' ? '#10b981' : '#ef4444';
        return (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

interface Sample {
  id: string;
  number: string;
  product: string;
  brand: string | null;
  site: string | null;
  status: string;
  created_at: string;
  fabrication: string;
  ajDlc: string | null;
  ph: string | null;
  aspect: string;
  smell: string;
  taste: string;
  texture: string;
  acidity: string | null;
  of_value: string | null;
  enterobacteria: string | null;
  yeast_mold: string | null;
  lab_comment: string | null;
  assigned_to: string | null;
  modified_at: string;
  resultat?: string | null;
  form_id?: string | null;
}

interface DashboardStats {
  totalSamples: number;
  conformityRate: number;
  analysisInProgress: number;
  waitingReading: number;
  samplesWithResult: number;
  conformingSamples: number;
}

const COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
};

const PIE_COLORS = ['#10b981', '#ef4444']; // Vert pour conforme, Rouge pour non-conforme

const QualityControlDashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<string>('month');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  
  // Filtres pour les graphiques
  const [chartSiteFilter, setChartSiteFilter] = useState<string>('');
  const [chartProductFilter, setChartProductFilter] = useState<string>('');
  const [chartYearFilter, setChartYearFilter] = useState<string>('');
  const [chartMonthFilter, setChartMonthFilter] = useState<string>('');
  const [chartAjDlcFilter, setChartAjDlcFilter] = useState<string>('');
  const [chartAnalysisTypeFilter, setChartAnalysisTypeFilter] = useState<string>('all');
  
  // Filtre spécifique pour le graphique "% Conformité par Type"
  const [conformityChartProductFilter, setConformityChartProductFilter] = useState<string>('');
  
  // Fonction pour générer les titres dynamiques des graphiques
  const generateChartTitle = (baseTitle: string): string => {
    const filters = [];
    
    // Ajouter le produit en premier s'il est sélectionné
    if (chartProductFilter && chartProductFilter !== '') {
      filters.push(chartProductFilter);
    }
    
    // Ajouter le site entre parenthèses s'il est sélectionné
    if (chartSiteFilter && chartSiteFilter !== '') {
      if (filters.length > 0) {
        filters.push(`(${chartSiteFilter})`);
      } else {
        filters.push(`Site ${chartSiteFilter}`);
      }
    }
    
    // Construire le titre final
    if (filters.length > 0) {
      return `${baseTitle} - ${filters.join(' ')}`;
    }
    
    return baseTitle;
  };

  // Fonction pour générer le sous-titre avec les filtres temporels
  const generateFilterSubtitle = (): string => {
    const parts = [];
    
    // Année
    const yearText = chartYearFilter && chartYearFilter !== '' ? chartYearFilter : 'Tous';
    parts.push(`Année: ${yearText}`);
    
    // Mois
    let monthText = 'Tous';
    if (chartMonthFilter && chartMonthFilter !== '') {
      const monthNames = {
        '1': 'Janvier', '2': 'Février', '3': 'Mars', '4': 'Avril',
        '5': 'Mai', '6': 'Juin', '7': 'Juillet', '8': 'Août',
        '9': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
      };
      monthText = monthNames[chartMonthFilter as keyof typeof monthNames] || chartMonthFilter;
    }
    parts.push(`Mois: ${monthText}`);
    
    // AJ/DLC entre parenthèses seulement s'il est filtré
    if (chartAjDlcFilter && chartAjDlcFilter !== '' && chartAjDlcFilter !== 'Tous') {
      parts.push(`(${chartAjDlcFilter})`);
    }
    
    return parts.join('  ');
  };

  // 🖨️ Fonction pour imprimer seulement les graphiques
  const handlePrintCharts = () => {
    // Ajouter la date d'impression au titre
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Créer un style temporaire avec la date
    const printStyle = document.createElement('style');
    printStyle.id = 'print-date-style';
    printStyle.innerHTML = `
      @media print {
        body.printing-charts::after {
          content: "Imprimé le ${currentDate}";
          position: absolute !important;
          bottom: 20px !important;
          right: 20px !important;
          font-size: 10px !important;
          color: #666 !important;
          visibility: visible !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
    
    // Ajouter une classe spéciale au body pour l'impression
    document.body.classList.add('printing-charts');
    
    // Déclencher l'impression
    window.print();
    
    // Retirer la classe et le style après l'impression
    setTimeout(() => {
      document.body.classList.remove('printing-charts');
      const styleElement = document.getElementById('print-date-style');
      if (styleElement) {
        styleElement.remove();
      }
    }, 1000);
  };

  // États pour les nouvelles tables Air Statique
  const [airStaticLocations, setAirStaticLocations] = useState<any[]>([]);
  const [ufcCountTable, setUfcCountTable] = useState<any[]>([]);

  // Fonction pour classifier les zones d'air statique (temporaire - sera remplacée)
  const getZoneFromAirStaticProduct = (product: string): string => {
    const location = airStaticLocations.find(loc => loc.lieu === product);
    return location ? `Zone ${location.zone}` : 'Zone Inconnue';
  };

  // Fonction pour obtenir les lieux d'une zone (temporaire - sera remplacée)
  const getLocationsForZone = (zoneName: string): string[] => {
    const zone = zoneName.replace('Zone ', '');
    return airStaticLocations
      .filter(loc => loc.zone === zone)
      .map(loc => loc.lieu);
  };

  // Fonction de calcul UFC automatique
  const calculateUfcFromCount = (levuresComptees: number, volumePrelevement: number): number => {
    // Trouver la ligne correspondante dans la table UFC
    const ufcRow = ufcCountTable.find(row => row.levures_comptees === levuresComptees);
    
    if (!ufcRow) {
      console.warn(`⚠️ Aucune donnée UFC trouvée pour ${levuresComptees} levures comptées`);
      return 0;
    }

    // Retourner la valeur UFC selon le volume
    switch (volumePrelevement) {
      case 100:
        return ufcRow.volume_100ml || 0;
      case 250:
        return ufcRow.volume_250ml || 0;
      case 500:
        return ufcRow.volume_500ml || 0;
      default:
        console.warn(`⚠️ Volume de prélèvement non supporté: ${volumePrelevement}mL`);
        return 0;
    }
  };

  // Fonction pour valider la conformité Air Statique avec calcul automatique
  const validateAirStaticConformity = (lieu: string, levuresComptees: number): 'conforme' | 'non-conforme' | 'inconnu' => {
    // Trouver les informations du lieu
    const location = airStaticLocations.find(loc => loc.lieu === lieu);
    if (!location) {
      console.warn(`⚠️ Lieu non trouvé: ${lieu}`);
      return 'inconnu';
    }

    // Calculer les UFC/g automatiquement
    const ufcCalcule = calculateUfcFromCount(levuresComptees, location.volume_prelevement);
    
    console.log(`🧮 CALCUL UFC pour ${lieu}:`, {
      levuresComptees,
      volumePrelevement: location.volume_prelevement,
      ufcCalcule,
      seuil: location.limite_max,
      operateur: location.comparison_operator
    });

    // Comparer avec le seuil
    let isConforme = false;
    if (location.comparison_operator === '=') {
      isConforme = ufcCalcule === location.limite_max;
    } else if (location.comparison_operator === '<') {
      isConforme = ufcCalcule < location.limite_max;
    }

    return isConforme ? 'conforme' : 'non-conforme';
  };

  // Composant de tooltip personnalisé pour afficher les lieux avec détails
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const isAirStatic = chartProductFilter === 'Air Statique';
    
    if (isAirStatic) {
      // Mode Air Statique : afficher les lieux de la zone avec détails par lieu
      const zoneName = label;
      const locations = getLocationsForZone(zoneName);
      const data = payload[0]?.payload;
      
      // Analyser les échantillons de cette zone pour déterminer la conformité par lieu
      const filteredSamples = getFilteredSamples();
      const zoneLocationDetails = locations.map(location => {
        const locationSamples = filteredSamples.filter(s => 
          s.brand === 'Air Statique' && s.product === location
        );
        const samplesWithResult = locationSamples.filter(s => s.resultat && s.resultat.trim() !== '');
        const conformingSamples = samplesWithResult.filter(s => 
          s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
        ).length;
        const nonConformingSamples = samplesWithResult.length - conformingSamples;
        
        return {
          location,
          total: samplesWithResult.length,
          conforming: conformingSamples,
          nonConforming: nonConformingSamples,
          hasData: samplesWithResult.length > 0
        };
      });
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
          <h4 className="font-semibold text-gray-900 mb-2">{zoneName}</h4>
          
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between">
              <span>Total échantillons:</span>
              <span className="font-medium">{data?.totalSamples || 0}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Conformes:</span>
              <span className="font-medium">{data?.conformingSamples || 0}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Non-conformes:</span>
              <span className="font-medium">{data?.nonConformingSamples || 0}</span>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <h5 className="font-medium text-gray-700 mb-2">Détail par lieu:</h5>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {zoneLocationDetails.map((detail, index) => (
                <div key={index} className="text-xs flex items-center justify-between">
                  <span className="text-gray-700">• {detail.location}</span>
                  {detail.hasData ? (
                    <div className="flex items-center gap-1">
                      {detail.conforming > 0 && (
                        <span className="text-green-600 font-medium">
                          ✓{detail.conforming}
                        </span>
                      )}
                      {detail.nonConforming > 0 && (
                        <span className="text-red-600 font-medium">
                          ✗{detail.nonConforming}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">Pas de données</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      // Mode normal : tooltip standard
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <h4 className="font-semibold text-gray-900 mb-2">{label}</h4>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between" style={{ color: entry.color }}>
                <span>{entry.name}:</span>
                <span className="font-medium">{entry.value}%</span>
              </div>
            ))}
            {payload.length > 0 && (
              <div className="pt-2 border-t border-gray-200 mt-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Total:</span>
                  <span className="font-medium">100%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalSamples: 0,
    conformityRate: 0,
    analysisInProgress: 0,
    waitingReading: 0,
    samplesWithResult: 0,
    conformingSamples: 0
  });

  // Fonction pour charger les données Air Statique
  const loadAirStaticData = async () => {
    try {
      console.log('🌪️ Chargement des données Air Statique...');
      
      // Charger les lieux Air Statique
      const { data: locationsData, error: locationsError } = await supabase
        .from('air_static_locations')
        .select('*')
        .eq('is_active', true)
        .order('lieu', { ascending: true });

      if (locationsError) {
        console.error('❌ Erreur chargement lieux Air Statique:', locationsError);
        setAirStaticLocations([]);
      } else {
        console.log('✅ Lieux Air Statique chargés:', locationsData?.length || 0);
        setAirStaticLocations(locationsData || []);
      }

      // Charger la table UFC Count
      const { data: ufcData, error: ufcError } = await supabase
        .from('ufc_count_levures_moisissures')
        .select('*')
        .order('levures_comptees', { ascending: true });

      if (ufcError) {
        console.error('❌ Erreur chargement table UFC:', ufcError);
        setUfcCountTable([]);
      } else {
        console.log('✅ Table UFC Count chargée:', ufcData?.length || 0);
        setUfcCountTable(ufcData || []);
      }

    } catch (error) {
      console.error('💥 Erreur générale chargement Air Statique:', error);
    }
  };

  // Configuration de la mise à jour automatique avec Supabase
  useEffect(() => {
    loadDashboardData();
    loadAirStaticData();
    
    // Configuration des notifications en temps réel
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'samples'
        },
        (payload) => {
          console.log('🔔 Mise à jour détectée dans la base de données:', payload);
          setLastUpdate(new Date());
          // Recharger les données après un court délai
          setTimeout(() => {
            loadDashboardData();
          }, 1000);
        }
      )
      .subscribe();

    // Mise à jour automatique toutes les 5 minutes
    const interval = setInterval(() => {
      loadDashboardData();
    }, 300000); // 5 minutes = 5 * 60 * 1000 millisecondes

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [timeRange, selectedSite]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Chargement des données du tableau de bord...');
      
      // Pagination pour récupérer TOUS les échantillons archivés (jusqu'à 20 000)
      let allSamples: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      const MAX_PAGES = 20;

      console.log('📄 Récupération de tous les échantillons archivés (pagination)...');

      while (hasMore && page < MAX_PAGES) {
        console.log(`📄 Chargement page ${page + 1}/${MAX_PAGES}...`);
        
        let query = supabase
          .from('samples')
          .select('id, number, product, brand, site, status, created_at, fabrication, aj_dlc, ph, aspect, smell, taste, texture, acidity, of_value, parfum, enterobacteria, yeast_mold, lab_comment, assigned_to, modified_at, form_id, analysis_type')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (selectedSite !== 'all') {
          query = query.eq('site', selectedSite);
        }

        const { data: samplesData, error } = await query;

        if (error) {
          console.error('❌ Erreur lors du chargement des données:', error);
          toast({
            title: "Erreur",
            description: "Impossible de charger les données du tableau de bord",
            variant: "destructive",
          });
          return;
        }

        if (samplesData && samplesData.length > 0) {
          allSamples = [...allSamples, ...samplesData];
          if (samplesData.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`📊 Total: ${allSamples.length} échantillons récupérés`);

      if (allSamples.length > 0) {
        console.log(`📊 ${allSamples.length} échantillons récupérés`);
        
        // Mapper les données pour convertir aj_dlc en ajDlc
        const mappedSamples = allSamples.map((sample: any) => ({
          ...sample,
          ajDlc: sample.aj_dlc || 'DLC'
        }));
        
        // Récupérer la colonne resultat séparément
        console.log('�� Récupération des résultats finaux...');
        let allResultats: any[] = [];
        const sampleIds = mappedSamples.map(s => s.id);
        const chunkSize = 100;
        
        for (let i = 0; i < sampleIds.length; i += chunkSize) {
          const chunkIds = sampleIds.slice(i, i + chunkSize);
          const { data: resultatData, error: resultatError } = await supabase
            .from('samples')
            .select('id, resultat')
            .in('id', chunkIds);

          if (resultatError) {
            console.warn(`Erreur recuperation resultat (lot ${Math.floor(i / chunkSize) + 1}):`, resultatError.message);
          } else if (resultatData) {
            allResultats = [...allResultats, ...resultatData];
          }
        }

        const resultatMap = new Map(allResultats.map((r: any) => [r.id, r.resultat]));
        console.log(`Total ${allResultats.length} resultats recuperes`);
        
        const samplesWithResultat = mappedSamples.map(sample => ({
          ...sample,
          resultat: resultatMap.get(sample.id) || null
        })) as Sample[];
        
        const withResultCount = samplesWithResultat.filter(s => s.resultat && s.resultat.trim() !== '').length;
        console.log(`${withResultCount} echantillons avec resultat final`);
        
        setSamples(samplesWithResultat);
        calculateDashboardStats(samplesWithResultat);
      } else {
        console.log('📭 Aucun échantillon trouvé pour la période');
        setSamples([]);
        setDashboardStats({
          totalSamples: 0,
          conformityRate: 0,
          analysisInProgress: 0,
          waitingReading: 0,
          samplesWithResult: 0,
          conformingSamples: 0
        });
      }
      
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('💥 Erreur générale:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du chargement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (samplesData: Sample[]) => {
    console.log('📊 Calcul des statistiques simplifiées...');
    
    // 1. Total Échantillons (seulement ceux avec un résultat final)
    const samplesWithResult = samplesData.filter(s => s.resultat && s.resultat.trim() !== '');
    const totalSamples = samplesWithResult.length; // ✅ Seulement les échantillons traités
    
    // 2. Taux de Conformité basé sur la colonne "resultat"
    const conformingSamples = samplesWithResult.filter(s => 
      s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
    ).length;
    
    let conformityRate = 0;
    if (samplesWithResult.length > 0) {
      conformityRate = Math.round((conformingSamples / samplesWithResult.length) * 100);
      console.log(`✅ Taux conformité basé sur RÉSULTAT: ${conformityRate}%`);
    } else {
      console.log(`⚠️ Aucun résultat final disponible`);
    }
    
    // 3. Nombre de formulaires en analyse en cours - LOGIQUE IDENTIQUE À AnalysisInProgressPage
    const analysisInProgressSamples = samplesData.filter(s => s.status === 'analyses_en_cours');
    const groupedForms = analysisInProgressSamples.reduce((acc, sample) => {
      const formId = sample.form_id || sample.id; // Utiliser form_id si disponible, sinon id
      if (!acc[formId]) {
        acc[formId] = true;
      }
      return acc;
    }, {} as Record<string, boolean>);
    const analysisInProgress = Object.keys(groupedForms).length;
    console.log(`📝 ${analysisInProgress} formulaires en analyse (${analysisInProgressSamples.length} échantillons)`);
    
    // 4. Nombre de formulaires en lecture en attente
    const waitingReading = samplesData.filter(s => s.status === 'waiting_reading').length;
    
    console.log(`🔍 Statistiques calculées:`);
    console.log(`  - Total échantillons: ${totalSamples} (avec résultat final)`);
    console.log(`  - Taux conformité: ${conformityRate}% (${conformingSamples}/${samplesWithResult.length})`);
    console.log(`  - En analyse: ${analysisInProgress}`);
    console.log(`  - En attente lecture: ${waitingReading}`);

    setDashboardStats({
      totalSamples,
      conformityRate,
      analysisInProgress,
      waitingReading,
      samplesWithResult: samplesWithResult.length,
      conformingSamples
    });
  };

  // Fonction pour filtrer les échantillons selon les filtres de graphiques
  const getFilteredSamples = () => {
    return samples.filter(sample => {
      if (chartSiteFilter !== '' && chartSiteFilter !== 'all' && sample.site !== chartSiteFilter) return false;
      if (chartProductFilter !== '' && chartProductFilter !== 'all' && sample.brand !== chartProductFilter) return false;
      if (chartAjDlcFilter !== '' && sample.ajDlc !== chartAjDlcFilter) return false;
      if (chartAnalysisTypeFilter !== '' && chartAnalysisTypeFilter !== 'all' && (sample as any).analysis_type !== chartAnalysisTypeFilter) return false;
      
      // Filtrage par année
      if (chartYearFilter !== '') {
        if (!sample.fabrication) return false;
        const fabricationDate = parseISO(sample.fabrication);
        if (fabricationDate.getFullYear().toString() !== chartYearFilter) return false;
      }
      
      // Filtrage par mois
      if (chartMonthFilter !== '') {
        if (!sample.fabrication) return false;
        const fabricationDate = parseISO(sample.fabrication);
        if ((fabricationDate.getMonth() + 1).toString() !== chartMonthFilter) return false;
      }
      
      return true;
    });
  };

  // Données pour le camembert de conformité
  const getPieChartData = () => {
    const filteredSamples = getFilteredSamples();
    const samplesWithResult = filteredSamples.filter(s => s.resultat && s.resultat.trim() !== '');
    
    if (samplesWithResult.length === 0) {
      return [{ name: 'Aucun résultat', value: 1, color: '#e5e7eb' }];
    }
    
    const conformingSamples = samplesWithResult.filter(s => 
      s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
    ).length;
    
    const nonConformingSamples = samplesWithResult.length - conformingSamples;
    
    const data = [];
    if (conformingSamples > 0) {
      data.push({ name: 'Conforme', value: conformingSamples, color: PIE_COLORS[0] });
    }
    if (nonConformingSamples > 0) {
      data.push({ name: 'Non-conforme', value: nonConformingSamples, color: PIE_COLORS[1] });
    }
    
    return data;
  };

  // Données pour l'histogramme mensuel
  const getMonthlyConformityData = () => {
    const filteredSamples = getFilteredSamples();
    const now = new Date();
    const startDate = subMonths(now, 11); // 12 derniers mois
    
    const months = eachMonthOfInterval({ start: startDate, end: now });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthSamples = filteredSamples.filter(sample => {
        if (!sample.fabrication) return false;
        const sampleDate = parseISO(sample.fabrication);
        return sampleDate >= monthStart && sampleDate <= monthEnd;
      });
      
      const samplesWithResult = monthSamples.filter(s => s.resultat && s.resultat.trim() !== '');
      
      let conformityRate = 0;
      if (samplesWithResult.length > 0) {
        const conformingSamples = samplesWithResult.filter(s => 
          s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
        ).length;
        conformityRate = Math.round((conformingSamples / samplesWithResult.length) * 100);
      }
      
      return {
        month: format(month, 'MMM yyyy', { locale: fr }),
        conformityRate,
        totalSamples: samplesWithResult.length
      };
    });
  };

  // Données pour le graphique en barres empilées (conformité par type/zone)
  const getStackedBarData = () => {
    let filteredSamples = getFilteredSamples();
    
    // Appliquer le filtre spécifique au produit pour ce graphique uniquement
    if (conformityChartProductFilter && conformityChartProductFilter !== '' && conformityChartProductFilter !== 'all') {
      filteredSamples = filteredSamples.filter(s => s.product === conformityChartProductFilter);
    }
    
    console.log('🔍 DEBUG getStackedBarData:');
    console.log('  - Échantillons filtrés:', filteredSamples.length);
    console.log('  - Filtre produit (graphique):', conformityChartProductFilter);
    console.log('  - Échantillons:', filteredSamples.map(s => ({ brand: s.brand, product: s.product, resultat: s.resultat })));
    
    // Si aucun échantillon, retourner un tableau vide
    if (filteredSamples.length === 0) {
      console.log('⚠️ Aucun échantillon filtré - graphique vide');
      return [];
    }
    
    // LOGIQUE CONDITIONNELLE : 
    // 1. Si produit filtré = grouper par parfums
    // 2. Si Air Statique = grouper par zones
    // 3. Sinon = grouper par produits individuels
    const isAirStatic = chartProductFilter === 'Air Statique';
    const hasProductFilter = conformityChartProductFilter && conformityChartProductFilter !== '' && conformityChartProductFilter !== 'all';
    
    let categories: string[] = [];
    let categoryKey: string = '';
    
    if (hasProductFilter) {
      // Mode Parfum : grouper par parfums pour le produit sélectionné
      categoryKey = 'parfum';
      categories = [...new Set(filteredSamples.map(s => s.parfum || 'Sans parfum').filter(Boolean))];
      console.log('🍓 Mode PARFUM activé - Produit filtré:', conformityChartProductFilter);
    } else if (isAirStatic) {
      // Mode Air Statique : grouper par zones
      categoryKey = 'zone';
      const airStaticSamples = filteredSamples.filter(s => s.brand === 'Air Statique');
      categories = [...new Set(airStaticSamples.map(s => getZoneFromAirStaticProduct(s.product)).filter(Boolean))];
    } else {
      // Mode normal : grouper par produits individuels (colonne product)
      categoryKey = 'product';
      categories = [...new Set(filteredSamples.map(s => s.product).filter(Boolean))];
      console.log('📦 Mode PRODUIT activé - Grouper par produits individuels');
    }
    
    console.log('📊 Catégories trouvées:', categories);
    console.log('🔑 Clé de catégorie:', categoryKey);
    
    // Calculer les données par catégorie avec logique -100 à +100
    const data = categories.map(category => {
      let samplesForCategory: Sample[] = [];
      
      if (hasProductFilter) {
        // Filtrer par parfum
        samplesForCategory = filteredSamples.filter(s => 
          (s.parfum || 'Sans parfum') === category
        );
      } else if (isAirStatic) {
        // Filtrer les échantillons Air Statique par zone
        samplesForCategory = filteredSamples.filter(s => 
          s.brand === 'Air Statique' && getZoneFromAirStaticProduct(s.product) === category
        );
      } else {
        // Filtrer par produit individuel (colonne product)
        samplesForCategory = filteredSamples.filter(s => s.product === category);
      }
      
      const samplesWithResult = samplesForCategory.filter(s => s.resultat && s.resultat.trim() !== '');
      
      console.log(`📋 Catégorie "${category}":`, {
        totalSamples: samplesForCategory.length,
        samplesWithResult: samplesWithResult.length,
        results: samplesWithResult.map(s => s.resultat)
      });
      
      let conformityValue = 0;
      let nonConformityValue = 0;
      
      if (samplesWithResult.length > 0) {
        const conformingSamples = samplesWithResult.filter(s => 
          s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
        ).length;
        const nonConformingSamples = samplesWithResult.length - conformingSamples;
        
        // Conformité : valeur positive (0 à 100)
        conformityValue = Math.round((conformingSamples / samplesWithResult.length) * 100);
        
        // Non-conformité : valeur positive (0 à 100) 
        nonConformityValue = Math.round((nonConformingSamples / samplesWithResult.length) * 100);
        
        console.log(`📊 Calculs pour "${category}":`, {
          conformingSamples,
          nonConformingSamples,
          conformityValue,
          nonConformityValue
        });
      }
      
      return {
        [categoryKey]: category,
        productType: category, // Garder pour compatibilité
        // Créer des segments pour une seule barre
        conformitySegment: conformityValue, // Segment vert (0% à X%)
        nonConformitySegment: nonConformityValue, // Segment rouge (X% à 100%)
        // Garder les valeurs originales pour compatibilité
        conformityRate: conformityValue,
        nonConformityRate: nonConformityValue,
        totalSamples: samplesForCategory.length,
        samplesWithResult: samplesWithResult.length,
        conformingSamples: samplesWithResult.filter(s => 
          s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
        ).length,
        nonConformingSamples: samplesWithResult.length - samplesWithResult.filter(s => 
          s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
        ).length
      };
    });
    
    // Si aucun filtre significatif n'est appliqué (hors site), afficher seulement le Top 10 conformité
    // Le filtre "Site" ne désactive PAS le Top 10
    const hasSignificantFilter = 
      conformityChartProductFilter !== '' && conformityChartProductFilter !== 'all' ||
      chartProductFilter !== '' && chartProductFilter !== 'all' ||
      chartYearFilter !== '' ||
      chartMonthFilter !== '' ||
      chartAjDlcFilter !== '' ||
      (chartAnalysisTypeFilter !== '' && chartAnalysisTypeFilter !== 'all');
    
    let finalData = data;
    
    if (!hasSignificantFilter && !hasProductFilter && !isAirStatic) {
      // Trier par taux de conformité décroissant et prendre le top 10
      // Cette logique s'applique même si un site est filtré
      finalData = data
        .sort((a, b) => b.conformityRate - a.conformityRate)
        .slice(0, 10);
      const siteInfo = (chartSiteFilter !== '' && chartSiteFilter !== 'all') ? ` pour site ${chartSiteFilter}` : '';
      console.log(`🏆 Mode TOP 10 conformité activé${siteInfo}`);
    }
    
    console.log('📈 Données finales pour le graphique:', finalData);
    return finalData;
  };

  const StatCard = ({ title, value, icon: Icon, color, description }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    description?: string;
  }) => (
    <Card className="relative overflow-hidden border-2 border-blue-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const sites = [...new Set(samples.map(s => s.site).filter(Boolean))];
  const products = [...new Set(samples.map(s => s.brand).filter(Boolean))];
  
  // Fonction pour obtenir les produits filtrés par site
  const getProductsForSite = (site: string) => {
    if (!site || site === '' || site === 'all') return products;
    return [...new Set(samples
      .filter(s => s.site === site)
      .map(s => s.brand)
      .filter(Boolean)
    )];
  };
  
  // Fonction pour obtenir les types de produits (colonne Produit) filtrés
  const getProductTypes = () => {
    let filteredSamples = samples;
    
    // Filtrer par site si sélectionné
    if (chartSiteFilter && chartSiteFilter !== '' && chartSiteFilter !== 'all') {
      filteredSamples = filteredSamples.filter(s => s.site === chartSiteFilter);
    }
    
    // Filtrer par gamme si sélectionnée
    if (chartProductFilter && chartProductFilter !== '' && chartProductFilter !== 'all') {
      filteredSamples = filteredSamples.filter(s => s.brand === chartProductFilter);
    }
    
    return [...new Set(filteredSamples
      .map(s => s.product)
      .filter(Boolean)
    )].sort();
  };
  
  // Fonction pour réinitialiser le filtre Gamme quand le site change
  const handleSiteFilterChange = (newSite: string) => {
    setChartSiteFilter(newSite);
    // Réinitialiser le filtre Gamme si le produit sélectionné n'existe pas pour le nouveau site
    const availableProducts = getProductsForSite(newSite);
    if (chartProductFilter && chartProductFilter !== 'all' && !availableProducts.includes(chartProductFilter)) {
      setChartProductFilter('all');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <Button 
                variant="outline" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
              </Button>
              <div>
              <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Qualité</h1>
              <p className="text-gray-600">Vue d'ensemble des contrôles et analyses</p>
              {/* ❌ Badges masqués comme demandé */}
              <div className="hidden">
                {dashboardStats.samplesWithResult > 0 ? (
                  <Badge variant="default" className="text-xs">
                    ✅ Conformité basée sur {dashboardStats.samplesWithResult} résultats finaux
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    ⚠️ En attente de résultats finaux
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Mis à jour: {format(lastUpdate, 'HH:mm:ss')}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site} value={site!}>{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 jours</SelectItem>
                <SelectItem value="month">1 mois</SelectItem>
                <SelectItem value="quarter">3 mois</SelectItem>
                <SelectItem value="year">1 an</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadDashboardData}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </Button>

            {/* 🖨️ Bouton d'impression des graphiques */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handlePrintCharts}
              className="print-charts-button flex items-center space-x-2"
              title="Imprimer uniquement les 3 graphiques"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer Graphiques</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Les 4 statistiques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Échantillons"
                value={dashboardStats.totalSamples}
                icon={Beaker}
                color="text-blue-600"
                description="Échantillons traités"
              />
              
              <StatCard
                title="Taux de Conformité"
                value={dashboardStats.samplesWithResult > 0 ? `${dashboardStats.conformityRate}%` : 'N/A'}
                icon={Award}
                color="text-green-600"
                description={
                  dashboardStats.samplesWithResult > 0 
                    ? `${dashboardStats.conformingSamples}/${dashboardStats.samplesWithResult} conformes`
                    : "Basé sur la colonne Résultat"
                }
              />
              
              <StatCard
                title="En Analyse"
                value={dashboardStats.analysisInProgress}
                icon={Activity}
                color="text-orange-600"
                description="Formulaires en cours d'analyse"
              />
              
              <StatCard
                title="Lecture en Attente"
                value={dashboardStats.waitingReading}
                icon={Clock}
                color="text-purple-600"
                description="Formulaires en attente de lecture"
              />
            </div>

            {/* Filtres pour les graphiques */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border-2 border-blue-200">
            <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filtrer les graphiques:</span>
              </div>
              
              <Select value={chartSiteFilter} onValueChange={handleSiteFilterChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sites</SelectItem>
                  {sites.map(site => (
                    <SelectItem key={site} value={site!}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={chartProductFilter} onValueChange={setChartProductFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Gamme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les gammes</SelectItem>
                  {getProductsForSite(chartSiteFilter).map(product => (
                    <SelectItem key={product} value={product!}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={chartYearFilter} onValueChange={setChartYearFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const years = [...new Set(samples
                      .filter(s => s.fabrication)
                      .map(s => parseISO(s.fabrication).getFullYear())
                      .sort((a, b) => b - a)
                    )];
                    return years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>

              <Select value={chartMonthFilter} onValueChange={setChartMonthFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Jan</SelectItem>
                  <SelectItem value="2">Fév</SelectItem>
                  <SelectItem value="3">Mar</SelectItem>
                  <SelectItem value="4">Avr</SelectItem>
                  <SelectItem value="5">Mai</SelectItem>
                  <SelectItem value="6">Juin</SelectItem>
                  <SelectItem value="7">Juil</SelectItem>
                  <SelectItem value="8">Août</SelectItem>
                  <SelectItem value="9">Sep</SelectItem>
                  <SelectItem value="10">Oct</SelectItem>
                  <SelectItem value="11">Nov</SelectItem>
                  <SelectItem value="12">Déc</SelectItem>
                </SelectContent>
              </Select>

              <Select value={chartAjDlcFilter} onValueChange={setChartAjDlcFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="AJ/DLC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AJ">AJ</SelectItem>
                  <SelectItem value="DLC">DLC</SelectItem>
                </SelectContent>
              </Select>

              <Select value={chartAnalysisTypeFilter} onValueChange={setChartAnalysisTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type analyse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {(() => {
                    const types = [...new Set(samples
                      .map((s: any) => s.analysis_type)
                      .filter(Boolean)
                    )];
                    return types.map((type: any) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
              
              {/* Affichage des filtres actifs */}
              {(chartSiteFilter !== '' && chartSiteFilter !== 'all' || chartProductFilter !== '' && chartProductFilter !== 'all' || chartYearFilter !== '' || chartMonthFilter !== '' || chartAjDlcFilter !== '' || (chartAnalysisTypeFilter !== '' && chartAnalysisTypeFilter !== 'all')) && (
                <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-300">
                  <span className="text-xs text-gray-500">Filtres actifs:</span>
                  {chartSiteFilter !== '' && chartSiteFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Site: {chartSiteFilter}
                    </Badge>
                  )}
                  {chartProductFilter !== '' && chartProductFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Produit: {chartProductFilter}
                    </Badge>
                  )}
                  {chartYearFilter !== '' && (
                    <Badge variant="secondary" className="text-xs">
                      Année: {chartYearFilter}
                    </Badge>
                  )}
                  {chartMonthFilter !== '' && (
                    <Badge variant="secondary" className="text-xs">
                      Mois: {chartMonthFilter === '1' ? 'Jan' : chartMonthFilter === '2' ? 'Fév' : chartMonthFilter === '3' ? 'Mar' : chartMonthFilter === '4' ? 'Avr' : chartMonthFilter === '5' ? 'Mai' : chartMonthFilter === '6' ? 'Juin' : chartMonthFilter === '7' ? 'Juil' : chartMonthFilter === '8' ? 'Août' : chartMonthFilter === '9' ? 'Sep' : chartMonthFilter === '10' ? 'Oct' : chartMonthFilter === '11' ? 'Nov' : 'Déc'}
                    </Badge>
                  )}
                  {chartAjDlcFilter !== '' && (
                    <Badge variant="secondary" className="text-xs">
                      AJ/DLC: {chartAjDlcFilter}
                    </Badge>
                  )}
                  {chartAnalysisTypeFilter !== '' && chartAnalysisTypeFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Type: {chartAnalysisTypeFilter}
                    </Badge>
                  )}
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setChartSiteFilter('all');
                      setChartProductFilter('all');
                      setChartYearFilter('');
                      setChartMonthFilter('');
                      setChartAjDlcFilter('');
                      setChartAnalysisTypeFilter('all');
                    }}
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ✕ Effacer
                  </Button>
                </div>
              )}
          </div>
          
            {/* 📊 Graphiques côte à côte - Zone d'impression */}
            <div id="charts-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Camembert de conformité */}
            <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{generateChartTitle('Taux de Conformité')}</CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-1">{generateFilterSubtitle()}</CardDescription>
              </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row items-center justify-between">
                    {/* Graphique camembert */}
                    <div className="w-full lg:w-2/3 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                            data={getPieChartData()}
                        cx="50%"
                        cy="50%"
                            innerRadius={50}
                            outerRadius={100}
                            paddingAngle={5}
                        dataKey="value"
                        label={<PieLabel />}
                      >
                            {getPieChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string, props: any) => {
                              const data = getPieChartData();
                              const total = data.reduce((sum, item) => sum + item.value, 0);
                              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                              return [`${percentage}%`, name];
                            }}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                    </div>
                    
                    {/* Panneau d'information à côté */}
                    <div className="w-full lg:w-1/3 lg:pl-6 mt-4 lg:mt-0">
                      <div className="space-y-4">
                        {/* Statistiques filtrées */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-sm text-blue-700 mb-2">Résultats filtrés</h4>
                          <div className="space-y-2">
                            {(() => {
                              const filteredSamples = getFilteredSamples();
                              const samplesWithResult = filteredSamples.filter(s => s.resultat && s.resultat.trim() !== '');
                              const conformingSamples = samplesWithResult.filter(s => 
                                s.resultat && s.resultat.toLowerCase().includes('conforme') && !s.resultat.toLowerCase().includes('non')
                              ).length;
                              
                              return (
                                <>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-blue-600">Total échantillons:</span>
                                    <span className="font-bold text-blue-800">{samplesWithResult.length}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-600">Conformes:</span>
                                    <span className="font-bold text-green-700">{conformingSamples}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-red-600">Non-conformes:</span>
                                    <span className="font-bold text-red-700">{samplesWithResult.length - conformingSamples}</span>
                                  </div>
                                  {samplesWithResult.length > 0 && (
                                    <div className="pt-2 border-t border-blue-200">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-blue-600">Taux conformité:</span>
                                        <span className="font-bold text-lg text-blue-800">
                                          {Math.round((conformingSamples / samplesWithResult.length) * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </CardContent>
            </Card>
            
              {/* Histogramme mensuel */}
            <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{generateChartTitle('Évolution Mensuelle')}</CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-1">{generateFilterSubtitle()}</CardDescription>
              </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getMonthlyConformityData()} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45} 
                      textAnchor="end" 
                          height={60}
                    />
                    <YAxis 
                      domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value}%`, 
                            'Taux de Conformité'
                          ]}
                          labelFormatter={(label) => `Mois: ${label}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }}
                    />
                    <Bar 
                          dataKey="conformityRate" 
                          fill={COLORS.success}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={80}
                          label={<SimpleBarLabel />}
                    />
                  </BarChart>
                </ResponsiveContainer>
                  </div>
              </CardContent>
            </Card>
          </div>
          
            {/* 📊 Graphique en barres empilées - Répartition des types de produits */}
            <div id="third-chart" className="mt-6">
          <Card className="border-2 border-blue-200">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {(() => {
                          // Vérifier si d'autres filtres que le site sont appliqués
                          const hasOtherFilters = 
                            (conformityChartProductFilter !== '' && conformityChartProductFilter !== 'all') ||
                            (chartProductFilter !== '' && chartProductFilter !== 'all') ||
                            chartYearFilter !== '' ||
                            chartMonthFilter !== '' ||
                            chartAjDlcFilter !== '' ||
                            (chartAnalysisTypeFilter !== '' && chartAnalysisTypeFilter !== 'all');
                          
                          if (conformityChartProductFilter && conformityChartProductFilter !== '' && conformityChartProductFilter !== 'all') {
                            return generateChartTitle('% Conformité par Parfum');
                          }
                          if (chartProductFilter === 'Air Statique') {
                            return generateChartTitle('% Conformité par Zone');
                          }
                          
                          // Si des filtres autres que le site sont appliqués
                          if (hasOtherFilters) {
                            return '% C & NC des produits';
                          }
                          
                          // Top 10 Conformité avec le site s'il est filtré
                          const siteInfo = (chartSiteFilter !== '' && chartSiteFilter !== 'all') ? ` - Site ${chartSiteFilter}` : '';
                          return `Top 10 Conformité${siteInfo}`;
                        })()}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">{generateFilterSubtitle()}</CardDescription>
                    </div>
                    
                    {/* Filtre spécifique pour ce graphique */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Produit:</span>
                      <Select value={conformityChartProductFilter} onValueChange={setConformityChartProductFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Tous les produits" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les produits</SelectItem>
                          {getProductTypes().map(productType => (
                            <SelectItem key={productType} value={productType!}>{productType}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getStackedBarData()} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                        <XAxis 
                          dataKey="productType" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={8}
                          interval={0}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                          fontSize={12}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip content={chartProductFilter === 'Air Statique' ? <AirStaticTooltip /> : <CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Bar 
                          dataKey="conformitySegment"
                          stackId="a"
                          radius={[4, 4, 0, 0]}
                          name="Conformité"
                          maxBarSize={80}
                        >
                          {getStackedBarData().map((entry, index) => (
                            <Cell key={`conformity-${index}`} fill="#10b981" />
                          ))}
                          <LabelList 
                            dataKey="conformitySegment" 
                            content={(props: any) => {
                              const { value } = props;
                              const roundedValue = Math.round(value);
                              return roundedValue > 0 ? (
                                <text 
                                  x={props.x + props.width / 2} 
                                  y={props.y + props.height / 2} 
                                  textAnchor="middle" 
                                  dominantBaseline="middle"
                                  fill="#000000" 
                                  fontSize="12" 
                                  fontWeight="bold"
                                >
                                  {roundedValue}%
                                </text>
                              ) : null;
                            }}
                          />
                        </Bar>
                        <Bar 
                          dataKey="nonConformitySegment"
                          stackId="a"
                          radius={[0, 0, 4, 4]}
                          name="Non-conformité"
                          maxBarSize={80}
                        >
                          {getStackedBarData().map((entry, index) => (
                            <Cell key={`nonconformity-${index}`} fill="#ef4444" />
                          ))}
                          <LabelList 
                            dataKey="nonConformitySegment" 
                            content={(props: any) => {
                              const { value } = props;
                              const roundedValue = Math.round(value);
                              return roundedValue > 0 ? (
                                <text 
                                  x={props.x + props.width / 2} 
                                  y={props.y + props.height / 2} 
                                  textAnchor="middle" 
                                  dominantBaseline="middle"
                                  fill="#000000" 
                                  fontSize="12" 
                                  fontWeight="bold"
                                >
                                  {roundedValue}%
                                </text>
                              ) : null;
                            }}
                          />
                        </Bar>
                        <ReferenceLine y={100} stroke="#e5e7eb" strokeDasharray="5 5" strokeOpacity={0.3} />
                      </BarChart>
                    </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QualityControlDashboardPage; 