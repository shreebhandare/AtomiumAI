import { canonicalizeFormulaString } from "../formulaParser";

/**
 * Translates a database row record into the runtime reaction object expected by registerReaction.
 * Contains no API, SQL, or database-specific logic.
 *
 * @param {object} row - Raw DB row
 * @returns {object} - Mapped reaction object
 */
export function transformDbRowToReaction(row) {
  const canonicalReactants = Array.isArray(row.reactants)
    ? row.reactants.map(r => canonicalizeFormulaString(r))
    : [];

  const canonicalProducts = Array.isArray(row.products)
    ? row.products.map(p => ({
        formula: canonicalizeFormulaString(p.formula),
        coefficient: p.coefficient
      }))
    : [];

  return {
    id: row.id,
    reactionCode: row.reaction_code,
    name: row.name,
    type: row.type,
    reactants: canonicalReactants,
    products: canonicalProducts,
    fact: row.fact || "No explanation provided.",
    deltaH: row.delta_h != null ? Number(row.delta_h) : undefined,
    minTempK: row.min_temp_k != null ? Number(row.min_temp_k) : undefined,
    minPressureAtm: row.min_pressure_atm != null ? Number(row.min_pressure_atm) : undefined,
    metadata: row.metadata || null
  };
}
