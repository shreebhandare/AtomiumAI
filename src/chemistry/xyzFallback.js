// Builds a 3D XYZ structure string (for 3Dmol.js) via recursive tetrahedral
// placement, used as a fallback when PubChem has no 3D record for a compound.


/**
 * Builds a proper 3D XYZ string for a set of atoms + bonds using a
 * recursive tetrahedral placement algorithm.
 *
 * Rules:
 *  - Start from the highest-connectivity atom (placed at origin)
 *  - For each atom's neighbors, assign directions based on connectivity count:
 *      1 neighbor  → along +Z
 *      2 neighbors → 120° bent in the XZ plane
 *      3 neighbors → trigonal pyramidal (sp3-like)
 *      4+ neighbors → tetrahedral
 *  - Recursively extend the tree outward
 *  - Disconnected atoms land on a Fibonacci sphere around the centroid
 *
 * @param {Array}  atoms - array of { id, sym } objects
 * @param {Array}  bonds - array of { a, b } objects (atom ID pairs)
 * @returns {string} XYZ format string ready for 3Dmol.js
 */
export function build3DXYZFallback(atoms, bonds) {
  const n = atoms.length;
  if (n === 0) return "";

  // Standard covalent bond length in Ångströms
  const BL = 1.52;

  // Pre-computed direction sets for each valence count
  // All sets are unit-length vectors pointing away from the central atom
  const DIRS = {
    1: [[0, 0, 1]],
    2: [[0.866, 0, 0.5], [-0.866, 0, 0.5]],
    3: [
      [0, 0, 1],
      [0.9428, 0, -0.3333],
      [-0.4714, 0.8165, -0.3333]
    ],
    4: [
      // Perfect tetrahedral vertices
      [0, 0, 1],
      [0.9428, 0, -0.3333],
      [-0.4714, 0.8165, -0.3333],
      [-0.4714, -0.8165, -0.3333]
    ]
  };

  // Build adjacency { id → [neighborId, ...] }
  const adj = {};
  atoms.forEach(a => { adj[a.id] = []; });
  bonds.forEach(b => {
    if (adj[b.a] !== undefined) adj[b.a].push(b.b);
    if (adj[b.b] !== undefined) adj[b.b].push(b.a);
  });

  // Map id → array index
  const idToIdx = {};
  atoms.forEach((a, i) => { idToIdx[a.id] = i; });

  // Positions in Ångströms
  const pos = new Array(n).fill(null);
  const placed = new Set();

  // Pick root = highest degree atom (or first)
  let rootId = atoms[0].id;
  atoms.forEach(a => {
    if ((adj[a.id] || []).length > (adj[rootId] || []).length) rootId = a.id;
  });

  pos[idToIdx[rootId]] = [0, 0, 0];
  placed.add(rootId);

  // BFS-based recursive placement
  const queue = [rootId];
  while (queue.length) {
    const pid = queue.shift();
    const pidx = idToIdx[pid];
    const unplaced = (adj[pid] || []).filter(nid => !placed.has(nid));
    if (!unplaced.length) continue;

    // Pick direction set based on total valence (capped at 4)
    const totalNeighbors = (adj[pid] || []).length;
    const dirs = DIRS[Math.min(4, Math.max(1, totalNeighbors))];

    // Rotate directions so they point away from the parent atom
    const parentNeighbors = (adj[pid] || []).filter(nid => placed.has(nid));
    let axisX = 1, axisY = 0, axisZ = 0;
    if (parentNeighbors.length > 0) {
      const parIdx = idToIdx[parentNeighbors[0]];
      const ppos = pos[parIdx];
      const mypos = pos[pidx];
      const dx = mypos[0] - ppos[0];
      const dy = mypos[1] - ppos[1];
      const dz = mypos[2] - ppos[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      axisX = dx / len; axisY = dy / len; axisZ = dz / len;
    }

    // Simple direction rotation: map DIRS[0] (0,0,1) to axisX,axisY,axisZ
    const rotateDir = ([dx, dy, dz]) => {
      // Rodrigues rotation to align (0,0,1) → (axisX,axisY,axisZ)
      const cosA = axisZ; // dot((0,0,1), axis)
      if (Math.abs(cosA + 1) < 1e-6) {
        // Anti-parallel: flip Z
        return [-dx, -dy, -dz];
      }
      // Cross product of (0,0,1) × axis
      const kx = -axisY, ky = axisX, kz = 0;
      const kLen = Math.hypot(kx, ky, kz);
      if (kLen < 1e-9) return [dx, dy, dz]; // already aligned
      const knx = kx / kLen, kny = ky / kLen;
      // Rodrigues: v*cos + (k×v)*sin + k*(k·v)*(1-cos)
      const sin = kLen / 1; // sin of angle between (0,0,1) and axis (simplified)
      const c = cosA;
      const s = Math.sqrt(1 - c * c);
      const t = 1 - c;
      const nx = (t * knx * knx + c) * dx + (t * knx * kny) * dy + (s * (-kny)) * dz;
      const ny = (t * knx * kny) * dx + (t * kny * kny + c) * dy + (s * knx) * dz;
      const nz = (s * kny) * dx + (-s * knx) * dy + c * dz;
      return [nx, ny, nz];
    };

    // Already placed neighbors consume the first directions
    let dirIdx = parentNeighbors.length;

    unplaced.forEach((nid) => {
      const nidx = idToIdx[nid];
      const rawDir = dirs[dirIdx % dirs.length];
      dirIdx++;
      const [rx, ry, rz] = rotateDir(rawDir);
      pos[nidx] = [
        pos[pidx][0] + rx * BL,
        pos[pidx][1] + ry * BL,
        pos[pidx][2] + rz * BL
      ];
      placed.add(nid);
      queue.push(nid);
    });
  }

  // Disconnected atoms: place on Fibonacci sphere at radius 2*BL
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  let fibIdx = 0;
  atoms.forEach((a, i) => {
    if (!pos[i]) {
      const y = 1 - (fibIdx / Math.max(1, n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * fibIdx;
      pos[i] = [r * Math.cos(theta) * BL * 2, y * BL * 2, r * Math.sin(theta) * BL * 2];
      fibIdx++;
    }
  });

  let xyz = `${n}\nChemLab AI 3D Layout\n`;
  atoms.forEach((a, i) => {
    const [x, y, z] = pos[i];
    xyz += `${a.sym} ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}\n`;
  });
  return xyz;
}

