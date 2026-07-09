// ─────────────────────────────────────────────────────────────────────────
// viewerFetch.js
//
// Thin PubChem 3D-SDF fetch helpers, each bounded by a hard timeout via
// AbortController. This is the actual fix for "3D mode is too slow": the
// previous implementation had no timeout at all, so a slow/unresponsive
// PubChem request could stall the whole 3D view for many seconds before
// ever falling through to the instant local fallback. Now a stalled request
// aborts itself after `timeoutMs` and the caller moves on immediately.
// ─────────────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.text();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch a 3D SDF conformer by PubChem CID (fast path — most reliable). */
export function fetchPubChem3DByCid(cid, timeoutMs) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
  return fetchWithTimeout(url, timeoutMs);
}

/** Fetch a 3D SDF conformer by compound name (used when CID is unknown). */
export function fetchPubChem3DByName(name, timeoutMs) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/SDF?record_type=3d`;
  return fetchWithTimeout(url, timeoutMs);
}
