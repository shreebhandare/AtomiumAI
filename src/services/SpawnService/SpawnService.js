import { getElement } from "../../data/elements";
import { migrateMolecule } from "../../utils/migration";

// Dynamic import map for molecule JSON files
const MOLECULE_REGISTRY = {
  water:   () => import("../../data/molecules/water.json"),
  methane: () => import("../../data/molecules/methane.json"),
  benzene: () => import("../../data/molecules/benzene.json"),
  ethanol: () => import("../../data/molecules/ethanol.json"),
};

/**
 * Load a molecule definition by its ID.
 * Falls back to null if no molecule with that ID exists.
 * @param {string} moleculeId
 * @returns {Promise<object|null>}
 */
export async function loadMolecule(moleculeId) {
  const id = moleculeId?.toLowerCase().trim();
  const loader = MOLECULE_REGISTRY[id];
  if (!loader) return null;
  try {
    const raw = await loader();
    const data = raw.default ?? raw;
    return migrateMolecule(data);
  } catch (err) {
    console.error(`SpawnService: failed to load molecule "${moleculeId}":`, err);
    return null;
  }
}

/**
 * Returns the list of all registered molecule IDs.
 * @returns {string[]}
 */
export function listMoleculeIds() {
  return Object.keys(MOLECULE_REGISTRY);
}

/**
 * Find a safe (non-overlapping) canvas position for a new molecule.
 * Searches in an expanding spiral around the canvas center.
 * @param {object[]} existingAtoms   — array of { x, y } objects
 * @param {number}   safeRadius      — minimum clear-zone radius around each existing atom (px)
 * @returns {{ x: number, y: number }}
 */
export function findSafePosition(existingAtoms, safeRadius = 120) {
  if (existingAtoms.length === 0) {
    return { x: 0, y: 0 };
  }

  // Spiral search outward from origin
  const STEP = safeRadius * 0.8;
  const MAX_TRIES = 60;

  for (let i = 1; i <= MAX_TRIES; i++) {
    const angle = i * 2.399963; // golden angle increment (radians)
    const r = STEP * Math.sqrt(i);
    const candidate = { x: r * Math.cos(angle), y: r * Math.sin(angle) };

    const isClear = existingAtoms.every(
      (a) => Math.hypot(a.x - candidate.x, a.y - candidate.y) > safeRadius
    );

    if (isClear) return candidate;
  }

  // Fallback: place far to the right
  const maxX = Math.max(...existingAtoms.map((a) => a.x));
  return { x: maxX + safeRadius * 2, y: 0 };
}

/**
 * Build the atoms and bonds arrays for a given molecule, offset to a target position.
 * Assigns new sequential IDs starting from idCounterRef.current.
 * @param {object}   molecule     — versioned molecule spec from JSON
 * @param {{ x, y }} center       — where to place the molecule center
 * @param {object}   idCounterRef — React ref to the canvas id counter
 * @returns {{ atoms: object[], bonds: object[] }}
 */
export function buildMoleculeAtomsBonds(molecule, center, idCounterRef) {
  if (!molecule?.atoms) return { atoms: [], bonds: [] };

  const spawnGroupId = `spawn-${Date.now()}`;
  const spawnGroupFormula = molecule.id;
  const spawnGroupSize = molecule.atoms.length;

  // Map old atom index → new atom id
  const indexToId = new Map();

  const atoms = molecule.atoms.map((atomDef, idx) => {
    const id = idCounterRef.current++;
    indexToId.set(idx + 1, id); // JSON uses 1-based atom indices
    const el = getElement(atomDef.sym);
    return {
      id,
      sym: atomDef.sym,
      x: (atomDef.x || 0) + center.x,
      y: (atomDef.y || 0) + center.y,
      vx: 0,
      vy: 0,
      shellAngle: idx,
      shells: el?.shells || [1],
      instability: 1,
      vibPhase: idx,
      spawnGroupId,
      spawnGroupFormula,
      spawnGroupSize,
    };
  });

  // Calculate centroids for relative offsets
  const cx0 = atoms.reduce((s, a) => s + a.x, 0) / atoms.length;
  const cy0 = atoms.reduce((s, a) => s + a.y, 0) / atoms.length;
  atoms.forEach((a) => {
    a.spawnRelativePos = { x: a.x - cx0, y: a.y - cy0 };
  });

  const bonds = (molecule.bonds || []).map((bondDef) => {
    const atomAId = indexToId.get(bondDef.a);
    const atomBId = indexToId.get(bondDef.b);
    if (atomAId === undefined || atomBId === undefined) return null;

    const atomA = atoms.find(a => a.id === atomAId);
    const atomB = atoms.find(a => a.id === atomBId);
    const elA = atomA ? getElement(atomA.sym) : null;
    const elB = atomB ? getElement(atomB.sym) : null;

    return {
      id: `${atomAId}-${atomBId}`,
      a: atomAId,
      b: atomBId,
      order: bondDef.order || 1,
      type: bondDef.type || 'covalent',
      enA: elA?.en ?? 1.0,
      enB: elB?.en ?? 1.0,
    };
  }).filter(Boolean);

  return { atoms, bonds };
}
