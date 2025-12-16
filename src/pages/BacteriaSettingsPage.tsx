import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Save, RotateCcw, Clock, Microscope, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBacteriaSettingsStore, BacteriaSettings } from '@/stores/bacteriaSettingsStore';

const BacteriaSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    bacteria,
    updateBacteriaDelay,
    updateBacteriaSettings,
    resetToDefaults
  } = useBacteriaSettingsStore();

  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [localSettings, setLocalSettings] = useState<{ [key: string]: Partial<BacteriaSettings> }>({});

  const handleEdit = (bacteriaId: string) => {
    const bacteria = useBacteriaSettingsStore.getState().getBacteriaById(bacteriaId);
    if (bacteria) {
      setLocalSettings(prev => ({
        ...prev,
        [bacteriaId]: { ...bacteria }
      }));
      setEditMode(prev => ({
        ...prev,
        [bacteriaId]: true
      }));
    }
  };

  const handleSave = (bacteriaId: string) => {
    const settings = localSettings[bacteriaId];
    if (settings) {
      updateBacteriaSettings(bacteriaId, settings);
      setEditMode(prev => ({
        ...prev,
        [bacteriaId]: false
      }));
      toast({
        title: "Paramètres sauvegardés",
        description: `Les paramètres pour ${settings.name} ont été mis à jour`,
        duration: 3000
      });
    }
  };

  const handleCancel = (bacteriaId: string) => {
    setEditMode(prev => ({
      ...prev,
      [bacteriaId]: false
    }));
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[bacteriaId];
      return newSettings;
    });
  };

  const handleLocalChange = (bacteriaId: string, field: keyof BacteriaSettings, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [bacteriaId]: {
        ...prev[bacteriaId],
        [field]: value
      }
    }));
  };

  const handleQuickDelayChange = (bacteriaId: string, hours: number) => {
    updateBacteriaDelay(bacteriaId, hours);
    toast({
      title: "Délai mis à jour",
      description: `Nouveau délai: ${hours}h`,
      duration: 2000
    });
  };

  const handleResetToDefaults = () => {
    resetToDefaults();
    setEditMode({});
    setLocalSettings({});
    toast({
      title: "Paramètres réinitialisés",
      description: "Tous les paramètres ont été remis aux valeurs par défaut",
      duration: 3000
    });
  };

  const formatDelayDisplay = (hours: number): string => {
    if (hours < 24) {
      return `${hours}h`;
    } else if (hours % 24 === 0) {
      const days = hours / 24;
      return `${days}j`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}j${remainingHours}h`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Paramètres des Bactéries</h1>
              <p className="text-gray-600">Configuration des délais et propriétés des micro-organismes</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Réinitialiser</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Actions rapides</span>
            </CardTitle>
            <CardDescription>
              Modifications rapides des délais les plus courants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Entérobactéries</Label>
                <div className="flex space-x-1">
                  {[12, 24, 36, 48].map(hours => (
                    <Button
                      key={hours}
                      variant={bacteria.find(b => b.id === 'entero')?.delayHours === hours ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickDelayChange('entero', hours)}
                    >
                      {hours}h
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Coliformes</Label>
                <div className="flex space-x-1">
                  {[24, 48, 72].map(hours => (
                    <Button
                      key={hours}
                      variant={bacteria.find(b => b.id === 'coliformes')?.delayHours === hours ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickDelayChange('coliformes', hours)}
                    >
                      {formatDelayDisplay(hours)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Levures 5j</Label>
                <div className="flex space-x-1">
                  {[96, 120, 144].map(hours => (
                    <Button
                      key={hours}
                      variant={bacteria.find(b => b.id === 'levures5j')?.delayHours === hours ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickDelayChange('levures5j', hours)}
                    >
                      {formatDelayDisplay(hours)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Listeria</Label>
                <div className="flex space-x-1">
                  {[48, 72, 96].map(hours => (
                    <Button
                      key={hours}
                      variant={bacteria.find(b => b.id === 'listeria')?.delayHours === hours ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickDelayChange('listeria', hours)}
                    >
                      {formatDelayDisplay(hours)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bacteria Settings Cards */}
        <div className="grid gap-6">
          {bacteria.map(bacterium => {
            const isEditing = editMode[bacterium.id];
            const currentSettings = isEditing ? localSettings[bacterium.id] || bacterium : bacterium;

            return (
              <Card key={bacterium.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${bacterium.color.split(' ')[0]}`}></div>
                      <div>
                        <CardTitle className="text-lg">{bacterium.name}</CardTitle>
                        <CardDescription>{bacterium.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{bacterium.delayDisplay}</span>
                      </Badge>
                      <Switch
                        checked={bacterium.enabled}
                        onCheckedChange={(checked) => updateBacteriaSettings(bacterium.id, { enabled: checked })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${bacterium.id}`}>Nom</Label>
                          <Input
                            id={`name-${bacterium.id}`}
                            value={currentSettings.name || ''}
                            onChange={(e) => handleLocalChange(bacterium.id, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`delay-${bacterium.id}`}>Délai (heures)</Label>
                          <Input
                            id={`delay-${bacterium.id}`}
                            type="number"
                            min="1"
                            max="720"
                            value={currentSettings.delayHours || 24}
                            onChange={(e) => handleLocalChange(bacterium.id, 'delayHours', parseInt(e.target.value) || 24)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`description-${bacterium.id}`}>Description</Label>
                        <Textarea
                          id={`description-${bacterium.id}`}
                          value={currentSettings.description || ''}
                          onChange={(e) => handleLocalChange(bacterium.id, 'description', e.target.value)}
                          placeholder="Description de la bactérie..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={() => handleSave(bacterium.id)} size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Sauvegarder
                        </Button>
                        <Button variant="outline" onClick={() => handleCancel(bacterium.id)} size="sm">
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Délai:</span>
                          <div className="font-medium">{bacterium.delayHours}h ({bacterium.delayDisplay})</div>
                        </div>
                        <div>
                          <span className="text-gray-500">ID:</span>
                          <div className="font-mono text-xs">{bacterium.id}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Statut:</span>
                          <div className={`text-xs ${bacterium.enabled ? 'text-green-600' : 'text-red-600'}`}>
                            {bacterium.enabled ? 'Activé' : 'Désactivé'}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(bacterium.id)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <Info className="h-5 w-5" />
              <span>Informations importantes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Les délais sont exprimés en heures et calculés automatiquement en jours/heures</li>
              <li>• Les modifications prennent effet immédiatement pour les nouvelles analyses</li>
              <li>• Les analyses en cours conservent leurs délais d'origine</li>
              <li>• La réinitialisation restaure les valeurs par défaut du laboratoire</li>
              <li>• Les paramètres sont sauvegardés localement dans votre navigateur</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BacteriaSettingsPage; 