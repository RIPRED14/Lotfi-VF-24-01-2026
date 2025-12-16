import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Calendar, List, BarChart3, Beaker, Clock, AlertCircle } from 'lucide-react';
import { BacteriaStatusDisplay } from '@/components/BacteriaStatusDisplay';
import { BacteriaStatusBadge, BacteriaItem, useBacteriaStatus } from '@/components/BacteriaStatusBadge';
import { BacteriaCalendarWidget } from '@/components/BacteriaCalendarWidget';
import { useBacteriaSettingsStore } from '@/stores/bacteriaSettingsStore';
import { useBacteriaDateCalculation } from '@/hooks/useBacteriaDateCalculation';

const BacteriaExamplePage: React.FC = () => {
  const { bacteria, updateBacteriaDelay, toggleBacteriaEnabled } = useBacteriaSettingsStore();
  const { calculateReadingDate, groupByReadingDay } = useBacteriaDateCalculation();
  const [mockSamples, setMockSamples] = useState<BacteriaItem[]>([]);
  const [activeDemo, setActiveDemo] = useState<string>('overview');

  // Générer des données d'exemple pour la démonstration
  useEffect(() => {
    const generateMockSamples = () => {
      const samples: BacteriaItem[] = [];
      
      bacteria.forEach((bacterium, index) => {
        if (bacterium.enabled) {
          const baseDate = new Date();
          baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 7) + index);
          
          // Créer plusieurs échantillons avec différents statuts
          for (let i = 0; i < 3; i++) {
            const sampleDate = new Date(baseDate);
            sampleDate.setDate(sampleDate.getDate() + i * 2);
            
            const readingDate = calculateReadingDate(bacterium.id, sampleDate);
            
            let status: 'pending' | 'in_progress' | 'completed' | 'overdue' = 'pending';
            const now = new Date();
            
            if (readingDate <= now) {
              if (Math.random() > 0.5) {
                status = Math.random() > 0.3 ? 'completed' : 'in_progress';
              } else {
                status = readingDate < new Date(now.getTime() - 24 * 60 * 60 * 1000) ? 'overdue' : 'ready';
              }
            }

            samples.push({
              id: `${bacterium.id}-sample-${i}`,
              name: bacterium.name,
              delay: bacterium.delayDisplay,
              readingDate: readingDate.toISOString(),
              status,
              form_id: `FORM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              created_at: sampleDate.toISOString()
            });
          }
        }
      });
      
      setMockSamples(samples);
    };

    generateMockSamples();
  }, [bacteria, calculateReadingDate]);

  const bacteriaByStatus = useBacteriaStatus(mockSamples);
  const enabledBacteria = bacteria.filter(b => b.enabled);
  const disabledBacteria = bacteria.filter(b => !b.enabled);

  const handleBacteriaClick = (bacteria: BacteriaItem) => {
    alert(`Clic sur ${bacteria.name}\nStatut: ${bacteria.status}\nDate de lecture: ${new Date(bacteria.readingDate).toLocaleDateString()}`);
  };

  const handleQuickSettings = (bacteriaId: string, newDelay: number) => {
    updateBacteriaDelay(bacteriaId, newDelay);
  };

  // Obtenir les bactéries en cours manuellement depuis les samples
  const inProgressBacteria = mockSamples.filter(sample => sample.status === 'in_progress');

  const stats = {
    total: mockSamples.length,
    ready: bacteriaByStatus.ready.length,
    overdue: bacteriaByStatus.overdue.length,
    completed: bacteriaByStatus.completed.length,
    pending: bacteriaByStatus.pending.length,
    inProgress: inProgressBacteria.length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Beaker className="w-8 h-8 text-blue-600" />
            Démo - Système de Bactéries
          </h1>
          <p className="text-gray-600 mt-2">
            Démonstration complète du système de paramètres et d'affichage des bactéries
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {enabledBacteria.length} bactéries actives
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            {stats.ready + stats.overdue} à traiter
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">{stats.pending}</div>
            <div className="text-sm text-gray-500">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.ready}</div>
            <div className="text-sm text-orange-600">Prêt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-blue-600">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-green-600">Terminé</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-red-600">En retard</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Liste détaillée
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Display Compact */}
            <BacteriaStatusDisplay compact />
            
            {/* Calendar Widget Compact */}
            <BacteriaCalendarWidget 
              bacteria={mockSamples} 
              onBacteriaClick={handleBacteriaClick}
              compact 
            />
          </div>

          {/* Recent Bacteria by Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Prêtes à lire ({stats.ready})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bacteriaByStatus.ready.slice(0, 5).map(bacteria => (
                  <BacteriaStatusBadge 
                    key={bacteria.id} 
                    bacteria={bacteria} 
                    onClick={() => handleBacteriaClick(bacteria)}
                  />
                ))}
                {stats.ready > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{stats.ready - 5} autres...
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  En cours ({stats.inProgress})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inProgressBacteria.slice(0, 5).map(bacteria => (
                  <BacteriaStatusBadge 
                    key={bacteria.id} 
                    bacteria={bacteria} 
                    onClick={() => handleBacteriaClick(bacteria)}
                  />
                ))}
                {stats.inProgress > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{stats.inProgress - 5} autres...
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <Beaker className="w-4 h-4" />
                  Terminées ({stats.completed})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bacteriaByStatus.completed.slice(0, 5).map(bacteria => (
                  <BacteriaStatusBadge 
                    key={bacteria.id} 
                    bacteria={bacteria} 
                    onClick={() => handleBacteriaClick(bacteria)}
                  />
                ))}
                {stats.completed > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{stats.completed - 5} autres...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <BacteriaCalendarWidget 
            bacteria={mockSamples} 
            onBacteriaClick={handleBacteriaClick}
            title="Calendrier complet des lectures"
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Liste complète des échantillons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {Object.entries(groupByReadingDay(mockSamples)).map(([date, dayBacteria]) => (
                  <div key={date} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3 text-gray-800">
                      {new Date(date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      <Badge variant="secondary" className="ml-2">
                        {dayBacteria.length} échantillon(s)
                      </Badge>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dayBacteria.map(bacteria => (
                        <BacteriaStatusBadge 
                          key={bacteria.id} 
                          bacteria={bacteria} 
                          onClick={() => handleBacteriaClick(bacteria)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Settings */}
            <BacteriaStatusDisplay />
            
            {/* Quick Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Paramètres rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bacteria.map(bacterium => (
                  <div key={bacterium.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Button
                        variant={bacterium.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBacteriaEnabled(bacterium.id)}
                      >
                        {bacterium.enabled ? "Activé" : "Désactivé"}
                      </Button>
                      <span className="font-medium">{bacterium.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{bacterium.delayHours}h</span>
                      <div className="flex gap-1">
                        {[24, 48, 72].map(hours => (
                          <Button
                            key={hours}
                            variant={bacterium.delayHours === hours ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handleQuickSettings(bacterium.id, hours)}
                          >
                            {hours}h
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.href = '/bacteria-settings'}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Ouvrir les paramètres complets
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BacteriaExamplePage; 