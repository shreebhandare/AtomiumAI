import { canonicalizeFormulaString } from "../formulaParser";

/**
 * Builds an order-independent signature for a list of reactant molecule
 * formulas, e.g. ["Na2SO4", "BaCl2"] and ["BaCl2", "Na2SO4"] both produce
 * "BaCl2|Na2SO4". Repeated formulas (a reaction that consumes 2 of the same
 * molecule, e.g. Zn + 2HCl) are preserved as repeats so the multiset — not
 * just the set — of reactants must match.
 *
 * @param {Array<string>} formulas - List of formulas
 * @returns {string} - Canonical signature
 */
export function canonicalReactantSignature(formulas) {
  return [...formulas]
    .map((f) => canonicalizeFormulaString(String(f).trim()))
    .sort()
    .join("|");
}
