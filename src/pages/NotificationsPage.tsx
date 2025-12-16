import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import BacteriaNotificationSystem from '@/components/BacteriaNotificationSystem';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Notifications" 
        hideMenuItems={['Lectures en Attente', 'Historique', 'Formulaires', 'Administration']} 
      />

      <div className="bg-[#0d47a1] text-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/quality-control')}
              className="flex items-center space-x-2 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications Bactéries
            </h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <BacteriaNotificationSystem />
      </main>
    </div>
  );
};

export default NotificationsPage; 