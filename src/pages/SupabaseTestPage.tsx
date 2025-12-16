import React, { useState, useEffect } from 'react';
import { testSupabaseConnection, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw, Database, Key, Globe } from 'lucide-react';

interface ConnectionResult {
  success: boolean;
  error?: string;
  data?: any;
}

const SupabaseTestPage: React.FC = () => {
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [envVars, setEnvVars] = useState({
    url: '',
    key: '',
    hasUrl: false,
    hasKey: false
  });

  useEffect(() => {
    // Vérifier les variables d'environnement au chargement
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    setEnvVars({
      url: supabaseUrl || 'Non configurée',
      key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Non configurée',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });

    // Test automatique au chargement si les variables sont présentes
    if (supabaseUrl && supabaseKey) {
      handleTestConnection();
    }
  }, []);

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await testSupabaseConnection();
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAuth = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Session actuelle:', data);
      if (error) {
        console.error('Erreur auth:', error);
      }
    } catch (error) {
      console.error('Erreur test auth:', error);
    }
  };

  const testTables = async () => {
    try {
      // Test de différentes tables
      const tables = ['samples', 'analyses_planifiees', 'analyses_en_cours'];
      
      for (const table of tables) {
        console.log(`🔍 Test de la table: ${table}`);
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.error(`❌ Erreur table ${table}:`, error.message);
        } else {
          console.log(`✅ Table ${table} accessible:`, data);
        }
      }
    } catch (error) {
      console.error('Erreur test tables:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Test de Connexion Supabase</h1>
        <p className="text-muted-foreground">
          Diagnostique de la connexion à la base de données
        </p>
      </div>

      {/* Configuration des variables d'environnement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Variables d'Environnement
          </CardTitle>
          <CardDescription>
            Configuration des clés d'accès Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="font-medium">VITE_SUPABASE_URL</span>
                <Badge variant={envVars.hasUrl ? "success" : "destructive"}>
                  {envVars.hasUrl ? "Configurée" : "Manquante"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {envVars.url}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span className="font-medium">VITE_SUPABASE_ANON_KEY</span>
                <Badge variant={envVars.hasKey ? "success" : "destructive"}>
                  {envVars.hasKey ? "Configurée" : "Manquante"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {envVars.key}
              </p>
            </div>
          </div>

          {(!envVars.hasUrl || !envVars.hasKey) && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Variables d'environnement manquantes. Créez un fichier <code>.env.local</code> avec vos clés Supabase.
                Consultez le fichier <code>.env.example</code> pour un modèle.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test de connexion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Test de Connexion
          </CardTitle>
          <CardDescription>
            Vérification de la connectivité à Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleTestConnection} 
              disabled={isLoading || !envVars.hasUrl || !envVars.hasKey}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Tester la Connexion
            </Button>
            
            <Button 
              variant="outline" 
              onClick={testAuth}
              disabled={!envVars.hasUrl || !envVars.hasKey}
            >
              Test Auth
            </Button>
            
            <Button 
              variant="outline" 
              onClick={testTables}
              disabled={!envVars.hasUrl || !envVars.hasKey}
            >
              Test Tables
            </Button>
          </div>

          {connectionResult && (
            <Alert className={connectionResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {connectionResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={connectionResult.success ? "text-green-800" : "text-red-800"}>
                {connectionResult.success ? (
                  <>
                    <strong>✅ Connexion réussie!</strong><br />
                    La base de données Supabase est accessible.
                    {connectionResult.data && (
                      <div className="mt-2">
                        <details>
                          <summary className="cursor-pointer text-sm">Voir les détails</summary>
                          <pre className="mt-2 text-xs bg-white p-2 rounded border">
                            {JSON.stringify(connectionResult.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <strong>❌ Erreur de connexion:</strong><br />
                    {connectionResult.error}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions de Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <h4>1. Créer un fichier .env.local</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm">
{`# Configuration Supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`}
            </pre>
            
            <h4>2. Obtenir les clés Supabase</h4>
            <ol>
              <li>Aller sur <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a></li>
              <li>Ouvrir votre projet</li>
              <li>Aller dans Settings &gt; API</li>
              <li>Copier l'URL du projet et la clé anon/public</li>
            </ol>

            <h4>3. Redémarrer l'application</h4>
            <p>Après avoir configuré les variables d'environnement, redémarrez le serveur de développement :</p>
            <pre className="bg-gray-100 p-3 rounded text-sm">
npm run dev
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseTestPage; 