/**
 * Molecule3DViewer.jsx
 *
 * Reusable, performant 3D molecular renderer using 3Dmol.js.
 *
 * Props (all optional — whichever is provided first wins, SDF preferred):
 *   sdfData  {string}  — SDF/MOL file content
 *   molData  {string}  — MOL file content
 *   xyzData  {string}  — XYZ file content
 *   pdbData  {string}  — PDB file content
 *   modelData {string} + format {string} — generic data + explicit format
 *   title    {string}  — displayed in the header bar
 *
 * Features:
 *   • Single WebGL context per mount — reused across data changes (no re-init)
 *   • requestAnimationFrame-debounced render calls — zero unnecessary frames
 *   • CPK/Jmol color scheme for all styles
 *   • Ball & Stick / Stick / Space Filling / Line styles
 *   • Hover label (element symbol), click selection with side panel
 *   • Toolbar: Zoom In/Out, Reset, Toggle Labels, Screenshot
 *   • Responsive resize via ResizeObserver
 *   • Correct cleanup to prevent WebGL context leak on unmount
 */
import { useState, useRef, useEffect, useCallback } from "react";

// ─── CPK Element lookup table ────────────────────────────────────────────────
const ELEMENT_INFO = {
  H:  { name: "Hydrogen",    number: 1,  color: "#DDDDDD" },
  C:  { name: "Carbon",      number: 6,  color: "#909090" },
  N:  { name: "Nitrogen",    number: 7,  color: "#3050F8" },
  O:  { name: "Oxygen",      number: 8,  color: "#FF0D0D" },
  F:  { name: "Fluorine",    number: 9,  color: "#90E050" },
  P:  { name: "Phosphorus",  number: 15, color: "#FF8000" },
  S:  { name: "Sulfur",      number: 16, color: "#FFFF30" },
  CL: { name: "Chlorine",    number: 17, color: "#1FF01F" },
  NA: { name: "Sodium",      number: 11, color: "#AB5CF2" },
  MG: { name: "Magnesium",   number: 12, color: "#8AFF00" },
  CA: { name: "Calcium",     number: 20, color: "#3DFF00" },
  FE: { name: "Iron",        number: 26, color: "#E06633" },
  CU: { name: "Copper",      number: 29, color: "#C88033" },
  ZN: { name: "Zinc",        number: 30, color: "#7D80B0" },
  K:  { name: "Potassium",   number: 19, color: "#8F40D4" },
  SI: { name: "Silicon",     number: 14, color: "#F0C8A0" },
  LI: { name: "Lithium",     number: 3,  color: "#CC80FF" },
  B:  { name: "Boron",       number: 5,  color: "#FFB5B5" },
};

function getElementInfo(sym) {
  return ELEMENT_INFO[sym?.toUpperCase()] || { name: sym || "?", number: "?", color: "#cccccc" };
}

// ─── Style spec builders ─────────────────────────────────────────────────────
function buildStyleSpec(style) {
  switch (style) {
    case "stick":       return { stick:  { colorscheme: "Jmol", radius: 0.18 } };
    case "sphere":      return { sphere: { colorscheme: "Jmol", scale: 0.9 } };
    case "line":        return { line:   { colorscheme: "Jmol" } };
    case "ballAndStick":
    default:
      return {
        sphere: { colorscheme: "Jmol", scale: 0.28 },
        stick:  { colorscheme: "Jmol", radius: 0.12 },
      };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Molecule3DViewer({ modelData, format, sdfData, molData, xyzData, pdbData, title }) {
  const containerRef  = useRef(null);
  const viewerRef     = useRef(null);   // $3Dmol viewer instance
  const rafRef        = useRef(null);   // pending requestAnimationFrame
  const hoverLabelRef = useRef(null);
  const resizeObsRef  = useRef(null);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [currentStyle, setCurrentStyle] = useState("ballAndStick");
  const [showLabels,   setShowLabels]   = useState(false);
  const [selectedAtom, setSelectedAtom] = useState(null);

  // Resolve which data + format to use (SDF preferred)
  const { activeData, activeFormat } = (() => {
    if (sdfData)    return { activeData: sdfData,    activeFormat: "sdf" };
    if (molData)    return { activeData: molData,    activeFormat: "mol" };
    if (xyzData)    return { activeData: xyzData,    activeFormat: "xyz" };
    if (pdbData)    return { activeData: pdbData,    activeFormat: "pdb" };
    if (modelData)  return { activeData: modelData,  activeFormat: format || "sdf" };
    return { activeData: "", activeFormat: "" };
  })();

  // ── Debounced render (batch multiple style/label updates into one frame) ──
  const scheduleRender = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      viewerRef.current?.render();
      rafRef.current = null;
    });
  }, []);

  // ── Initialize viewer once ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    if (!window.$3Dmol) {
      setError("3Dmol.js WebGL engine is not loaded. Please check your internet connection.");
      setLoading(false);
      return;
    }

    try {
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "white",
        antialias: true,
        disableFog: true,
        cartoonQuality: 5,
      });
      viewerRef.current.setProjection("perspective");
    } catch (e) {
      setError(`WebGL initialization failed: ${e.message}`);
      setLoading(false);
      return;
    }

    // ResizeObserver keeps the WebGL viewport perfectly in sync
    resizeObsRef.current = new ResizeObserver(() => {
      viewerRef.current?.resize();
      scheduleRender();
    });
    resizeObsRef.current.observe(containerRef.current);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObsRef.current?.disconnect();
      if (viewerRef.current) {
        viewerRef.current.clear();
        viewerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load / reload model data ─────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeData) return;

    setLoading(true);
    setSelectedAtom(null);
    if (hoverLabelRef.current) {
      viewer.removeLabel(hoverLabelRef.current);
      hoverLabelRef.current = null;
    }

    try {
      viewer.clear();
      const model = viewer.addModel(activeData, activeFormat);
      if (!model) throw new Error("Model parse returned null — check the format/data.");

      // Apply initial style
      viewer.setStyle({}, buildStyleSpec(currentStyle));

      // Hover: show element label near atom
      viewer.setHoverable({}, true,
        (atom) => {
          if (hoverLabelRef.current) viewer.removeLabel(hoverLabelRef.current);
          hoverLabelRef.current = viewer.addLabel(atom.elem || "?", {
            position: atom,
            backgroundOpacity: 0.82,
            fontSize: 11,
            fontColor: "#ffffff",
            backgroundColor: "#0f172a",
            borderColor: "#334155",
            borderWidth: 1,
            inFront: true,
          });
          scheduleRender();
        },
        () => {
          if (hoverLabelRef.current) {
            viewer.removeLabel(hoverLabelRef.current);
            hoverLabelRef.current = null;
            scheduleRender();
          }
        }
      );

      // Click: highlight atom + populate side panel
      viewer.setClickable({}, true, (atom) => {
        const info = getElementInfo(atom.elem);
        setSelectedAtom({
          elem:   atom.elem,
          name:   info.name,
          number: info.number,
          color:  info.color,
          x: atom.x?.toFixed(3) ?? "—",
          y: atom.y?.toFixed(3) ?? "—",
          z: atom.z?.toFixed(3) ?? "—",
          index: atom.index,
        });

        // Re-apply base style then highlight this atom
        viewer.setStyle({}, buildStyleSpec(currentStyle));
        viewer.setStyle({ index: atom.index }, {
          sphere: { color: "#fbbf24", scale: 0.46, opacity: 0.85 },
          stick:  buildStyleSpec(currentStyle).stick || {},
        });
        scheduleRender();
      });

      viewer.zoomTo();
      scheduleRender();
      setLoading(false);
      setError(null);
    } catch (e) {
      setError(`Render error: ${e.message}`);
      setLoading(false);
    }
  }, [activeData, activeFormat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-apply style when currentStyle or showLabels changes ──────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.setStyle({}, buildStyleSpec(currentStyle));
    viewer.removeAllLabels();
    hoverLabelRef.current = null;

    if (showLabels) {
      const atoms = viewer.getModel()?.atoms ?? [];
      atoms.forEach((atom) => {
        viewer.addLabel(atom.elem || "?", {
          position: atom,
          backgroundOpacity: 0,
          fontColor: "#334155",
          fontSize: 9,
          inFront: true,
        });
      });
    }
    scheduleRender();
  }, [currentStyle, showLabels, scheduleRender]);

  // ── Toolbar callbacks ────────────────────────────────────────────────────
  const handleReset   = () => { viewerRef.current?.zoomTo();     scheduleRender(); };
  const handleZoomIn  = () => { viewerRef.current?.zoom(1.18);   scheduleRender(); };
  const handleZoomOut = () => { viewerRef.current?.zoom(0.83);   scheduleRender(); };
  const handleScreenshot = () => {
    try {
      const uri = viewerRef.current?.png();
      if (!uri) return;
      const a = document.createElement("a");
      a.href = uri;
      a.download = `${title || "molecule"}_3d.png`;
      a.click();
    } catch (_) { /* silent */ }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const btnBase = {
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#ffffff",
    color: "#475569",
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    fontSize: 11,
    transition: "background 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "#ffffff", width: "100%", height: "100%",
      borderRadius: 16, border: "1px solid #e2e8f0",
      boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
      overflow: "hidden", position: "relative",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 14px", background: "#f8fafc",
        borderBottom: "1px solid #f1f5f9", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15 }}>🧊</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#1e293b",
            fontFamily: "'Space Grotesk', sans-serif", letterSpacing: 0.4,
            textTransform: "uppercase",
          }}>
            {title || "3D Molecular Viewer"}
          </span>
        </div>
        {activeFormat && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: "#2563eb",
            background: "#eff6ff", padding: "2px 7px",
            borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            {activeFormat}
          </span>
        )}
      </div>

      {/* ── Viewer + overlays ───────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", minHeight: 240, overflow: "hidden" }}>

        {/* Loading */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,0.88)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", zIndex: 20, gap: 12,
          }}>
            <div style={{
              width: 30, height: 30,
              border: "3px solid #cbd5e1", borderTop: "3px solid #3b82f6",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              Building 3D structure…
            </span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            position: "absolute", inset: 0, background: "#fef2f2",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", zIndex: 20, gap: 6, padding: 20, textAlign: "center",
          }}>
            <span style={{ fontSize: 26 }}>⚠️</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>Renderer Error</span>
            <span style={{ fontSize: 11, color: "#b91c1c", maxWidth: 280 }}>{error}</span>
          </div>
        )}

        {/* WebGL canvas host */}
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%", cursor: "grab" }}
        />

        {/* Selected Atom Info Panel */}
        {selectedAtom && (
          <div style={{
            position: "absolute", top: 10, right: 10, zIndex: 10,
            background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)",
            border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px",
            width: 162, boxShadow: "0 8px 20px rgba(0,0,0,0.07)",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.8 }}>
                SELECTED ATOM
              </span>
              <button
                onClick={() => setSelectedAtom(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 11, padding: 1 }}
              >✕</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: selectedAtom.color,
                border: "1px solid rgba(0,0,0,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800,
                color: selectedAtom.elem?.toUpperCase() === "H" ? "#333" : "#fff",
              }}>
                {selectedAtom.elem}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  {selectedAtom.name}
                </div>
                <div style={{ fontSize: 9, color: "#64748b" }}>Z = {selectedAtom.number}</div>
              </div>
            </div>

            <div style={{ height: 1, background: "#f1f5f9" }} />

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "3px 4px", fontSize: 10,
              fontFamily: "'Space Mono', monospace",
            }}>
              {[["X", selectedAtom.x], ["Y", selectedAtom.y], ["Z", selectedAtom.z]].map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <span style={{ color: "#94a3b8" }}>{k}:</span>
                  <span style={{ color: "#334155", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 12px", background: "#f8fafc",
        borderTop: "1px solid #f1f5f9", flexShrink: 0, gap: 8, flexWrap: "wrap",
      }}>

        {/* Style selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.6 }}>STYLE</span>
          <select
            value={currentStyle}
            onChange={(e) => setCurrentStyle(e.target.value)}
            style={{
              ...btnBase, padding: "4px 8px", cursor: "pointer",
              fontSize: 11.5, color: "#334155", height: 28,
            }}
          >
            <option value="ballAndStick">Ball & Stick</option>
            <option value="stick">Stick</option>
            <option value="sphere">Space Filling</option>
            <option value="line">Line</option>
          </select>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {[
            { label: "+",    title: "Zoom In",       action: handleZoomIn,    w: 28 },
            { label: "−",    title: "Zoom Out",      action: handleZoomOut,   w: 28 },
            { label: "⌂",   title: "Reset View",    action: handleReset,     w: 28, fs: 14 },
            { label: "LABELS", title: "Toggle Atom Labels", action: () => setShowLabels(v => !v), active: showLabels, px: 8 },
            { label: "📸",   title: "Screenshot",   action: handleScreenshot, w: 28, fs: 13 },
          ].map(({ label, title, action, active, w, px, fs }) => (
            <button
              key={label}
              onClick={action}
              title={title}
              style={{
                ...btnBase,
                width: w, height: 28,
                padding: px ? `0 ${px}px` : 0,
                fontSize: fs || 11,
                background: active ? "#e0e7ff" : "#ffffff",
                borderColor: active ? "#6366f1" : "#e2e8f0",
                color: active ? "#4f46e5" : "#475569",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
