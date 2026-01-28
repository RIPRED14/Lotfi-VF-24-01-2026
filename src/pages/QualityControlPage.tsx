import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CalendarIcon, 
  History, 
  BarChart3, 
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Beaker,
  Users,
  Building,
  Microscope,
  TestTube,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
// Mode démo intégré
const isDemoMode = (): boolean => {
  return localStorage.getItem('DEMO_MODE') === 'true';
};

const toggleDemoMode = (enabled: boolean): void => {
  localStorage.setItem('DEMO_MODE', enabled.toString());
  window.location.reload();
};

const getDemoStats = (): DashboardStats => {
  return {
    r1_forms: 2,
    r2_forms: 1, 
    baiko_forms: 1,
    forms_in_progress: 1,
    forms_awaiting_reading: 2
  };
};

const sites = [
  { id: 'R1', name: 'Laiterie Collet (R1)', color: 'bg-blue-50 border-blue-200' },
  { id: 'R2', name: 'Végétal Santé (R2)', color: 'bg-green-50 border-green-200' },
  { id: 'BAIKO', name: 'Laiterie Baiko', color: 'bg-purple-50 border-purple-200' },
];

interface DashboardStats {
  r1_forms: number;
  r2_forms: number;
  baiko_forms: number;
  forms_in_progress: number;
  forms_awaiting_reading: number;
}

const QualityControlPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    r1_forms: 0,
    r2_forms: 0,
    baiko_forms: 0,
    forms_in_progress: 0,
    forms_awaiting_reading: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      if (isDemoMode()) {
        // Utiliser les données de démo
        const demoStats = getDemoStats();
        setStats(demoStats);
        return;
      }
      
      // 1. Compter les formulaires par site (depuis samples)
      const { data: samples, error } = await supabase
        .from('samples')
        .select('form_id, site')
        .not('form_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des stats:', error);
        return;
      }

      // Compter les formulaires uniques par site
      const uniqueFormsR1 = new Set(samples?.filter(s => s.site === 'R1').map(s => s.form_id) || []);
      const uniqueFormsR2 = new Set(samples?.filter(s => s.site === 'R2').map(s => s.form_id) || []);
      const uniqueFormsBAIKO = new Set(samples?.filter(s => s.site === 'BAIKO').map(s => s.form_id) || []);

      // 2. Compter les formulaires en "Analyse en cours" (status = 'analyses_en_cours' dans samples)
      const { data: progressSamples } = await supabase
        .from('samples')
        .select('form_id, status')
        .eq('status', 'analyses_en_cours')
        .not('form_id', 'is', null);

      const uniqueFormsInProgress = new Set(progressSamples?.map(s => s.form_id) || []);

      // 3. Compter les formulaires en "Lectures en attente" (depuis form_bacteria_selections)
      // C'est la même logique que LecturesEnAttentePage
      const { data: bacteriaData } = await supabase
        .from('form_bacteria_selections')
        .select('form_id, status')
        .in('status', ['pending', 'late'])
        .not('form_id', 'is', null);

      // Compter les formulaires uniques avec au moins une bactérie en attente
      const uniqueFormsAwaitingReading = new Set(bacteriaData?.map(b => b.form_id) || []);

      console.log('📊 Stats calculées:', {
        r1: uniqueFormsR1.size,
        r2: uniqueFormsR2.size,
        baiko: uniqueFormsBAIKO.size,
        in_progress: uniqueFormsInProgress.size,
        awaiting_reading: uniqueFormsAwaitingReading.size
      });

      const stats: DashboardStats = {
        r1_forms: uniqueFormsR1.size,
        r2_forms: uniqueFormsR2.size,
        baiko_forms: uniqueFormsBAIKO.size,
        forms_in_progress: uniqueFormsInProgress.size,
        forms_awaiting_reading: uniqueFormsAwaitingReading.size
      };

      setStats(stats);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAnalysis = async () => {
    try {
      // Récupérer les analyses depuis Supabase au lieu du localStorage
      const { data: samples, error } = await supabase
        .from('samples')
        .select('*')
        .order('modified_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erreur lors de la récupération des analyses:', error);
        return;
      }

      if (samples && samples.length > 0) {
        // Grouper par formulaire
        const analysesByForm = samples.reduce((acc, sample) => {
          const formId = sample.form_id || sample.report_title || 'unknown';
          if (!acc[formId]) {
            acc[formId] = {
              formId,
              reportTitle: sample.report_title || 'Analyse sans titre',
              samples: [],
              status: sample.status,
              lastModified: sample.modified_at || sample.created_at,
              brand: sample.brand,
              site: sample.site
            };
          }
          acc[formId].samples.push(sample);
          return acc;
        }, {});

        const formsList = Object.values(analysesByForm);
        console.log('Analyses chargées depuis Supabase:', formsList.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement depuis Supabase:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role === 'coordinator') {
      navigate('/technical-info', {
        state: {
          selectedSite,
          analysisDate: date
        }
      });
    } else {
      // Plus de localStorage - navigation directe vers sample-entry
      navigate('/sample-entry', {
        state: {
          reportTitle: 'Nouveau rapport',
          samples: [],
          brand: '',
          selectedSite,
          analysisDate: date,
          isNew: true // Indiquer que c'est un nouveau formulaire
        }
      });
    }
  };

  const handleCreateNewForm = () => {
    // Plus de localStorage.clear() - navigation directe
    navigate('/technical-info', {
      state: {
        selectedSite: '',
        analysisDate: new Date(),
        isNew: true
      }
    });
  };

  const quickActions = user?.role === 'coordinator' 
    ? [
        {
          title: 'Mes Formulaires',
          description: 'Historique et suivi de mes demandes',
          icon: <History className="h-5 w-5" />,
          action: () => navigate('/forms-history'),
          color: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
        },
        {
          title: 'Non-Conformités',
          description: 'Voir les échantillons non conformes',
          icon: <AlertTriangle className="h-5 w-5" />,
          action: () => navigate('/non-conformites'),
          color: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
        }
      ]
    : [
        {
          title: 'Mes Formulaires',
          description: 'Historique et suivi des formulaires',
          icon: <History className="h-5 w-5" />,
          action: () => navigate('/forms-history'),
          color: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
        },
        {
          title: 'Analyses en Cours',
          description: 'Voir les analyses en cours',
          icon: <Clock className="h-5 w-5" />,
          action: () => navigate('/analyses-en-cours'),
          color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'
        },
        {
          title: 'Lectures en Attente',
          description: 'Formulaires prêts pour lecture',
          icon: <Microscope className="h-5 w-5" />,
          action: () => navigate('/lectures-en-attente'),
          color: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
        },
        {
          title: 'Non-Conformités',
          description: 'Voir les échantillons non conformes',
          icon: <AlertTriangle className="h-5 w-5" />,
          action: () => navigate('/non-conformites'),
          color: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
        }
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Header hideMenuItems={['Lectures en Attente', 'Formulaires', 'Administration', 'Historique']} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Bannière de mode démo */}
        {isDemoMode() && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <div>
                    <span className="font-medium text-orange-800">⚠️ Mode Démo activé</span>
                    <span className="text-sm text-orange-700 ml-2">
                      – Les données sont simulées et les délais sont raccourcis pour les tests.
                    </span>
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    Délais raccourcis : Entérobactéries, E.coli, Coliformes, Staphylocoques: 1min • Listeria: 2min • Levures/Moisissures: 3-5min
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDemoMode(false)}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Désactiver
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header avec informations utilisateur */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Beaker className="h-8 w-8 text-blue-600" />
                Contrôle Qualité Microbiologique
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Connecté en tant que <span className="font-medium text-blue-600">{user?.role === 'coordinator' ? 'Demandeur' : 'Technicien'}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {stats.r1_forms + stats.r2_forms + stats.baiko_forms} formulaires total
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                {stats.forms_in_progress} en cours
              </Badge>
              <Badge variant="outline" className="bg-teal-50 text-teal-700">
                {stats.forms_awaiting_reading} en attente
              </Badge>
              
              {/* Toggle mode démo */}
              {!isDemoMode() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDemoMode(true)}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 mt-2"
                >
                  <TestTube className="h-3 w-3 mr-1" />
                  Activer Mode Démo
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="hover:shadow-md transition-shadow border-blue-200 bg-blue-50">
            <CardContent className="p-6 text-center">
              <Building className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-blue-700">{loading ? '...' : stats.r1_forms}</div>
              <div className="text-sm font-medium text-blue-600 mt-2">Total des Formulaires - Site R1</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <Building className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-green-700">{loading ? '...' : stats.r2_forms}</div>
              <div className="text-sm font-medium text-green-600 mt-2">Total des Formulaires - Site R2</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow border-purple-200 bg-purple-50">
            <CardContent className="p-6 text-center">
              <Building className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-purple-700">{loading ? '...' : stats.baiko_forms}</div>
              <div className="text-sm font-medium text-purple-600 mt-2">Total des Formulaires - Site BAIKO</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow border-orange-200 bg-orange-50">
            <CardContent className="p-6 text-center">
              <Clock className="h-10 w-10 text-orange-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-orange-700">{loading ? '...' : stats.forms_in_progress}</div>
              <div className="text-sm font-medium text-orange-600 mt-2">Formulaires en Analyse en Cours</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow border-teal-200 bg-teal-50">
            <CardContent className="p-6 text-center">
              <Microscope className="h-10 w-10 text-teal-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-teal-700">{loading ? '...' : stats.forms_awaiting_reading}</div>
              <div className="text-sm font-medium text-teal-600 mt-2">Formulaires en Lecture en Attente</div>
            </CardContent>
          </Card>
        </div>

        <div className={user?.role === 'coordinator' ? 'grid grid-cols-1 lg:grid-cols-3 gap-8' : 'w-full'}>
          {/* Formulaire principal - seulement pour les demandeurs */}
          {user?.role === 'coordinator' && (
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    Nouvelle Demande d'Analyse
                  </CardTitle>
                  <CardDescription>
                    Sélectionnez le site et la date pour créer une nouvelle demande
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Site de production</Label>
                        <RadioGroup
                          value={selectedSite}
                          onValueChange={setSelectedSite}
                          className="grid grid-cols-1 gap-3"
                        >
                          {sites.map((site) => (
                            <div key={site.id} 
                                 className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                                   selectedSite === site.id ? site.color + ' border-opacity-100' : 'border-gray-200 hover:border-gray-300'
                                 }`}>
                              <RadioGroupItem value={site.id} id={`site-${site.id}`} />
                              <Label htmlFor={`site-${site.id}`} className="cursor-pointer font-medium flex-1">
                                {site.name}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Date d'analyse</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="lg"
                              className={cn(
                                "w-full justify-start text-left h-12",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-5 w-5" />
                              {date ? (
                                format(date, "d MMMM yyyy", { locale: fr })
                              ) : (
                                <span>Sélectionner une date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={setDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={!selectedSite || !date}
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                    >
                      <Building className="w-5 h-5 mr-2" />
                      Créer la demande d'analyse
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions rapides et informations */}
          <div className={user?.role === 'coordinator' ? 'space-y-6' : 'w-full'}>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Actions Rapides
                </CardTitle>
              </CardHeader>
              <CardContent className={user?.role === 'coordinator' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="lg"
                    className={`w-full justify-start h-auto p-6 ${action.color} transition-all duration-300 hover:scale-105`}
                    onClick={action.action}
                  >
                    <div className="flex items-start gap-3 text-left">
                      <div className="mt-1">{action.icon}</div>
                      <div>
                        <div className="font-semibold">{action.title}</div>
                        <div className="text-sm opacity-75 mt-1">{action.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Message d'aide selon le rôle */}
        <Card className={user?.role === 'coordinator' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${user?.role === 'coordinator' ? 'bg-blue-100' : 'bg-green-100'}`}>
                <Users className={`h-5 w-5 ${user?.role === 'coordinator' ? 'text-blue-600' : 'text-green-600'}`} />
              </div>
              <div>
                <h4 className={`font-semibold ${user?.role === 'coordinator' ? 'text-blue-900' : 'text-green-900'}`}>
                  Guide {user?.role === 'coordinator' ? 'Demandeur' : 'Technicien'}
                </h4>
                <p className={`text-sm mt-1 ${user?.role === 'coordinator' ? 'text-blue-700' : 'text-green-700'}`}>
                  {user?.role === 'coordinator' 
                    ? 'En tant que demandeur, vous pouvez créer de nouvelles demandes d\'analyse, consulter l\'historique de vos formulaires et accéder aux statistiques. Les techniciens se chargeront de l\'exécution des analyses.'
                    : 'En tant que technicien, vous pouvez effectuer les analyses, saisir les résultats des lectures microbiologiques et compléter les formulaires d\'analyse créés par les demandeurs.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default QualityControlPage;
