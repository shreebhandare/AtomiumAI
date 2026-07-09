/**
 * Validates a mapped reaction object before registration.
 * Checks for:
 * - name: non-empty string
 * - type: non-empty string
 * - reactionCode: non-empty string
 * - reactants: non-empty array of valid formula strings
 * - products: non-empty array of {formula, coefficient} pairs with positive coefficients
 *
 * @param {object} reaction - Mapped reaction object to validate
 * @returns {boolean} - True if valid, false if invalid
 */
export function validateReaction(reaction) {
  if (!reaction) return false;
  
  if (!reaction.reactionCode || typeof reaction.reactionCode !== 'string' || !reaction.reactionCode.trim()) {
    console.error("[Validator] Invalid reaction: Missing reactionCode");
    return false;
  }
  
  if (!reaction.name || typeof reaction.name !== 'string' || !reaction.name.trim()) {
    console.error(`[Validator] Invalid reaction (${reaction.reactionCode}): Missing name`);
    return false;
  }
  
  if (!reaction.type || typeof reaction.type !== 'string' || !reaction.type.trim()) {
    console.error(`[Validator] Invalid reaction (${reaction.reactionCode}): Missing type`);
    return false;
  }
  
  if (!Array.isArray(reaction.reactants) || reaction.reactants.length === 0) {
    console.error(`[Validator] Invalid reaction (${reaction.reactionCode}): Reactants must be a non-empty array`);
    return false;
  }
  
  if (reaction.reactants.some(r => typeof r !== 'string' || !r.trim())) {
    console.error(`[Validator] Invalid reaction (${reaction.reactionCode}): Reactants contains invalid formula strings`);
    return false;
  }
  
  if (!Array.isArray(reaction.products) || reaction.products.length === 0) {
    console.error(`[Validator] Invalid reaction (${reaction.reactionCode}): Products must be a non-empty array`);
    return false;
  }
  
  for (const p of reaction.products) {
    if (!p || typeof p.formula !== 'string' || !p.formula.trim()) {
      console.error(`[Validator] Invalid reaction (${reaction.reactionCode}): Product formula missing or invalid`);
      return false;
    }
    if (typeof p.coefficient !== 'number' || p.coefficient <= 0 || isNaN(p.coefficient)) {
      console.error(`[Validator] Invalid reaction (${reaction.reactionCode}): Product coefficient must be a positive integer`);
      return false;
    }
  }
  
  return true;
}
