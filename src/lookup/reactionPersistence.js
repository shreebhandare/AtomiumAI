// Persists an AI-predicted molecule-to-molecule reaction to the Supabase
// `chemical_reactions` table so it's available on future startups.
import { supabase } from "../supabase";

/**
 * Saves a validated reaction entry to the chemical_reactions table.
 * Best-effort — failures are logged but do not block execution.
 *
 * @param {object} entry - A runtime reaction object (same schema as registerReaction expects)
 */
export async function persistReactionToSupabase(entry) {
  try {
    const { error } = await supabase.from('chemical_reactions').insert([{
      reaction_code: entry.reactionCode || `RXN_AI_${Date.now()}`,
      name: entry.name,
      type: entry.type || "unknown",
      reactants: entry.reactants,
      products: entry.products,
      fact: entry.fact || null,
      delta_h: entry.deltaH != null ? entry.deltaH : null,
      min_temp_k: entry.minTempK != null ? entry.minTempK : null,
      min_pressure_atm: entry.minPressureAtm != null ? entry.minPressureAtm : null,
      enabled: true,
      metadata: { source: "ai_prediction" },
    }]);

    if (error) {
      // Duplicate reaction_code is fine — just means it was already persisted
      if (error.code === '23505') {
        console.log(`[Persist] Reaction already exists: ${entry.reactionCode}`);
        return;
      }
      console.warn(`[Persist] Failed to save reaction to Supabase:`, error.message);
    } else {
      console.log(`[Persist] Saved AI-predicted reaction to Supabase: ${entry.name} (${entry.reactionCode})`);
    }
  } catch (err) {
    console.warn(`[Persist] Error persisting reaction:`, err.message);
  }
}
