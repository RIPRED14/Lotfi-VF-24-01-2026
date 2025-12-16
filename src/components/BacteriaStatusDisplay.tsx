import React from 'react';
import { Clock, Settings, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBacteriaSettingsStore } from '@/stores/bacteriaSettingsStore';
import { useNavigate } from 'react-router-dom';

interface BacteriaStatusDisplayProps {
  compact?: boolean;
  showSettings?: boolean;
}

const BacteriaStatusDisplay: React.FC<BacteriaStatusDisplayProps> = ({ 
  compact = false, 
  showSettings = true 
}) => {
  const { bacteria } = useBacteriaSettingsStore();
  const navigate = useNavigate();

  const enabledBacteria = bacteria.filter(b => b.enabled);
  const disabledBacteria = bacteria.filter(b => !b.enabled);

  const handleOpenSettings = () => {
    navigate('/bacteria-settings');
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Bactéries configurées</h4>
            {showSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenSettings}
                className="h-6 px-2"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {enabledBacteria.map((bacterium) => (
              <Badge 
                key={bacterium.id} 
                variant="outline" 
                className="text-xs"
              >
                {bacterium.name}: {bacterium.delayDisplay}
              </Badge>
            ))}
          </div>
          {disabledBacteria.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {disabledBacteria.length} bactérie(s) désactivée(s)
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Paramètres des Bactéries</span>
            </CardTitle>
            <CardDescription>
              Configuration actuelle des délais d'incubation
            </CardDescription>
          </div>
          {showSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSettings}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Modifier</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bactéries activées */}
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Bactéries activées ({enabledBacteria.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {enabledBacteria.map((bacterium) => (
                <div
                  key={bacterium.id}
                  className={`p-3 rounded-lg border ${bacterium.color} transition-all hover:shadow-md`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-sm">{bacterium.name}</h5>
                      <p className="text-xs opacity-75">{bacterium.description}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {bacterium.delayDisplay}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs opacity-75">
                    {bacterium.delayHours}h ({Math.round(bacterium.delayHours / 24 * 10) / 10}j)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bactéries désactivées */}
          {disabledBacteria.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                Bactéries désactivées ({disabledBacteria.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {disabledBacteria.map((bacterium) => (
                  <div
                    key={bacterium.id}
                    className="p-3 rounded-lg border border-gray-200 bg-gray-50 opacity-60"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-sm text-gray-600">{bacterium.name}</h5>
                        <p className="text-xs text-gray-500">{bacterium.description}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 text-gray-500">
                        {bacterium.delayDisplay}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Résumé</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-blue-600">Total:</span>
                <div className="font-medium">{bacteria.length} bactéries</div>
              </div>
              <div>
                <span className="text-green-600">Activées:</span>
                <div className="font-medium">{enabledBacteria.length}</div>
              </div>
              <div>
                <span className="text-red-600">Désactivées:</span>
                <div className="font-medium">{disabledBacteria.length}</div>
              </div>
              <div>
                <span className="text-gray-600">Délai moyen:</span>
                <div className="font-medium">
                  {enabledBacteria.length > 0 
                    ? Math.round(enabledBacteria.reduce((sum, b) => sum + b.delayHours, 0) / enabledBacteria.length)
                    : 0}h
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Export par défaut et export nommé pour la compatibilité
export default BacteriaStatusDisplay;
export { BacteriaStatusDisplay }; 