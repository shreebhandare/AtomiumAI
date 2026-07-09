// ───────────────────────── MOLECULE-BASED REACTION RESOLVER ─────────────────────────
// Replaces the old atom-concatenation approach. This module NEVER looks at
// individual atoms — it only ever compares complete molecule FORMULAS against
// the REACTIONS database. Order never matters: "BaCl2 + Na2SO4" and
// "Na2SO4 + BaCl2" both resolve to the same entry.
import { REACTIONS } from "./reactionStore";
import { canonicalReactantSignature } from "./reactionUtils";

/**
 * Looks up the reaction whose reactant molecules exactly match (as a
 * multiset, order-independent) the given list of molecule formulas found on
 * the canvas. Returns the matching REACTIONS entry, or null if none of the
 * known reactions are satisfied by exactly this set of molecules.
 */
export function resolveMoleculeReaction(moleculeFormulas) {
  if (!Array.isArray(moleculeFormulas) || moleculeFormulas.length === 0) return null;
  const key = canonicalReactantSignature(moleculeFormulas);
  return REACTIONS[key] || null;
}

/**
 * Given the full set of molecule formulas currently on the canvas, finds
 * every known reaction whose reactant molecules are ALL present (a subset of
 * what's on the canvas) — used to power the "Available Reactions" hint list,
 * where extra unrelated molecules on the canvas shouldn't hide a reaction
 * that's otherwise ready to fire.
 */
export function findPossibleReactions(moleculeFormulas) {
  if (!Array.isArray(moleculeFormulas) || moleculeFormulas.length === 0) return [];

  const available = {};
  for (const f of moleculeFormulas) available[f] = (available[f] || 0) + 1;

  const results = [];
  for (const key in REACTIONS) {
    const entry = REACTIONS[key];
    const required = {};
    for (const f of entry.reactants) required[f] = (required[f] || 0) + 1;

    const satisfied = Object.entries(required).every(
      ([formula, count]) => (available[formula] || 0) >= count
    );
    if (satisfied) results.push(entry);
  }
  return results;
}

/**
 * Expands a reaction entry's `products` array (formula + coefficient pairs)
 * into a flat list of individual product molecule formulas, e.g.
 * [{formula:"NaCl", coefficient:2}] -> ["NaCl", "NaCl"]. This is the ONLY
 * place product molecules originate from — always the REACTIONS database,
 * never a recombination of reactant atoms.
 */
export function expandProducts(entry) {
  if (!entry || !Array.isArray(entry.products)) return [];
  const flat = [];
  for (const p of entry.products) {
    const n = Math.max(1, Math.round(p.coefficient || 1));
    for (let i = 0; i < n; i++) flat.push(p.formula);
  }
  return flat;
}
