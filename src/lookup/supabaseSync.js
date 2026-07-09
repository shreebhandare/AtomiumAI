// Persists a newly resolved reaction entry to Supabase (best-effort cache write).
import { supabase } from "../supabase";

export async function saveReactionToSupabase(fp, entry) {
  try {
    const { data } = await supabase.from('reactions').select('fingerprint').eq('fingerprint', fp).single();
    if (data) return;

    // Try inserting with coords + cid
    const { error } = await supabase.from('reactions').insert([{
      fingerprint: fp,
      formula: entry.formula,
      name: entry.name,
      reactants: entry.reactants,
      bonds: entry.bonds,
      coords: entry.coords || null,
      cid: entry.cid || null,
      minTempK: entry.minTempK,
      minPressureAtm: entry.minPressureAtm,
      deltaH: entry.deltaH,
      fact: entry.fact,
    }]);

    if (error && error.message.includes('column "coords" does not exist')) {
      console.log("[Supabase] 'coords' column missing. Falling back to insert without coords.");
      await supabase.from('reactions').insert([{
        fingerprint: fp,
        formula: entry.formula,
        name: entry.name,
        reactants: entry.reactants,
        bonds: entry.bonds,
        cid: entry.cid || null,
        minTempK: entry.minTempK,
        minPressureAtm: entry.minPressureAtm,
        deltaH: entry.deltaH,
        fact: entry.fact,
      }]);
    }
  } catch (err) {
    console.error("Failed to save to Supabase:", err.message);
  }
}
