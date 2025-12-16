import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { format, subMonths, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Beaker,
  Award,
  Activity,
  Target
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

interface Sample {
  id: string;
  number: string;
  product: string;
  brand: string | null;
  site: string | null;
  status: string;
  created_at: string;
  resultat?: string | null;
}

interface DashboardStats {
  totalSamples: number;
  conformityRate: number;
  activeTests: number;
  alertsCount: number;
  samplesWithResult: number;
  conformingSamples: number;
}

const COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const QualityControlDashboardFixed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('month');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalSamples: 0,
    conformityRate: 0,
    activeTests: 0,
    alertsCount: 0,
    samplesWithResult: 0,
    conformingSamples: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [timeRange, selectedSite]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculer la date de début selon la période sélectionnée
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subMonths(now, 1);
          break;
        case 'quarter':
          startDate = subMonths(now, 3);
          break;
        case 'year':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = subMonths(now, 1);
      }

      console.log('🔄 Chargement des données du tableau de bord...');
      
      // Requête de base pour récupérer les échantillons
      let query = supabase
        .from('samples')
        .select('id, number, product, brand, site, status, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (selectedSite !== 'all') {
        query = query.eq('site', selectedSite);
      }

      const { data: samplesData, error } = await query;

      if (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du tableau de bord",
          variant: "destructive",
        });
        return;
      }

      if (samplesData && samplesData.length > 0) {
        console.log(`📊 ${samplesData.length} échantillons récupérés`);
        
        // Tentative de récupération de la colonne resultat en batches pour éviter l'erreur 400 (URL trop longue)
        try {
          console.log('🔍 Récupération des résultats finaux...');
          const allIds = samplesData.map(s => s.id);
          const BATCH_SIZE = 100; // Limiter à 100 IDs par requête
          const resultatMap = new Map();
          let hasError = false;

          // Diviser en batches et récupérer les résultats
          for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
            const batch = allIds.slice(i, i + BATCH_SIZE);
            console.log(`📦 Chargement batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allIds.length / BATCH_SIZE)} (${batch.length} IDs)`);
            
            const { data: batchData, error: batchError } = await supabase
              .from('samples')
              .select('id, resultat')
              .in('id', batch);

            if (batchError) {
              console.warn('⚠️ Erreur récupération resultat batch:', batchError.message);
              hasError = true;
              break;
            } else if (batchData) {
              batchData.forEach(r => resultatMap.set(r.id, r.resultat));
            }
          }

          let samplesWithResultat: Sample[];
          
          if (hasError || resultatMap.size === 0) {
            console.warn('⚠️ Colonne resultat non disponible');
            samplesWithResultat = samplesData.map(sample => ({
              ...sample,
              resultat: null
            }));
          } else {
            console.log(`✅ ${resultatMap.size} résultats récupérés au total`);
            samplesWithResultat = samplesData.map(sample => ({
              ...sample,
              resultat: resultatMap.get(sample.id) || null
            }));
          }
          
          setSamples(samplesWithResultat);
          calculateDashboardStats(samplesWithResultat);
          
        } catch (resultatError) {
          console.warn('⚠️ Erreur lors de la récupération des résultats:', resultatError);
          const samplesWithoutResultat = samplesData.map(sample => ({
            ...sample,
            resultat: null
          }));
          
          setSamples(samplesWithoutResultat);
          calculateDashboardStats(samplesWithoutResultat);
        }
      } else {
        console.log('📭 Aucun échantillon trouvé pour la période');
        setSamples([]);
        setDashboardStats({
          totalSamples: 0,
          conformityRate: 0,
          activeTests: 0,
          alertsCount: 0,
          samplesWithResult: 0,
          conformingSamples: 0
        });
      }
      
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
    const totalSamples = samplesData.length;
    
    // Calcul du taux de conformité basé sur la colonne "resultat"
    const samplesWithResult = samplesData.filter(s => s.resultat && s.resultat.trim() !== '');
    const conformingSamples = samplesWithResult.filter(s => 
      s.resultat && 
      s.resultat.toLowerCase().includes('conforme') && 
      !s.resultat.toLowerCase().includes('non')
    ).length;
    
    console.log(`📈 Conformité: ${conformingSamples}/${samplesWithResult.length} échantillons conformes`);
    
    // Si aucun échantillon n'a de résultat, utiliser le statut comme fallback
    let conformityRate = 0;
    if (samplesWithResult.length > 0) {
      conformityRate = Math.round((conformingSamples / samplesWithResult.length) * 100);
      console.log(`✅ Taux de conformité basé sur les résultats: ${conformityRate}%`);
    } else {
      // Fallback : conformité basée sur le statut (échantillons non rejetés)
      const rejectedSamples = samplesData.filter(s => s.status === 'rejected').length;
      conformityRate = totalSamples > 0 ? Math.round(((totalSamples - rejectedSamples) / totalSamples) * 100) : 0;
      console.log(`⚠️ Taux de conformité basé sur le statut (fallback): ${conformityRate}%`);
    }

    // Comptage des tests actifs (en cours d'analyse)
    const activeTests = samplesData.filter(s => s.status === 'in_progress' || s.status === 'waiting_reading').length;
    
    // Comptage des alertes (échantillons rejetés + échantillons en retard)
    const rejectedSamples = samplesData.filter(s => s.status === 'rejected').length;
    const alertsCount = rejectedSamples + samplesData.filter(s => {
      if (s.status === 'pending') {
        const created = new Date(s.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 24; // Alerte si plus de 24h en attente
      }
      return false;
    }).length;

    setDashboardStats({
      totalSamples,
      conformityRate,
      activeTests,
      alertsCount,
      samplesWithResult: samplesWithResult.length,
      conformingSamples
    });
  };

  // Données pour le graphique de statuts
  const getStatusChartData = () => {
    const statusCounts = {
      'En attente': samples.filter(s => s.status === 'pending').length,
      'En cours': samples.filter(s => s.status === 'in_progress' || s.status === 'waiting_reading').length,
      'Complété': samples.filter(s => s.status === 'completed' || s.status === 'archived').length,
      'Rejeté': samples.filter(s => s.status === 'rejected').length,
    };

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  };

  const StatCard = ({ title, value, icon: Icon, color, description }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    description?: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const sites = [...new Set(samples.map(s => s.site).filter(Boolean))];

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
              <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Qualité (FIXED)</h1>
              <p className="text-gray-600">Vue d'ensemble des contrôles et analyses</p>
              {dashboardStats.samplesWithResult > 0 ? (
                <p className="text-sm text-green-600">
                  ✅ Conformité basée sur {dashboardStats.samplesWithResult} résultats finaux
                </p>
              ) : (
                <p className="text-sm text-orange-600">
                  ⚠️ Conformité calculée sur le statut (colonne Résultat en cours d'utilisation)
                </p>
              )}
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
            {/* Cartes de statistiques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Échantillons"
                value={dashboardStats.totalSamples}
                icon={Beaker}
                color="text-blue-600"
                description="Échantillons dans la période"
              />
              
              <StatCard
                title="Taux de Conformité"
                value={`${dashboardStats.conformityRate}%`}
                icon={Award}
                color="text-green-600"
                description={
                  dashboardStats.samplesWithResult > 0 
                    ? `${dashboardStats.conformingSamples}/${dashboardStats.samplesWithResult} conformes`
                    : "Basé sur le statut"
                }
              />
              
              <StatCard
                title="Tests Actifs"
                value={dashboardStats.activeTests}
                icon={Activity}
                color="text-orange-600"
                description="En cours d'analyse"
              />
              
              <StatCard
                title="Alertes"
                value={dashboardStats.alertsCount}
                icon={AlertTriangle}
                color="text-red-600"
                description="Nécessitent attention"
              />
            </div>

            {/* Indicateur de source de conformité */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Indicateurs de Conformité</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <Badge variant={dashboardStats.samplesWithResult > 0 ? "default" : "secondary"}>
                      Résultats Finaux
                    </Badge>
                    <span className="text-sm">
                      {dashboardStats.samplesWithResult} échantillons avec conclusion
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge variant="default">
                      Conformes
                    </Badge>
                    <span className="text-sm text-green-600">
                      {dashboardStats.conformingSamples} échantillons conformes
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">
                      Méthode
                    </Badge>
                    <span className="text-sm">
                      {dashboardStats.samplesWithResult > 0 ? "Colonne Résultat" : "Statut échantillon"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Graphique de statuts */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Répartition des Statuts</CardTitle>
                <CardDescription>
                  Distribution des échantillons par statut de traitement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getStatusChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getStatusChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
                <CardDescription>
                  Raccourcis vers les fonctionnalités principales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => navigate('/sample-entry')}
                    className="flex items-center justify-center space-x-2 h-12"
                  >
                    <Beaker className="h-4 w-4" />
                    <span>Nouveau Formulaire</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/pending-readings')}
                    className="flex items-center justify-center space-x-2 h-12"
                  >
                    <Clock className="h-4 w-4" />
                    <span>Lectures en Attente</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/forms-history')}
                    className="flex items-center justify-center space-x-2 h-12"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Historique Complet</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default QualityControlDashboardFixed; 