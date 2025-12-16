import { supabase } from '@/integrations/supabase/client';

/**
 * Exécute une migration SQL directement sur Supabase
 * 
 * @param sql Le code SQL à exécuter
 * @returns Résultat de l'exécution
 */
export const executeMigration = async (sql: string) => {
  try {
    // Exécution directe du SQL
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('Erreur lors de l\'exécution de la migration:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception lors de l\'exécution de la migration:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}; 