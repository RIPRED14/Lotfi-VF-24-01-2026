import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Beaker, 
  UserCheck, 
  ClipboardList, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  CheckCircle,
  BarChart3,
  Settings,
  FlaskConical,
  Microscope,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Nettoyer les anciennes données du localStorage
  useEffect(() => {
    const cleanOldData = () => {
      // Nettoyer les données utilisateur
      const storedUser = localStorage.getItem('qc_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.email && userData.email.includes('demo.coordinator')) {
            userData.email = userData.email.replace('demo.coordinator', 'demo.demandeur');
            userData.name = userData.name.replace('demo.coordinator', 'demo.demandeur');
            localStorage.setItem('qc_user', JSON.stringify(userData));
          }
        } catch (e) {
          console.log('Erreur lors du nettoyage des données utilisateur');
        }
      }

      // Nettoyer les logs d'accès
      const accessLog = localStorage.getItem('qc_access_log');
      if (accessLog) {
        try {
          const logData = JSON.parse(accessLog);
          const cleanedLog = logData.map((entry: any) => ({
            ...entry,
            email: entry.email ? entry.email.replace('demo.coordinator', 'demo.demandeur') : entry.email
          }));
          localStorage.setItem('qc_access_log', JSON.stringify(cleanedLog));
        } catch (e) {
          console.log('Erreur lors du nettoyage des logs');
        }
      }
    };

    cleanOldData();
  }, []);

  const handleQuickAccess = async (role: 'coordinator' | 'technician') => {
    const email = role === 'coordinator' ? 'demo.demandeur@collet.fr' : 'demo.technician@collet.fr';
    await login(email, 'demo123', role);
    navigate('/quality-control');
  };

  const handleQuickActionClick = async (action: any) => {
    if (action.href === '/admin') {
      // Connexion automatique pour l'administration
      await login('demo.demandeur@collet.fr', 'demo123', 'coordinator');
      navigate('/admin');
    } else {
      // Pour les autres actions, navigation simple
      navigate(action.href);
    }
  };

  const quickActions = [
    {
      title: 'Administration',
      description: 'Panneau d\'administration système',
      icon: <Shield className="h-5 w-5" />,
      href: '/admin',
      color: 'bg-red-50 hover:bg-red-100 text-red-700',
      role: 'coordinator'
    },
    {
      title: 'Gestion des Produits',
      description: 'Créer et gérer les produits',
      icon: <FlaskConical className="h-5 w-5" />,
      href: '/products',
      color: 'bg-orange-50 hover:bg-orange-100 text-orange-700',
      role: 'coordinator'
    },
    {
      title: 'Non-Conformités',
      description: 'Voir les échantillons non conformes',
      icon: <AlertTriangle className="h-5 w-5" />,
      href: '/non-conformites',
      color: 'bg-red-50 hover:bg-red-100 text-red-700',
      role: 'both'
    },
    {
      title: 'Paramètres Bactéries',
      description: 'Configuration des délais',
      icon: <Settings className="h-5 w-5" />,
      href: '/bacteria-settings',
      color: 'bg-gray-50 hover:bg-gray-100 text-gray-700',
      role: 'coordinator'
    },
    {
      title: 'Statistiques',
      description: 'Tableaux de bord et rapports',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/quality-control-dashboard',
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
      role: 'both'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-12 items-center">
            {/* MAISON COLLET - 2 colonnes à gauche */}
            <div className="col-span-2 flex justify-start">
              <div className="transition-all duration-300 hover:scale-105 hover:text-blue-600">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {/* Logo MAISON COLLET - Fleur à 5 pétales verts avec goutte blanche */}
                  <svg 
                    width="32" 
                    height="32" 
                    viewBox="0 0 32 32" 
                    className="transition-transform duration-300 hover:rotate-12"
                  >
                    {/* 5 pétales verts arrondis */}
                    <g fill="#22c55e">
                      {/* Pétale 1 - en haut */}
                      <ellipse cx="16" cy="8" rx="6" ry="8" transform="rotate(0 16 16)" />
                      {/* Pétale 2 - en haut-droite */}
                      <ellipse cx="22" cy="12" rx="6" ry="8" transform="rotate(72 16 16)" />
                      {/* Pétale 3 - en bas-droite */}
                      <ellipse cx="22" cy="20" rx="6" ry="8" transform="rotate(144 16 16)" />
                      {/* Pétale 4 - en bas-gauche */}
                      <ellipse cx="16" cy="24" rx="6" ry="8" transform="rotate(216 16 16)" />
                      {/* Pétale 5 - en haut-gauche */}
                      <ellipse cx="10" cy="20" rx="6" ry="8" transform="rotate(288 16 16)" />
                    </g>
                    
                    {/* Forme blanche centrale en goutte d'eau */}
                    <ellipse cx="16" cy="18" rx="2.5" ry="4" fill="white" />
                  </svg>
                  MAISON COLLET
                </h1>
              </div>
            </div>
            
            {/* Titre principal - 8 colonnes au centre */}
            <div className="col-span-8 text-center">
              <h2 className="text-4xl font-bold text-blue-600 transition-all duration-300 hover:text-blue-700 hover:scale-105">
                Système de Contrôle Qualité Microbiologique
              </h2>
            </div>
            
            {/* Version - 2 colonnes à droite */}
            <div className="col-span-2 flex justify-end">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 transition-all duration-300 hover:bg-blue-100">
                Version 1.1.0
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Portails d'accès Utilisateur */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-blue-600" />
            Portails d'Accès Utilisateur
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 h-full flex flex-col"
                  onClick={() => handleQuickAccess('coordinator')}>
              <CardHeader className="text-center pb-4 flex-1">
                <UserCheck className="h-12 w-12 text-blue-600 mx-auto mb-3 transition-transform duration-300 hover:scale-110" />
                <CardTitle className="text-blue-800">Accès Demandeur</CardTitle>
                <CardDescription>
                  Créer et gérer les demandes d'analyse
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 hover:shadow-lg" size="lg">
                  Se connecter
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 h-full flex flex-col"
                  onClick={() => handleQuickAccess('technician')}>
              <CardHeader className="text-center pb-4 flex-1">
                <ClipboardList className="h-12 w-12 text-green-600 mx-auto mb-3 transition-transform duration-300 hover:scale-110" />
                <CardTitle className="text-green-800">Accès Technicien</CardTitle>
                <CardDescription>
                  Effectuer les analyses et saisir les résultats
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full bg-green-600 hover:bg-green-700 transition-all duration-300 hover:shadow-lg" size="lg">
                  Se connecter
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Accès indicateurs et rapports */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Accès Indicateurs et Rapports
          </h2>
          <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto">
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 bg-purple-50 hover:bg-purple-100 border-purple-200 h-full flex flex-col"
                  onClick={() => handleQuickActionClick({ href: '/quality-control-dashboard' })}>
              <CardHeader className="text-center pb-4 flex-1">
                <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-3 transition-transform duration-300 hover:scale-110" />
                <CardTitle className="text-purple-800">TABLEAU DE BORD</CardTitle>
                <CardDescription>
                  Visualiser les statistiques et analyses
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-300 hover:shadow-lg" size="lg">
                  Accéder au tableau de bord
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Accès rapide aux fonctionnalités */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Accès Rapide aux Fonctionnalités
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.slice(0, 4).map((action, index) => (
              <Card key={index} className={`hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] ${action.color} border`}
                    onClick={() => handleQuickActionClick(action)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/50 transition-all duration-300 hover:bg-white/70">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{action.title}</h3>
                      <p className="text-xs opacity-80 mt-1">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t bg-gray-50/50 rounded-lg">
          <p className="text-gray-600 text-sm">
            © 2024 Maison Collet - Système de Contrôle Qualité Microbiologique
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Développé pour optimiser les processus d'analyse microbiologique
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
