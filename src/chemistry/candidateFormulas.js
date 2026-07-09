// Generates candidate molecular formulas from an atom inventory, largest-first,
// using a pruned DFS rather than enumerating every subset.
import { fingerprint } from "./fingerprint";

// ───────────────────────── INVENTORY SEARCH ─────────────────────────
// Generates candidate formulas from the current atom inventory using a
// pruned search strategy — reduces element counts one-at-a-time from the
// full set rather than enumerating every subset (which is exponential).
export function* generateCandidateFormulas(symCounts) {
  const elements = Object.keys(symCounts);

  // Build all possible count combinations (e.g. H:0..2, S:0..1, O:0..4)
  // but produce them in largest-total-atoms-first order.
  // For each element, produce count from its max down to 0.
  // Yield in order of total atoms (descending), minimum 2 atoms.
  const maxTotal = elements.reduce((s, e) => s + symCounts[e], 0);

  // Iteratively reduce total atom count
  for (let total = maxTotal; total >= 2; total--) {
    // Use DFS to enumerate all combinations that hit this total
    function* enumerate(idx, remaining, current) {
      if (idx === elements.length) {
        if (remaining === 0) yield { ...current };
        return;
      }
      const el = elements[idx];
      const max = Math.min(symCounts[el], remaining);
      for (let cnt = max; cnt >= 0; cnt--) {
        current[el] = cnt;
        yield* enumerate(idx + 1, remaining - cnt, current);
      }
    }
    yield* enumerate(0, total, {});
  }
}

export function formulaFromCounts(counts) {
  // Standard Hill order: C first, H second, then alphabetical
  const keys = Object.keys(counts).filter(k => counts[k] > 0).sort((a, b) => {
    if (a === 'C') return -1; if (b === 'C') return 1;
    if (a === 'H') return -1; if (b === 'H') return 1;
    return a.localeCompare(b);
  });
  return keys.map(k => `${k}${counts[k] > 1 ? counts[k] : ''}`).join('');
}

export function fingerprintFromCounts(counts) {
  const syms = [];
  for (const [sym, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) syms.push(sym);
  }
  return fingerprint(syms);
}

