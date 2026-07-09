// Best-outcome resolver: given the atoms/bonds currently on the canvas, finds the
// highest-scoring known reaction that the on-screen atoms could satisfy.
import { COMPOUND_BLUEPRINTS } from "./reactionStore";
import { alignAtomsToReactants } from "./moleculeGraph";

// ───────────────────────── BEST OUTCOME RESOLVER ─────────────────────────
// Supports reactions of any size up to MAX_GROUP_SIZE atoms. Rather than generating
// every possible combination of on-screen atoms (which explodes combinatorially once
// group sizes go past ~4-5), this checks each KNOWN reaction against what's available:
// for each COMPOUND_BLUEPRINTS entry, see if unbonded atoms contain enough of each required
// element, and if so, pick the closest-together matching atoms. This scales to large
// molecules (e.g. a 6-atom methanol, or up to a 20-atom entry) with no extra cost.
export const MAX_GROUP_SIZE = 20;

// Picks the tightest-clustered set of unbonded atoms satisfying entry.reactants'
// element counts, or null if not enough matching atoms are available.
export function pickAtomsForEntry(unbonded, entry) {
  const required = {};
  for (const s of entry.reactants) required[s] = (required[s] || 0) + 1;

  const bySym = {};
  for (const a of unbonded) (bySym[a.sym] ||= []).push(a);

  for (const sym in required) {
    if (!bySym[sym] || bySym[sym].length < required[sym]) return null;
  }

  // Rough centroid across all candidate atoms of the required symbols, used to
  // prefer atoms that are already clustered together over ones scattered far apart.
  let cx = 0, cy = 0, n = 0;
  for (const sym in required) for (const a of bySym[sym]) { cx += a.x; cy += a.y; n++; }
  cx /= n; cy /= n;

  const group = [];
  for (const sym in required) {
    const closest = [...bySym[sym]]
      .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
      .slice(0, required[sym]);
    group.push(...closest);
  }
  return group;
}

export function isMoleculeFullyFormed(atomsGroup, canvasBonds, entry) {
  const aligned = alignAtomsToReactants(atomsGroup, entry);
  if (!aligned) return false;

  // Verify all bonds exist with correct orders
  for (const bd of entry.bonds) {
    const atomA = aligned[bd.from];
    const atomB = aligned[bd.to];
    const hasBond = canvasBonds.some(b =>
      ((b.a === atomA.id && b.b === atomB.id) || (b.a === atomB.id && b.b === atomA.id)) &&
      b.order === bd.order
    );
    if (!hasBond) return false;
  }

  // Verify no extra bonds exist between these atoms
  const ids = new Set(atomsGroup.map(a => a.id));
  const bondsCount = canvasBonds.filter(b => ids.has(b.a) && ids.has(b.b)).length;
  return bondsCount === entry.bonds.length;
}

export function resolveBestOutcome(atoms, bonds) {
  if (atoms.length < 2) return null;

  // 1. Group all atoms into their current bonded molecules (connected components)
  const moleculeSizes = {};
  const visited = new Set();

  for (const atom of atoms) {
    if (visited.has(atom.id)) continue;

    const component = [];
    const queue = [atom.id];
    const componentSet = new Set([atom.id]);

    while (queue.length) {
      const id = queue.pop();
      component.push(id);
      for (const b of bonds) {
        if (b.a === id && !componentSet.has(b.b)) { componentSet.add(b.b); queue.push(b.b); }
        if (b.b === id && !componentSet.has(b.a)) { componentSet.add(b.a); queue.push(b.a); }
      }
    }

    const size = component.length;
    for (const id of component) {
      moleculeSizes[id] = size;
      visited.add(id);
    }
  }

  // 2. Find all possible candidate reactions using ANY atoms on the canvas
  const candidates = [];
  for (const fp in COMPOUND_BLUEPRINTS) {
    const entry = COMPOUND_BLUEPRINTS[fp];
    if (entry.reactants.length > MAX_GROUP_SIZE) continue; // safety cap
    if (entry.reactants.length > atoms.length) continue;

    const group = pickAtomsForEntry(atoms, entry);
    if (group) {
      // 3. Check if the candidate is a valid bond reformation
      let maxDisruptedSize = 0;
      for (const a of group) {
        const size = moleculeSizes[a.id] || 1;
        if (size > maxDisruptedSize) {
          maxDisruptedSize = size;
        }
      }

      const newSize = group.length;
      if (newSize > maxDisruptedSize || (newSize === maxDisruptedSize && !isMoleculeFullyFormed(group, bonds, entry))) {
        candidates.push({ atoms: group, entry, fp, score: newSize });
      }
    }
  }

  if (candidates.length === 0) return null;

  // 4. Sort candidates by size (descending), then by spatial closeness (ascending)
  candidates.sort((c1, c2) => {
    if (c2.score !== c1.score) return c2.score - c1.score;
    const spread = (group) => {
      let total = 0, n = 0;
      for (let x = 0; x < group.length; x++) {
        for (let y = x + 1; y < group.length; y++) {
          total += Math.hypot(group[x].x - group[y].x, group[x].y - group[y].y);
          n++;
        }
      }
      return n ? total / n : 0;
    };
    return spread(c1.atoms) - spread(c2.atoms);
  });

  return candidates[0];
}
