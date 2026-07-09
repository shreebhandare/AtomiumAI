// src/layoutEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure layout optimization for molecular diagrams.
//
// INVARIANTS (never violated):
//   - Atom identities, bond connectivity, bond orders, charges, aromaticity,
//     stereochemistry, isotopes, and coordination data are NEVER modified.
//   - Only the {x, y} positions arrays produced here may change.
//   - PubChem 2D coordinates are the default; alternatives are only generated
//     when PubChem's layout fails predefined quality thresholds.
//
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ─── Configuration ────────────────────────────────────────────────────────────
export const BOND_LENGTH_PX   = 90;   // standard bond length in pixels
const QUALITY_THRESHOLD       = 25;   // score below this → accept PubChem layout as-is
const FD_MAX_ITERATIONS       = 800;  // safety cap for force-directed
const FD_CONVERGENCE_PX       = 0.5;  // max step-size to declare convergence
const FD_DAMPING              = 0.84;
const MIN_ATOM_DIST_PX        = 45;   // minimum inter-atom distance (overlap threshold)

// ─── Ring Detection ───────────────────────────────────────────────────────────
/**
 * Finds all simple rings (size 3..9) in the bond graph using DFS.
 * Returns an array of rings; each ring is an array of atom indices (0-based).
 * Does NOT read or alter any atom identity, bond order, or chemistry.
 */
export function detectRings(bonds, atomCount) {
  const adj = Array.from({ length: atomCount }, () => []);
  for (const b of bonds) {
    adj[b.from].push(b.to);
    adj[b.to].push(b.from);
  }

  const ringKeys = new Set();
  const rings    = [];

  function dfs(curr, parent, path) {
    for (const next of adj[curr]) {
      if (next === parent) continue;
      const idx = path.indexOf(next);
      if (idx !== -1) {
        const cycle = path.slice(idx);
        if (cycle.length >= 3 && cycle.length <= 9) {
          const key = [...cycle].sort((a, b) => a - b).join('-');
          if (!ringKeys.has(key)) { ringKeys.add(key); rings.push([...cycle]); }
        }
      } else {
        path.push(next);
        dfs(next, curr, path);
        path.pop();
      }
    }
  }

  for (let s = 0; s < atomCount; s++) dfs(s, -1, [s]);
  return rings;
}

// ─── Bond Crossing Detection ──────────────────────────────────────────────────
function segmentsIntersect(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-9) return false;
  const dx = p3.x - p1.x, dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6;
}

function countBondCrossings(positions, bonds) {
  let count = 0;
  for (let i = 0; i < bonds.length; i++) {
    for (let j = i + 1; j < bonds.length; j++) {
      const bi = bonds[i], bj = bonds[j];
      if (bi.from === bj.from || bi.from === bj.to ||
          bi.to   === bj.from || bi.to   === bj.to) continue;
      const p1 = positions[bi.from], p2 = positions[bi.to];
      const p3 = positions[bj.from], p4 = positions[bj.to];
      if (!p1 || !p2 || !p3 || !p4) continue;
      if (segmentsIntersect(p1, p2, p3, p4)) count++;
    }
  }
  return count;
}

// ─── Layout Scoring ───────────────────────────────────────────────────────────
/**
 * Returns a penalty score (lower = better) for a set of positions.
 * Reads only positions, bonds, and reactant count. Modifies nothing.
 */
export function scoreLayout(positions, entry) {
  const { bonds, reactants } = entry;
  let penalty = 0;

  // 1. Bond crossings
  const crossings = countBondCrossings(positions, bonds);
  penalty += crossings * 120;

  // 2. Bond length variance
  if (bonds.length > 0) {
    const lengths = bonds.map(b => {
      const pa = positions[b.from], pb = positions[b.to];
      return (pa && pb) ? Math.hypot(pb.x - pa.x, pb.y - pa.y) : BOND_LENGTH_PX;
    });
    const mean   = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length);
    penalty += (stdDev / (mean || 1)) * 40;
  }

  // 3. Atom overlaps
  for (let i = 0; i < reactants.length; i++) {
    for (let j = i + 1; j < reactants.length; j++) {
      const pi = positions[i], pj = positions[j];
      if (!pi || !pj) continue;
      const d = Math.hypot(pj.x - pi.x, pj.y - pi.y);
      if (d < MIN_ATOM_DIST_PX) penalty += 80 * (1 - d / MIN_ATOM_DIST_PX);
    }
  }

  // 4. Ring regularity
  const rings = detectRings(bonds, reactants.length);
  for (const ring of rings) {
    const idealAngle = ((ring.length - 2) * Math.PI) / ring.length;
    let angleError = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[(i + ring.length - 1) % ring.length];
      const b = ring[i];
      const c = ring[(i + 1) % ring.length];
      const pa = positions[a], pb = positions[b], pc = positions[c];
      if (!pa || !pb || !pc) continue;
      const v1x = pa.x - pb.x, v1y = pa.y - pb.y;
      const v2x = pc.x - pb.x, v2y = pc.y - pb.y;
      const cosA = (v1x * v2x + v1y * v2y) /
                   ((Math.hypot(v1x, v1y) || 1) * (Math.hypot(v2x, v2y) || 1));
      angleError += Math.abs(Math.acos(Math.max(-1, Math.min(1, cosA))) - idealAngle);
    }
    penalty += (angleError / ring.length) * 20;
  }

  return penalty;
}

// ─── PubChem 2D Layout ────────────────────────────────────────────────────────
export function buildPubchemLayout(entry, centroid) {
  const { coords, reactants } = entry;
  if (!coords || coords.length !== reactants.length) return null;
  const cx = coords.reduce((s, c) => s + c.x, 0) / coords.length;
  const cy = coords.reduce((s, c) => s + c.y, 0) / coords.length;
  return coords.map(c => ({
    x: centroid.x + (c.x - cx) * BOND_LENGTH_PX,
    y: centroid.y + (c.y - cy) * BOND_LENGTH_PX,
  }));
}

// ─── Ring-Aware Layout ────────────────────────────────────────────────────────
export function buildRingAwareLayout(entry, centroid) {
  const { bonds, reactants } = entry;
  const n = reactants.length;
  const rings = detectRings(bonds, n);
  if (rings.length === 0) return null;

  const positions = new Array(n).fill(null);
  const placed    = new Set();
  const adj = Array.from({ length: n }, () => []);
  for (const b of bonds) { adj[b.from].push(b.to); adj[b.to].push(b.from); }

  const sortedRings = [...rings].sort((a, b) => b.length - a.length);

  // First ring: regular polygon at centroid
  const first = sortedRings[0];
  const R0 = BOND_LENGTH_PX / (2 * Math.sin(Math.PI / first.length));
  first.forEach((idx, i) => {
    const angle = (2 * Math.PI * i) / first.length - Math.PI / 2;
    positions[idx] = { x: centroid.x + R0 * Math.cos(angle), y: centroid.y + R0 * Math.sin(angle) };
    placed.add(idx);
  });

  // Fused rings: fold from shared edge
  for (let ri = 1; ri < sortedRings.length; ri++) {
    const ring = sortedRings[ri];
    let eA = -1, eB = -1;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if (placed.has(a) && placed.has(b)) { eA = a; eB = b; break; }
    }
    if (eA === -1) continue;

    const pa = positions[eA], pb = positions[eB];
    const midX = (pa.x + pb.x) / 2, midY = (pa.y + pb.y) / 2;
    const cx_ = [...placed].reduce((s, i) => s + positions[i].x, 0) / placed.size;
    const cy_ = [...placed].reduce((s, i) => s + positions[i].y, 0) / placed.size;
    const outAngle = Math.atan2(midY - cy_, midX - cx_);

    const startIdx = ring.indexOf(eA);
    const reordered = ring.map((_, k) => ring[(startIdx + k) % ring.length]);
    const Rn = BOND_LENGTH_PX / (2 * Math.sin(Math.PI / ring.length));
    reordered.forEach((idx, i) => {
      if (placed.has(idx)) return;
      const frac = i / ring.length;
      const angle = outAngle + Math.PI + frac * 2 * Math.PI;
      positions[idx] = { x: midX + Rn * Math.cos(angle), y: midY + Rn * Math.sin(angle) };
      placed.add(idx);
    });
  }

  // Chain atoms: extend radially from placed atoms
  function placeChain(fromIdx) {
    const unplaced = adj[fromIdx].filter(i => !placed.has(i));
    if (!unplaced.length) return;
    const base = Math.atan2(positions[fromIdx].y - centroid.y, positions[fromIdx].x - centroid.x);
    const spread = Math.min(Math.PI * 0.7, (Math.PI / 3) * unplaced.length);
    unplaced.forEach((toIdx, k) => {
      const offset = unplaced.length === 1 ? 0 : ((k / (unplaced.length - 1)) - 0.5) * spread;
      positions[toIdx] = {
        x: positions[fromIdx].x + BOND_LENGTH_PX * Math.cos(base + offset),
        y: positions[fromIdx].y + BOND_LENGTH_PX * Math.sin(base + offset),
      };
      placed.add(toIdx);
      placeChain(toIdx);
    });
  }
  for (let i = 0; i < n; i++) { if (placed.has(i)) placeChain(i); }

  for (let i = 0; i < n; i++) {
    if (!positions[i]) {
      positions[i] = { x: centroid.x + (Math.random() - 0.5) * 60, y: centroid.y + (Math.random() - 0.5) * 60 };
    }
  }
  return positions;
}

// ─── Force-Directed Refinement ────────────────────────────────────────────────
/**
 * Runs until convergence (max displacement < FD_CONVERGENCE_PX) or FD_MAX_ITERATIONS.
 * Does not mutate initPositions.
 */
export function buildFDRefinement(entry, initPositions) {
  const { bonds, reactants } = entry;
  const n = reactants.length;
  const pos = initPositions.map(p => ({ x: p.x, y: p.y }));
  const vel = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

  const K_ATTRACT = 0.06;
  const K_REPEL   = BOND_LENGTH_PX * BOND_LENGTH_PX * 2.2;
  const MAX_STEP  = 20;

  for (let iter = 0; iter < FD_MAX_ITERATIONS; iter++) {
    const force = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

    for (const b of bonds) {
      const dx = pos[b.to].x - pos[b.from].x, dy = pos[b.to].y - pos[b.from].y;
      const dist = Math.hypot(dx, dy) || 1;
      const stretch = (dist - BOND_LENGTH_PX) * K_ATTRACT;
      const fx = (dx / dist) * stretch, fy = (dy / dist) * stretch;
      force[b.from].x += fx; force[b.from].y += fy;
      force[b.to].x   -= fx; force[b.to].y   -= fy;
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        if (dx === 0 && dy === 0) {
          dx = (Math.random() - 0.5) * 0.2;
          dy = (Math.random() - 0.5) * 0.2;
        }
        const dist2 = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(dist2);
        const f = K_REPEL / dist2;
        const nx = dx / dist, ny = dy / dist;
        force[i].x -= nx * f; force[i].y -= ny * f;
        force[j].x += nx * f; force[j].y += ny * f;
      }
    }

    let maxMove = 0;
    for (let i = 0; i < n; i++) {
      vel[i].x = (vel[i].x + force[i].x) * FD_DAMPING;
      vel[i].y = (vel[i].y + force[i].y) * FD_DAMPING;
      const speed = Math.hypot(vel[i].x, vel[i].y);
      if (speed > MAX_STEP) { vel[i].x *= MAX_STEP / speed; vel[i].y *= MAX_STEP / speed; }
      pos[i].x += vel[i].x; pos[i].y += vel[i].y;
      maxMove = Math.max(maxMove, speed);
    }
    if (maxMove < FD_CONVERGENCE_PX) { console.log(`[Layout] FD converged at iter ${iter}`); break; }
  }
  return pos;
}

// ─── Coordinate Normalisation ─────────────────────────────────────────────────
export function normalizePositions(positions, bonds) {
  const n = positions.length;
  const cx = positions.reduce((s, p) => s + p.x, 0) / n;
  const cy = positions.reduce((s, p) => s + p.y, 0) / n;
  let scale = BOND_LENGTH_PX;
  if (bonds && bonds.length > 0) {
    const lengths = bonds.map(b => Math.hypot(positions[b.to].x - positions[b.from].x, positions[b.to].y - positions[b.from].y));
    const mean = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    if (mean > 1) scale = mean;
  }
  return positions.map(p => ({ x: (p.x - cx) / scale, y: (p.y - cy) / scale }));
}

export function denormalizePositions(normalizedPositions, centroid) {
  return normalizedPositions.map(p => ({
    x: centroid.x + p.x * BOND_LENGTH_PX,
    y: centroid.y + p.y * BOND_LENGTH_PX,
  }));
}

// ─── Supabase Layout Cache ────────────────────────────────────────────────────
const inMemoryLayoutCache = new Map(); // CID → normalized positions[]

export function clearLayoutCache() { inMemoryLayoutCache.clear(); }

export async function loadCachedLayout(cid) {
  if (!cid) return null;
  if (inMemoryLayoutCache.has(cid)) return inMemoryLayoutCache.get(cid);
  try {
    const { data } = await supabase.from('layout_cache').select('positions').eq('cid', cid).maybeSingle();
    if (!data) return null;
    inMemoryLayoutCache.set(cid, data.positions);
    console.log(`[Layout] Supabase cache hit for CID=${cid}`);
    return data.positions;
  } catch (_) { return null; }
}

export async function saveCachedLayout(cid, fp, normalizedPositions, score) {
  if (!cid) return;
  inMemoryLayoutCache.set(cid, normalizedPositions);
  try {
    await supabase.from('layout_cache').upsert({ cid, fp, positions: normalizedPositions, score }, { onConflict: 'cid' });
  } catch (e) {
    console.warn('[Layout] Cache save failed (layout_cache table may not exist):', e.message);
  }
}

// ─── Circular Fallback ────────────────────────────────────────────────────────
export function buildCircularLayout(entry, centroid) {
  const n = entry.reactants.length;
  const r = Math.max(60, n * 25);
  return entry.reactants.map((_, i) => ({
    x: centroid.x + r * Math.cos((2 * Math.PI * i) / n),
    y: centroid.y + r * Math.sin((2 * Math.PI * i) / n),
  }));
}

// ─── Main Layout Selector ─────────────────────────────────────────────────────
/**
 * Returns the best positions array for a molecule entry centred on centroid.
 * 1. Supabase cache (CID key)     → use immediately, skip optimization
 * 2. PubChem 2D                   → accept if score < QUALITY_THRESHOLD
 * 3. Ring-aware, FD-pubchem,
 *    FD-ring, circular            → scored and competed when PubChem insufficient
 * Stores winner in Supabase (fire-and-forget). Chemistry is never modified.
 */
export async function selectBestLayout(entry, centroid) {
  // 1. Supabase cache by CID
  if (entry.cid) {
    const cached = await loadCachedLayout(entry.cid);
    if (cached) return denormalizePositions(cached, centroid);
  }

  const candidates = [];

  // 2. PubChem 2D — primary candidate
  const pubchemPos = buildPubchemLayout(entry, centroid);
  if (pubchemPos) {
    const score = scoreLayout(pubchemPos, entry);
    console.log(`[Layout] Candidate: pubchem  score=${score.toFixed(1)}`);
    candidates.push({ positions: pubchemPos, label: 'pubchem', score });

    if (score < QUALITY_THRESHOLD) {
      console.log(`[Layout] Selected: pubchem (score=${score.toFixed(1)}, meets threshold)`);
      _persistAsync(entry, pubchemPos, score);
      return pubchemPos;
    }
  }

  // 3. Ring-aware layout (if molecule has rings)
  const ringPos = buildRingAwareLayout(entry, centroid);
  if (ringPos) {
    const score = scoreLayout(ringPos, entry);
    console.log(`[Layout] Candidate: ring-aware  score=${score.toFixed(1)}`);
    candidates.push({ positions: ringPos, label: 'ring-aware', score });
  }

  // 4. Force-directed from PubChem seed (or circular if PubChem unavailable)
  const fdSeed = pubchemPos || buildCircularLayout(entry, centroid);
  const fdPos  = _recentre(buildFDRefinement(entry, fdSeed), centroid);
  const fdScore = scoreLayout(fdPos, entry);
  console.log(`[Layout] Candidate: FD-pubchem  score=${fdScore.toFixed(1)}`);
  candidates.push({ positions: fdPos, label: 'FD-pubchem', score: fdScore });

  // 5. Force-directed from ring-aware seed
  if (ringPos) {
    const fdRingPos  = _recentre(buildFDRefinement(entry, ringPos), centroid);
    const fdRingScore = scoreLayout(fdRingPos, entry);
    console.log(`[Layout] Candidate: FD-ring  score=${fdRingScore.toFixed(1)}`);
    candidates.push({ positions: fdRingPos, label: 'FD-ring', score: fdRingScore });
  }

  // 6. Circular fallback
  const circPos   = buildCircularLayout(entry, centroid);
  const circScore = scoreLayout(circPos, entry);
  candidates.push({ positions: circPos, label: 'circular', score: circScore });

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  console.log(`[Layout] Selected: ${best.label} (score=${best.score.toFixed(1)})`);
  _persistAsync(entry, best.positions, best.score);
  return best.positions;
}

function _recentre(positions, centroid) {
  const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
  const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
  return positions.map(p => ({ x: centroid.x + p.x - cx, y: centroid.y + p.y - cy }));
}

function _persistAsync(entry, positions, score) {
  if (!entry.cid) return;
  const normalized = normalizePositions(positions, entry.bonds);
  saveCachedLayout(entry.cid, entry.fp || '', normalized, score);
}
