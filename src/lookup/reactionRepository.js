import { supabase } from "../supabase";

/**
 * Fetches all enabled reaction records from Supabase.
 * Contains no chemistry logic or adapters.
 *
 * @returns {Promise<Array>} - Raw database rows
 */
export async function getEnabledReactionsFromDB() {
  const { data, error } = await supabase
    .from('chemical_reactions')
    .select('*')
    .eq('enabled', true);
    
  if (error) {
    throw error;
  }
  return data || [];
}

/**
 * Fetches the latest version index of the reactions database.
 *
 * @returns {Promise<number|null>} - Database version identifier
 */
export async function getDatabaseVersionFromDB() {
  const { data, error } = await supabase
    .from('reaction_database_version')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ? data.version : null;
}
