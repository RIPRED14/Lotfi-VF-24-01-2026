import React from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BacteriaStatusBadge, BacteriaItem, useBacteriaStatus } from './BacteriaStatusBadge';

interface BacteriaCalendarWidgetProps {
  bacteria: BacteriaItem[];
  onBacteriaClick?: (bacteria: BacteriaItem) => void;
  title?: string;
  compact?: boolean;
}

export const BacteriaCalendarWidget: React.FC<BacteriaCalendarWidgetProps> = ({
  bacteria,
  onBacteriaClick,
  title = "Calendrier des lectures",
  compact = false
}) => {
  // Organiser les bactéries par jour de la semaine
  const organizeByWeekday = () => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Commencer le lundi
    
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(startOfCurrentWeek, index);
      return {
        date,
        name: format(date, 'EEEE', { locale: fr }),
        shortName: format(date, 'EEE', { locale: fr }),
        dayNumber: format(date, 'd'),
        bacteria: [] as BacteriaItem[]
      };
    });

    // Répartir les bactéries selon leurs dates de lecture
    bacteria.forEach(bacterium => {
      if (bacterium.readingDate) {
        const readingDate = new Date(bacterium.readingDate);
        const dayIndex = (readingDate.getDay() + 6) % 7; // Convertir dimanche=0 en dimanche=6
        if (weekDays[dayIndex]) {
          weekDays[dayIndex].bacteria.push(bacterium);
        }
      }
    });

    return weekDays;
  };

  const weekDays = organizeByWeekday();
  const bacteriaByStatus = useBacteriaStatus(bacteria);

  // Statistiques rapides
  const stats = {
    total: bacteria.length,
    ready: bacteriaByStatus.ready.length,
    pending: bacteriaByStatus.pending.length,
    completed: bacteriaByStatus.completed.length,
    overdue: bacteriaByStatus.overdue.length
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {stats.ready + stats.overdue} prêt(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-7 gap-1 text-xs">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center">
                <div className="font-medium text-gray-600 mb-1">
                  {day.shortName}
                </div>
                <div className="space-y-1">
                  {day.bacteria.map((bacterium) => (
                    <div key={bacterium.id} className="w-full">
                      <BacteriaStatusBadge
                        bacteria={bacterium}
                        compact={true}
                        onClick={() => onBacteriaClick?.(bacterium)}
                      />
                    </div>
                  ))}
                  {day.bacteria.length === 0 && (
                    <div className="text-gray-300 text-center py-2">•</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {title}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {stats.ready} prêt(s)
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {stats.completed} terminé(s)
            </Badge>
          </div>
        </div>
        
        {/* Statistiques détaillées */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-600">{stats.pending}</div>
            <div className="text-xs text-gray-500">En attente</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">{stats.ready}</div>
            <div className="text-xs text-orange-600">Prêt à lire</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {bacteria.filter(b => b.status === 'in_progress').length}
            </div>
            <div className="text-xs text-blue-600">En cours</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-green-600">Terminé</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {bacteria.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Aucune bactérie à afficher</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map((day, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50/50">
                <div className="text-center mb-3">
                  <div className="font-medium text-gray-800 capitalize">{day.name}</div>
                  <div className="text-lg font-bold text-blue-600">{day.dayNumber}</div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {day.bacteria.length} bactérie(s)
                  </Badge>
                </div>

                <div className="space-y-2">
                  {day.bacteria.map((bacterium) => (
                    <BacteriaStatusBadge
                      key={bacterium.id}
                      bacteria={bacterium}
                      onClick={() => onBacteriaClick?.(bacterium)}
                    />
                  ))}
                  
                  {day.bacteria.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      Aucune lecture
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Légende */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Légende des couleurs :</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
              <span className="text-orange-700">Prêt à lire</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
              <span className="text-green-700">Terminé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
              <span className="text-gray-700">En attente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
              <span className="text-blue-700">En cours</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 