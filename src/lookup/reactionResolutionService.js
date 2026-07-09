// Orchestrates reaction resolution: for an unknown fingerprint, tries the in-memory
// cache, then Supabase, then PubChem, then Gemini (in that order), caching whichever
// source succeeds. This is the single entry point the component calls.
import { supabase } from "../supabase";
import { COMPOUND_BLUEPRINTS, pendingLookups, FIREWORKS_API_KEY, FIREWORKS_MODEL, SEARCH_ONLINE_ENABLED, getInventorySearchGeneration } from "../chemistry/reactionStore";
import { fingerprint } from "../chemistry/fingerprint";
import { tryPubChem } from "./pubchemClient";
import { generateReactionWithFireworks } from "./fireworksClient";
import { saveReactionToSupabase } from "./supabaseSync";
import { generateCandidateFormulas, formulaFromCounts, fingerprintFromCounts } from "../chemistry/candidateFormulas";

export async function resolveUnknownReaction(fp, syms, onStatus) {
  if (pendingLookups.has(fp)) return;
  pendingLookups.add(fp);
  onStatus?.("searching");
  try {
    if (SEARCH_ONLINE_ENABLED) {
      try {
        const entry = await tryPubChem(fp, syms);
        COMPOUND_BLUEPRINTS[fp] = entry;
        saveReactionToSupabase(fp, entry);
        onStatus?.(`found:${entry.name}`);
        console.log(`[PubChem] Cached reaction for ${fp}:`, entry.name);
        return;
      } catch (err) {
        console.warn(`[PubChem] Lookup failed for ${fp}:`, err.message);
      }
    }

    if (FIREWORKS_API_KEY) {
      try {
        onStatus?.("ai-generating");
        const entry = await generateReactionWithFireworks(fp, syms, FIREWORKS_API_KEY, FIREWORKS_MODEL);
        if (entry) {
          COMPOUND_BLUEPRINTS[fp] = entry;
          saveReactionToSupabase(fp, entry);
          onStatus?.(`found:${entry.name} (AI)`);
          console.log(`[Fireworks] Cached reaction for ${fp}:`, entry.name);
          return;
        }
      } catch (err) {
        console.warn(`[Fireworks] Generation failed for ${fp}:`, err.message);
      }
    }
    onStatus?.("not-found");
  } finally {
    pendingLookups.delete(fp);
  }
}

export async function findCompoundEntry(fp, syms) {
  // 1. In-memory
  if (COMPOUND_BLUEPRINTS[fp]) return COMPOUND_BLUEPRINTS[fp];

  // 2. Supabase
  try {
    const { data } = await supabase.from('reactions').select('*').eq('fingerprint', fp).single();
    if (data) {
      const entry = {
        name: data.name, formula: data.formula,
        reactants: data.reactants, bonds: data.bonds,
        coords: data.coords || null, cid: data.cid || null,
        minTempK: data.minTempK, minPressureAtm: data.minPressureAtm,
        deltaH: data.deltaH, fact: data.fact, fromPubChem: true,
      };
      COMPOUND_BLUEPRINTS[fp] = entry;
      return entry;
    }
  } catch (err) {
    console.warn(`[findCompoundEntry] Supabase lookup failed:`, err.message);
  }

  // 3. PubChem
  if (SEARCH_ONLINE_ENABLED) {
    try {
      const entry = await tryPubChem(fp, syms);
      COMPOUND_BLUEPRINTS[fp] = entry;
      saveReactionToSupabase(fp, entry);
      return entry;
    } catch (err) {
      console.warn(`[findCompoundEntry] PubChem lookup failed:`, err.message);
    }
  }

  // 4. Fireworks AI
  if (FIREWORKS_API_KEY) {
    try {
      const entry = await generateReactionWithFireworks(fp, syms, FIREWORKS_API_KEY, FIREWORKS_MODEL);
      if (entry) {
        COMPOUND_BLUEPRINTS[fp] = entry;
        saveReactionToSupabase(fp, entry);
        return entry;
      }
    } catch (err) {
      console.warn(`[findCompoundEntry] Fireworks generation failed:`, err.message);
    }
  }

  return null;
}


export async function runInventorySearch(atoms, generation, onCommit, onStatus) {
  const symCounts = {};
  for (const a of atoms) symCounts[a.sym] = (symCounts[a.sym] || 0) + 1;

  if (Object.keys(symCounts).length === 0) return;

  onStatus?.('searching');

  for (const counts of generateCandidateFormulas(symCounts)) {
    // Abort if a newer search has started
    if (getInventorySearchGeneration() !== generation) return;

    const fp = fingerprintFromCounts(counts);
    const syms = Object.entries(counts).flatMap(([sym, n]) => Array(n).fill(sym));
    if (syms.length < 2) continue;
    const formula = formulaFromCounts(counts);

    // ── Resolution order: in-memory → Supabase → PubChem → Gemini ──

    // 1. In-memory cache
    if (COMPOUND_BLUEPRINTS[fp]) {
      if (getInventorySearchGeneration() !== generation) return;
      console.log(`[Inventory] Cache hit: ${formula} (${fp})`);
      await onCommit(fp, COMPOUND_BLUEPRINTS[fp], syms);
      return;
    }

    // 2. Supabase
    try {
      const { data } = await supabase.from('reactions').select('*').eq('fingerprint', fp).single();
      if (getInventorySearchGeneration() !== generation) return;
      if (data) {
        const entry = {
          name: data.name, formula: data.formula,
          reactants: data.reactants, bonds: data.bonds,
          coords: data.coords || null, cid: data.cid || null,
          minTempK: data.minTempK, minPressureAtm: data.minPressureAtm,
          deltaH: data.deltaH, fact: data.fact, fromPubChem: true,
        };
        COMPOUND_BLUEPRINTS[fp] = entry;
        console.log(`[Inventory] Supabase hit: ${formula}`);

        // If CID is missing but we have a name, enrich asynchronously from PubChem
        // so 3D viewer and future lookups benefit from the canonical CID.
        // Skipped when Search Online is off — this is a live PubChem request.
        if (SEARCH_ONLINE_ENABLED && !entry.cid && entry.name) {
          fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(entry.name)}/property/MolecularFormula,IUPACName/JSON`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              const props = d?.PropertyTable?.Properties?.[0];
              if (props?.CID) {
                entry.cid = props.CID;
                // Prefer PubChem canonical formula over whatever was stored
                if (props.MolecularFormula) entry.formula = props.MolecularFormula;
                COMPOUND_BLUEPRINTS[fp] = entry;
                // Patch Supabase row with the enriched CID + formula
                supabase.from('reactions')
                  .update({ cid: props.CID, formula: entry.formula })
                  .eq('fingerprint', fp)
                  .then(() => console.log(`[Supabase] Enriched CID for ${entry.name}: ${props.CID}`));
              }
            })
            .catch(() => { /* non-critical */ });
        }

        await onCommit(fp, entry, syms);
        return;
      }
    } catch (_) { /* not in Supabase, continue */ }

    if (getInventorySearchGeneration() !== generation) return;

    // 3. PubChem (skipped entirely when Search Online is off — falls straight
    // through to the Gemini fallback below, if configured)
    if (SEARCH_ONLINE_ENABLED && !pendingLookups.has(fp)) {
      try {
        const entry = await tryPubChem(fp, syms);
        if (getInventorySearchGeneration() !== generation) return;
        COMPOUND_BLUEPRINTS[fp] = entry;
        saveReactionToSupabase(fp, entry);
        onStatus?.(`found:${entry.name}`);
        console.log(`[Inventory] PubChem hit: ${formula}`);
        await onCommit(fp, entry, syms);
        return;
      } catch (err) {
        if (getInventorySearchGeneration() !== generation) return;
        console.warn(`[Inventory] PubChem miss: ${formula}`, err.message);
      }
    }

    // 4. Fireworks AI fallback (only for full inventory, not sub-sets)
    const isFullInventory = syms.length === atoms.length;
    if (isFullInventory && FIREWORKS_API_KEY && !pendingLookups.has(fp)) {
      try {
        const entry = await generateReactionWithFireworks(fp, syms, FIREWORKS_API_KEY, FIREWORKS_MODEL);
        if (getInventorySearchGeneration() !== generation) return;
        if (entry) {
          COMPOUND_BLUEPRINTS[fp] = entry;
          saveReactionToSupabase(fp, entry);
          onStatus?.(`found:${entry.name} (AI)`);
          await onCommit(fp, entry, syms);
          return;
        }
      } catch (err) {
        if (getInventorySearchGeneration() !== generation) return;
        console.warn(`[Inventory] Fireworks miss: ${formula}`, err.message);
      }
    }
  }

  if (getInventorySearchGeneration() !== generation) return;
  onStatus?.('not-found');
  console.log(`[Inventory] No compound found for current inventory.`);
}

