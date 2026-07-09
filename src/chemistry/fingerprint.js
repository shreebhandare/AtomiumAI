// Fingerprinting and combinatorics helpers used by the reaction resolver.

export const fingerprint = (syms) => [...syms].sort().join("-");

// Generator for mathematical combinations
export function getCombinations(arr, size) {
  const result = [];
  function recurse(start, combo) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      recurse(i + 1, combo);
      combo.pop();
    }
  }
  recurse(0, []);
  return result;
}
