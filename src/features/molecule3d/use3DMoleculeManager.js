// ─────────────────────────────────────────────────────────────────────────
// use3DMoleculeManager.js
//
// Self-contained replacement for the old inline 3D-fetch effect. Owns:
//   • Detecting every distinct molecule currently on the canvas (each locked
//     molecule, plus the active/still-forming one if present) so more than
//     one molecule can coexist and be picked from.
//   • Which of those molecules is currently selected for 3D viewing.
//   • A per-molecule cache (by CID, falling back to name) so revisiting a
//     molecule you've already viewed in 3D never re-hits PubChem.
//   • The fetch chain itself: PubChem-by-CID -> PubChem-by-name -> local
//     tetrahedral layout, each network attempt bounded by a hard timeout
//     (see viewerFetch.js) so a slow/hanging request can't stall the view.
//
// Nothing outside this file needs to know any of these details — the host
// component just calls the hook and renders whatever it returns.
// ─────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from "react";
import { build3DXYZFallback } from "../../chemistry/xyzFallback";
import { fetchPubChem3DByCid, fetchPubChem3DByName } from "./viewerFetch";

const PUBCHEM_TIMEOUT_MS = 2500;
// Short settle delay — only matters while atoms/bonds are actively changing
// (e.g. mid-reaction); a deliberate switch into 3D mode still feels instant.
const SETTLE_DEBOUNCE_MS = 150;

/**
 * @param {Object} params
 * @param {string} params.visualMode - "bohr" | "simple" | "3d"
 * @param {React.RefObject} params.atomsRef - all atoms on the canvas
 * @param {React.RefObject} params.bondsRef - all bonds on the canvas
 * @param {React.RefObject} params.lockedCompoundsRef - array of { fp, entry, aligned }
 * @param {React.RefObject} params.committedCompoundRef - the active/forming compound, or null
 * @param {number} params.countsAtoms - atom count (re-triggers molecule-list recompute)
 * @param {number} params.countsBonds - bond count (re-triggers molecule-list recompute)
 */
export function use3DMoleculeManager({
  visualMode, atomsRef, bondsRef, lockedCompoundsRef, committedCompoundRef,
  countsAtoms, countsBonds,
}) {
  const [molecules, setMolecules] = useState([]); // [{ key, name, formula, cid, aligned, isActive }]
  const [selectedKey, setSelectedKey] = useState(null);
  const [viewerData, setViewerData] = useState({ sdf: "", xyz: "", title: "" });
  const [isFetching, setIsFetching] = useState(false);

  const cacheRef = useRef(new Map());
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  // ── Recompute the distinct-molecule list whenever the canvas contents change ──
  useEffect(() => {
    if (visualMode !== "3d") return;

    const list = lockedCompoundsRef.current.map((lc) => ({
      key: lc.fp,
      name: lc.entry.name,
      formula: lc.entry.formula,
      cid: lc.entry.cid,
      aligned: lc.aligned,
      isActive: false,
    }));

    const cc = committedCompoundRef.current;
    if (cc) {
      list.push({
        key: cc.fp,
        name: cc.entry.name,
        formula: cc.entry.formula,
        cid: cc.entry.cid,
        aligned: cc.aligned,
        isActive: true,
      });
    }

    setMolecules(list);
    setSelectedKey((prev) => {
      if (prev && list.some((m) => m.key === prev)) return prev; // keep selection if it still exists
      return list.length ? list[list.length - 1].key : null; // else default to most recently formed
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualMode, countsAtoms, countsBonds]);

  const selectMolecule = useCallback((key) => setSelectedKey(key), []);

  // ── Fetch 3D data for whichever molecule is selected ──
  useEffect(() => {
    if (visualMode !== "3d" || !selectedKey) {
      setViewerData({ sdf: "", xyz: "", title: "" });
      return;
    }
    const molecule = molecules.find((m) => m.key === selectedKey);
    if (!molecule) return;

    const run = async () => {
      const cacheKey = molecule.cid ? `cid:${molecule.cid}` : molecule.name ? `name:${molecule.name}` : null;
      if (cacheKey && cacheRef.current.has(cacheKey)) {
        setViewerData(cacheRef.current.get(cacheKey));
        return;
      }

      const myRequestId = ++requestIdRef.current;
      setIsFetching(true);
      try {
        if (molecule.cid) {
          try {
            const sdf = await fetchPubChem3DByCid(molecule.cid, PUBCHEM_TIMEOUT_MS);
            if (requestIdRef.current !== myRequestId) return; // selection changed mid-flight
            const result = { sdf, xyz: "", title: molecule.name || molecule.formula || "Molecule" };
            setViewerData(result);
            if (cacheKey) cacheRef.current.set(cacheKey, result);
            return;
          } catch (e) {
            console.warn("[3D] CID lookup failed/timed out:", e.message);
          }
        }

        if (molecule.name) {
          try {
            const sdf = await fetchPubChem3DByName(molecule.name, PUBCHEM_TIMEOUT_MS);
            if (requestIdRef.current !== myRequestId) return;
            const result = { sdf, xyz: "", title: molecule.name };
            setViewerData(result);
            if (cacheKey) cacheRef.current.set(cacheKey, result);
            return;
          } catch (e) {
            console.warn("[3D] Name lookup failed/timed out:", e.message);
          }
        }

        // Local fallback — instant, and intentionally not cached (it's derived
        // from live atoms/bonds, not a stable compound identity).
        if (requestIdRef.current !== myRequestId) return;
        const internalIds = new Set(molecule.aligned.map((a) => a.id));
        const internalBonds = bondsRef.current.filter((b) => internalIds.has(b.a) && internalIds.has(b.b));
        const xyz = build3DXYZFallback(molecule.aligned, internalBonds);
        setViewerData({ sdf: "", xyz, title: molecule.name || molecule.formula || "Molecule" });
      } finally {
        if (requestIdRef.current === myRequestId) setIsFetching(false);
      }
    };

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, SETTLE_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualMode, selectedKey, molecules]);

  return {
    molecules,
    selectedKey,
    selectMolecule,
    viewer3dSdf: viewerData.sdf,
    viewer3dXyz: viewerData.xyz,
    viewer3dTitle: viewerData.title,
    isFetching,
  };
}
