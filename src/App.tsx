import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import SampleEntryPage from './pages/SampleEntryPage';
import QualityControlPage from './pages/QualityControlPage';

import AnalysisInProgressPage from './pages/AnalysisInProgressPage';
import SampleManagementPage from './pages/SampleManagementPage';
import ReadingResultsPage from './pages/ReadingResultsPage';
import SupabaseTestPage from './pages/SupabaseTestPage';
import NotFound from './pages/NotFound';
import PendingReadingsPage from "./pages/PendingReadingsPage";
import LecturesEnAttentePage from "./pages/LecturesEnAttentePage";
import AdminPage from "./pages/AdminPage";
import BacteriaSettingsPage from "./pages/BacteriaSettingsPage";
import BacteriaExamplePage from "./pages/BacteriaExamplePage";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import QualityControlDashboardPage from "./pages/QualityControlDashboardPage";
import TechnicalInfoPage from "./pages/TechnicalInfoPage";
import FormsHistoryPage from "./pages/FormsHistoryPage";
import DbDiagnosticPage from "./pages/DbDiagnosticPage";
import TestRedirectionPage from "./pages/TestRedirectionPage";
import HistoryPage from "./pages/HistoryPage";
import { ProductCreationPageNew } from "./pages/ProductCreationPageNew";
import { ProductsManagementPageNew } from "./pages/ProductsManagementPageNew";
import NonConformitesPage from "./pages/NonConformitesPage";

const queryClient = new QueryClient();

// Composant pour gérer le rafraîchissement automatique à 14h
const AutoRefreshController = () => {
  useEffect(() => {
    const checkTimeAndRefresh = () => {
      const now = new Date();
      // Si on est à 14h pile (entre 14:00 et 14:01)
      if (now.getHours() === 14 && now.getMinutes() === 0) {
        // Vérifier si on a déjà rafraîchi aujourd'hui pour éviter une boucle infinie
        const lastAutoRefresh = localStorage.getItem('lastAutoRefreshDate');
        const today = now.toDateString();

        if (lastAutoRefresh !== today) {
          console.log('🔄 Rafraîchissement automatique journalier (14h00)...');
          localStorage.setItem('lastAutoRefreshDate', today);
          window.location.reload();
        }
      }
    };

    // Vérifier chaque minute (60000ms)
    const intervalId = setInterval(checkTimeAndRefresh, 60000);
    
    // Vérifier immédiatement au montage aussi
    checkTimeAndRefresh();

    return () => clearInterval(intervalId);
  }, []);

  return null; // Ce composant ne rend rien visuellement
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AutoRefreshController />
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/sample-entry" element={<SampleEntryPage />} />
              <Route path="/quality-control" element={<QualityControlPage />} />
              <Route path="/quality-control-dashboard" element={<QualityControlDashboardPage />} />
              <Route path="/technical-info" element={<TechnicalInfoPage />} />
              <Route path="/forms-history" element={<FormsHistoryPage />} />

              <Route path="/analyses-en-cours" element={<AnalysisInProgressPage />} />
              <Route path="/gestion-echantillons" element={<SampleManagementPage />} />
              <Route path="/saisie-resultats" element={<ReadingResultsPage />} />
              <Route path="/bacteria-settings" element={<BacteriaSettingsPage />} />
              <Route path="/bacteria-demo" element={<BacteriaExamplePage />} />
              <Route path="/test-supabase" element={<SupabaseTestPage />} />
              <Route path="/db-diagnostic" element={<DbDiagnosticPage />} />
              <Route path="/test-redirection" element={<TestRedirectionPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/pending-readings" element={<PendingReadingsPage />} />
              <Route path="/lectures-en-attente" element={<LecturesEnAttentePage />} />
              <Route path="/non-conformites" element={<NonConformitesPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/products" element={<ProductsManagementPageNew />} />
              <Route path="/products/new" element={<ProductCreationPageNew />} />
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
