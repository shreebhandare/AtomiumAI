// ───────────────────────── MOLECULE-BASED REACTION ENGINE ─────────────────────────
// Orchestrates the new architecture end to end:
//
//   Canvas -> Molecules -> Reaction Lookup -> Products -> Equation -> Animation
//
// This module performs exactly the flow described by the refactor spec:
//   1. Read molecules currently on the canvas (via identifyMolecules)
//   2. Validate: is there a known reaction for exactly this set of molecules?
//   3. Reaction found?
//        YES -> return the resolved entry + the product formulas (from the
//               REACTIONS database — never synthesized from atoms)
//        NO  -> leave the canvas untouched, report "no valid reaction found"
//
// It never touches individual atoms except to hand them off to identifyMolecules,
// and it never builds a product formula itself — products always come from
// resolveMoleculeReaction()/expandProducts().
import { identifyMolecules } from "./moleculeGraph";
import { resolveMoleculeReaction, expandProducts, findPossibleReactions } from "./moleculeReactionResolver";

export const REACTION_ENGINE_STATUS = {
  NO_MOLECULES: "no-molecules", // fewer than 2 complete molecules on the canvas
  NO_REACTION: "no-reaction",   // 2+ molecules present, but no matching REACTIONS entry
  REACTION: "reaction",         // a match was found
};

/**
 * Runs the molecule-based reaction engine against the current canvas state.
 *
 * @param {Array} atoms - every atom currently on the canvas
 * @param {Array} bonds - every bond currently on the canvas
 * @returns {{
 *   status: string,
 *   molecules?: Array,
 *   entry?: object,
 *   reactantFormulas?: string[],
 *   productFormulas?: string[],
 *   message?: string,
 * }}
 */
export function runReactionEngine(atoms, bonds) {
  // 1. Read Molecules
  const molecules = identifyMolecules(atoms, bonds);

  // If nothing on the canvas has actually bonded into a molecule yet (every
  // "molecule" is really just a single loose atom), this isn't a
  // molecule-based reaction attempt at all — it's still the atom-assembly
  // sandbox building its first compound. Defer to that legacy flow instead.
  const hasFormedMolecule = molecules.some((m) => m.atomIds.length > 1);
  if (!hasFormedMolecule) {
    return { status: REACTION_ENGINE_STATUS.NO_MOLECULES, molecules };
  }

  // 2. Validate Reaction — compare the complete set of molecule formulas
  // against the REACTIONS database (order never matters). A single formed
  // molecule is a valid reactant set too (e.g. decomposition: CaCO3 alone).
  const reactantFormulas = molecules.map((m) => m.formula);
  const entry = resolveMoleculeReaction(reactantFormulas);

  // 3. Reaction Found?
  if (!entry) {
    return {
      status: REACTION_ENGINE_STATUS.NO_REACTION,
      molecules,
      reactantFormulas,
      message: "No valid reaction found",
    };
  }

  // 4. Generate Products — always read from the matched entry, never built by
  // combining reactant atoms.
  const productFormulas = expandProducts(entry);

  return {
    status: REACTION_ENGINE_STATUS.REACTION,
    molecules,
    entry,
    reactantFormulas,
    productFormulas,
  };
}

/**
 * Hint-list variant used by the Inspector's "Available Reactions" panel: what
 * reactions COULD fire given everything currently on the canvas (a superset
 * match, not an exact one), so a person can see what's reachable without
 * having to have exactly the right molecules and nothing else present.
 */
export function getAvailableReactions(atoms, bonds) {
  const molecules = identifyMolecules(atoms, bonds);
  if (molecules.length === 0) return [];
  return findPossibleReactions(molecules.map((m) => m.formula));
}
