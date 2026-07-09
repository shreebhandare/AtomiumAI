// Physics engine constants and per-pair bonding-probability factors.
import { getElement } from "../data/elements";

export const REACTION_DIST = 78;
export const REPEL_DIST = 46;
export const NUCLEUS_R = 13;
export const SHELL_GAP = 16;
export const BASE_RATE = 0.045;


export function shellRadius(idx) {
  return NUCLEUS_R + SHELL_GAP * (idx + 1);
}

// Arrhenius-style temperature factor
export function tempFactor(currentK, minK) {
  if (currentK <= 0) return 0;
  const scale = 0.01;
  const ratio = (minK * scale) / (currentK * scale);
  return Math.exp(-ratio);
}
export function distFactor(d, maxD) {
  const limit = maxD || REACTION_DIST;
  if (d >= limit) return 0;
  return 1 - d / limit;
}
export function hungerFactor(atom, bondCount) {
  const el = getElement(atom.sym);
  if (el.valence === 0) return 0;
  const unmet = Math.max(0, el.valence - bondCount);
  return unmet / el.valence;
}
export function instabilityFactor(atom) {
  return 1 + atom.instability;
}
export function pressureFactor(currentAtm, minAtm) {
  if (currentAtm >= minAtm) return 1;
  // below the minimum, probability scales down smoothly rather than hard-gating
  return Math.max(0, currentAtm / minAtm);
}

export function bondProbability(a, b, dist, maxDist, conditions, entry, bondsA, bondsB) {
  const dF = distFactor(dist, maxDist);
  if (dF === 0) return 0;
  const tF = 1; // tempFactor(conditions.tempK, entry.minTempK);
  const pF = 1; // pressureFactor(conditions.pressureAtm, entry.minPressureAtm);
  const hF = 1; // (hungerFactor(a, bondsA) + hungerFactor(b, bondsB)) / 2;
  const iF = (instabilityFactor(a) + instabilityFactor(b)) / 2;
  return Math.min(1, BASE_RATE * dF * tF * pF * hF * iF);
}
