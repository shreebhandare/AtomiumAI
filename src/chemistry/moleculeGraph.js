// Molecule graph helpers: identify a bonded molecule from an atom, align a
// candidate atom set to a compound blueprint's declared reactant order, and
// (new) identify every complete molecule currently sitting on the canvas so
// the molecule-based reaction engine can work with formulas instead of atoms.
import { COMPOUND_BLUEPRINTS } from "./reactionStore";
import { fingerprint } from "./fingerprint";
import { canonicalFormulaFromSyms } from "../formulaParser";

// Authoritative formula string from a flat list of atom symbols.
// Returns a canonical ASCII formula string (e.g. "NaCl", "H2O").
export function formulaFromSyms(syms) {
  return canonicalFormulaFromSyms(syms);
}

export function getMoleculeForAtom(atomId, atoms, bonds) {
  const visited = new Set([atomId]);
  const queue = [atomId];
  while (queue.length) {
    const id = queue.pop();
    for (const b of bonds) {
      if (b.a === id && !visited.has(b.b)) { visited.add(b.b); queue.push(b.b); }
      if (b.b === id && !visited.has(b.a)) { visited.add(b.a); queue.push(b.a); }
    }
  }
  if (visited.size < 2) return null; // atom isn't bonded to anything yet
  const syms = [...visited].map((id) => atoms.find((a) => a.id === id)?.sym).filter(Boolean);
  const fp = fingerprint(syms);
  // Check exact match first
  if (COMPOUND_BLUEPRINTS[fp]) return COMPOUND_BLUEPRINTS[fp];
  // Build a fallback label from the atom symbols using Hill order so it
  // matches PubChem canonical format (e.g. HCl not ClH, NaOH not HNaO)
  const formula = formulaFromSyms(syms);
  return { name: formula, formula };
}

// Matches the resolver's chosen 3 or 2 unbonded atoms to the blueprint's
// `reactants` list, accounting for the fact that two H atoms are
// interchangeable but order otherwise matters for which symbol occupies
// which bond-map index. Returns the atoms array reordered to align with
// entry.reactants, or null if no valid assignment exists.
export function alignAtomsToReactants(atoms, entry) {
  const remaining = [...atoms];
  const aligned = [];
  for (const sym of entry.reactants) {
    const idx = remaining.findIndex((a) => a.sym === sym);
    if (idx === -1) return null;
    aligned.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return aligned;
}

// ───────────────────────── CANVAS MOLECULE IDENTIFICATION ─────────────────────────
// Groups the atoms currently on the canvas into their bonded connected
// components — each component IS a complete molecule (the physics/bonding
// engine only ever writes a full, authoritative bond graph for a component
// once it matches a known compound blueprint; see AtomiumCanvas's
// spawnAtomsFromFormula / startReaction). This is the single place the
// molecule-based reaction engine reads "what molecules are on the canvas
// right now" from — it never inspects individual atoms past this point.
//
// Returns: [{ formula, atomIds: [...], bondIds: [...] }, ...]
// A lone, unbonded atom is treated as its own single-atom "molecule" (e.g. a
// free Na atom sitting on the canvas by itself).
export function identifyMolecules(atoms, bonds) {
  const visited = new Set();
  const molecules = [];

  for (const atom of atoms) {
    if (visited.has(atom.id)) continue;

    const componentIds = [];
    const queue = [atom.id];
    const seen = new Set([atom.id]);
    while (queue.length) {
      const id = queue.pop();
      componentIds.push(id);
      for (const b of bonds) {
        if (b.a === id && !seen.has(b.b)) { seen.add(b.b); queue.push(b.b); }
        if (b.b === id && !seen.has(b.a)) { seen.add(b.a); queue.push(b.a); }
      }
    }
    componentIds.forEach((id) => visited.add(id));

    const componentAtoms = componentIds
      .map((id) => atoms.find((a) => a.id === id))
      .filter(Boolean);
    const syms = componentAtoms.map((a) => a.sym);
    const fp = fingerprint(syms);
    const blueprint = componentAtoms.length > 1 ? COMPOUND_BLUEPRINTS[fp] : null;
    const formula = blueprint?.formula || formulaFromSyms(syms);

    const bondIds = bonds
      .filter((b) => seen.has(b.a) && seen.has(b.b))
      .map((b) => b.id);

    molecules.push({
      formula,
      name: blueprint?.name || formula,
      atomIds: componentIds,
      bondIds,
      blueprint,
    });
  }

  return molecules;
}
