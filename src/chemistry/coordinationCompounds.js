// Coordination-compound detection and radial layout (metal centre + ligand shells
// + counter-ion rings) for PubChem entries whose bond graph centers on a metal atom.

export const COORDINATION_METALS = new Set([
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd',
  'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu',
  'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
  'Al', 'Ga', 'In', 'Tl', 'Sn', 'Pb', 'Bi',
  'Ac', 'Th', 'U',
]);

/**
 * Analyses a PubChem entry's bond graph.
 * Returns null if not a coordination compound, otherwise:
 *   { metalIdx, ligandIndices, counterIonGroups, complexIndices }
 */
export function detectCoordinationCompound(entry) {
  const { reactants, bonds } = entry;

  // Find the metal with the highest bond count
  let metalIdx = -1, maxDeg = 0;
  reactants.forEach((sym, i) => {
    if (!COORDINATION_METALS.has(sym)) return;
    const deg = bonds.filter(b => b.from === i || b.to === i).length;
    if (deg > maxDeg) { maxDeg = deg; metalIdx = i; }
  });
  if (metalIdx === -1 || maxDeg < 2) return null;

  // BFS from metal to find the whole connected component
  const complexSet = new Set([metalIdx]);
  const queue = [metalIdx];
  while (queue.length) {
    const cur = queue.shift();
    for (const b of bonds) {
      const nbr = b.from === cur ? b.to : b.to === cur ? b.from : -1;
      if (nbr !== -1 && !complexSet.has(nbr)) { complexSet.add(nbr); queue.push(nbr); }
    }
  }

  // Atoms not in the complex are counter-ions — group them by their own connected components
  const ciVisited = new Set();
  const counterIonGroups = [];
  for (let i = 0; i < reactants.length; i++) {
    if (complexSet.has(i) || ciVisited.has(i)) continue;
    const grp = [];
    const q = [i];
    while (q.length) {
      const n = q.shift();
      if (ciVisited.has(n)) continue;
      ciVisited.add(n); grp.push(n);
      for (const b of bonds) {
        const nbr = b.from === n ? b.to : b.to === n ? b.from : -1;
        if (nbr !== -1 && !ciVisited.has(nbr)) q.push(nbr);
      }
    }
    counterIonGroups.push(grp);
  }

  const ligandIndices = bonds
    .filter(b => b.from === metalIdx || b.to === metalIdx)
    .map(b => b.from === metalIdx ? b.to : b.from);

  return { metalIdx, ligandIndices, counterIonGroups, complexIndices: [...complexSet] };
}

/**
 * Builds a coordination-aware layout:
 *  - metal at centroid
 *  - ligand atoms in a circle
 *  - their sub-trees radially extended outward (DFS, angle-spread to avoid crossings)
 *  - counter-ion groups in an outer ring
 *
 * Returns an array of {x,y} indexed by atom index in entry.reactants.
 */
export function buildCoordinationLayout(entry, coordInfo, centroid) {
  const { metalIdx, ligandIndices, counterIonGroups } = coordInfo;
  const n = entry.reactants.length;
  const positions = new Array(n).fill(null);

  const LIGAND_RADIUS = 110; // px: metal → first-shell ligand atom
  const BRANCH_STEP = 80;  // px: step for each subsequent shell
  const CI_RADIUS = 230; // px: counter-ion ring radius

  // 1. Metal at centroid
  positions[metalIdx] = { x: centroid.x, y: centroid.y };

  // 2. First-shell ligand atoms fanned evenly around the metal
  const cn = ligandIndices.length;
  ligandIndices.forEach((ligIdx, i) => {
    const angle = (i / cn) * 2 * Math.PI - Math.PI / 2;
    positions[ligIdx] = {
      x: centroid.x + LIGAND_RADIUS * Math.cos(angle),
      y: centroid.y + LIGAND_RADIUS * Math.sin(angle),
    };
  });

  // 3. DFS outward for each ligand's sub-tree
  const placed = new Set([metalIdx, ...ligandIndices]);

  const placeSubtree = (fromIdx, parentIdx) => {
    // Children = neighbours of fromIdx that are not yet placed
    const children = entry.bonds
      .filter(b => (b.from === fromIdx || b.to === fromIdx))
      .map(b => b.from === fromIdx ? b.to : b.from)
      .filter(idx => !placed.has(idx));

    if (!children.length) return;

    const baseAngle = Math.atan2(
      positions[fromIdx].y - centroid.y,
      positions[fromIdx].x - centroid.x
    );

    // Spread children symmetrically around the outward direction
    const spread = Math.min(Math.PI * 0.7, (Math.PI / 3) * children.length);
    children.forEach((childIdx, ci) => {
      const offset = children.length === 1
        ? 0
        : ((ci / (children.length - 1)) - 0.5) * spread;
      const angle = baseAngle + offset;
      positions[childIdx] = {
        x: positions[fromIdx].x + BRANCH_STEP * Math.cos(angle),
        y: positions[fromIdx].y + BRANCH_STEP * Math.sin(angle),
      };
      placed.add(childIdx);
    });

    // Recurse
    for (const childIdx of children) placeSubtree(childIdx, fromIdx);
  };

  for (const ligIdx of ligandIndices) placeSubtree(ligIdx, metalIdx);

  // 4. Counter-ion groups placed in an outer ring, one group per slot
  const ng = counterIonGroups.length;
  counterIonGroups.forEach((grp, gi) => {
    const angle = (gi / Math.max(ng, 1)) * 2 * Math.PI + Math.PI / 4;
    const gx = centroid.x + CI_RADIUS * Math.cos(angle);
    const gy = centroid.y + CI_RADIUS * Math.sin(angle);
    const subR = grp.length > 1 ? 28 : 0;
    grp.forEach((atomIdx, ai) => {
      const subAngle = grp.length > 1 ? (ai / grp.length) * 2 * Math.PI : 0;
      positions[atomIdx] = {
        x: gx + subR * Math.cos(subAngle),
        y: gy + subR * Math.sin(subAngle),
      };
    });
  });

  // Fallback: any atom still null gets a fallback position
  for (let i = 0; i < n; i++) {
    if (!positions[i]) {
      positions[i] = { x: centroid.x + (Math.random() - 0.5) * 60, y: centroid.y + (Math.random() - 0.5) * 60 };
    }
  }

  return positions;
}
