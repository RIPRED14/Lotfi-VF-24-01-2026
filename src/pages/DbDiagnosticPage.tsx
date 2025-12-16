import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const DbDiagnosticPage = () => {
  const navigate = useNavigate();
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Obtenir un échantillon pour examiner sa structure
      const { data: sampleData, error: sampleError } = await supabase
        .from('samples')
        .select('*')
        .limit(10);

      if (sampleError) {
        setError(`Erreur lors de la récupération des échantillons: ${sampleError.message}`);
        return;
      }

      if (sampleData && sampleData.length > 0) {
        // Extraire les noms des colonnes et leurs types
        const sampleStructure = Object.keys(sampleData[0]).map(key => {
          return {
            column: key,
            type: typeof sampleData[0][key],
            value: JSON.stringify(sampleData[0][key])
          };
        });

        setTableInfo(sampleStructure);
        setSamples(sampleData);
      } else {
        setError("Aucun échantillon trouvé dans la base de données");
      }
    } catch (err) {
      setError(`Erreur inattendue: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ajouter un champ form_id à la table si nécessaire
  const addFormIdField = async () => {
    try {
      setLoading(true);
      // Vérifier si le champ form_id existe déjà dans la structure
      const hasFormId = tableInfo?.some(col => col.column === 'form_id');
      
      if (hasFormId) {
        alert("Le champ form_id existe déjà dans la table samples.");
        return;
      }
      
      // SQL pour ajouter la colonne form_id
      const { error } = await supabase.rpc(
        'execute_sql', 
        { sql_query: 'ALTER TABLE samples ADD COLUMN IF NOT EXISTS form_id TEXT DEFAULT NULL' }
      );
      
      if (error) {
        // Si la fonction RPC n'est pas disponible, essayer l'exécution SQL directe
        const { error: sqlError } = await supabase
          .from('samples')
          .select('*')
          .limit(0)
          .then(() => {
            // Si la sélection a fonctionné, tenter de faire un SQL brut
            return supabase.rpc('exec', { command: 'ALTER TABLE samples ADD COLUMN IF NOT EXISTS form_id TEXT DEFAULT NULL' });
          });
          
        if (sqlError) {
          setError(`Erreur lors de l'ajout du champ form_id: ${sqlError.message}`);
          alert("Impossible d'ajouter la colonne form_id. Veuillez contacter l'administrateur pour ajouter cette colonne manuellement.");
          return;
        }
      }
      
      alert("Champ form_id ajouté avec succès. Rechargement des données...");
      await checkDatabase();
    } catch (err) {
      setError(`Erreur inattendue: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour générer des form_id pour les échantillons existants
  const generateFormIds = async () => {
    try {
      setLoading(true);
      
      // Échantillons sans form_id
      const samplesWithoutFormId = samples.filter(sample => !sample.form_id);
      
      if (samplesWithoutFormId.length === 0) {
        alert("Tous les échantillons ont déjà un form_id.");
        return;
      }
      
      // Regrouper les échantillons par date de création (même jour)
      const samplesByDate = samplesWithoutFormId.reduce((groups, sample) => {
        const date = sample.created_at.split('T')[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(sample);
        return groups;
      }, {});
      
      // Pour chaque groupe, générer un form_id unique et l'assigner à tous les échantillons du groupe
      let updatedCount = 0;
      
      for (const [date, dateSamples] of Object.entries(samplesByDate)) {
        const formId = `form-${date}-${Math.random().toString(36).substring(2, 9)}`;
        
        for (const sample of dateSamples) {
          const { error } = await supabase
            .from('samples')
            .update({ form_id: formId })
            .eq('id', sample.id);
            
          if (!error) {
            updatedCount++;
          }
        }
      }
      
      alert(`${updatedCount} échantillons ont été mis à jour avec des form_id. Rechargement des données...`);
      await checkDatabase();
    } catch (err) {
      setError(`Erreur inattendue: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Diagnostic de Base de Données" />
      
      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Diagnostic de la Base de Données</CardTitle>
                <CardDescription>Vérification de la structure et des données</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={checkDatabase}
                  disabled={loading}
                >
                  Rafraîchir
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/forms-history')}
                >
                  Historique des formulaires
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="text-center p-6">Chargement des données...</div>
            ) : error ? (
              <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
                {error}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Structure de la table 'samples'</h3>
                  {tableInfo && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="p-2 border">Colonne</th>
                            <th className="p-2 border">Type</th>
                            <th className="p-2 border">Exemple de valeur</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableInfo.map((col, idx) => (
                            <tr key={idx} className={col.column === 'form_id' ? 'bg-yellow-50' : ''}>
                              <td className="p-2 border">{col.column}</td>
                              <td className="p-2 border">{col.type}</td>
                              <td className="p-2 border font-mono text-xs max-w-md truncate">{col.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={addFormIdField}
                      disabled={loading || tableInfo?.some(col => col.column === 'form_id')}
                    >
                      Ajouter le champ form_id
                    </Button>
                    
                    <Button
                      variant="secondary"
                      onClick={generateFormIds}
                      disabled={loading || !tableInfo?.some(col => col.column === 'form_id')}
                    >
                      Générer des form_id
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Échantillons ({samples.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 border">ID</th>
                          <th className="p-2 border">Numéro</th>
                          <th className="p-2 border">Produit</th>
                          <th className="p-2 border">Date de création</th>
                          <th className="p-2 border">ID de formulaire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {samples.map((sample, idx) => (
                          <tr key={idx} className={!sample.form_id ? 'bg-red-50' : ''}>
                            <td className="p-2 border">{sample.id}</td>
                            <td className="p-2 border">{sample.number}</td>
                            <td className="p-2 border">{sample.product}</td>
                            <td className="p-2 border">{new Date(sample.created_at).toLocaleString()}</td>
                            <td className="p-2 border font-mono">{sample.form_id || '(non défini)'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DbDiagnosticPage; 