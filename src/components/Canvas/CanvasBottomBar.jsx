/**
 * CanvasBottomBar.jsx
 * A docked bottom panel inside the canvas area.
 * - bohr mode  → orbit speed slider
 * - simple mode → bond legend
 * - 3d mode    → null (3D viewer has its own built-in bottom bar)
 */
export default function CanvasBottomBar({
  visualMode,
  orbitSpeed,
  setOrbitSpeed,
  fitAll,
  resetView,
}) {
  if (visualMode === "3d") return null;

  const containerStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    background: "var(--clb-bg-panel)",
    borderTop: "1px solid var(--clb-border)",
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    gap: 16,
    fontFamily: "'Space Grotesk', sans-serif",
    transition: "background 0.3s ease, border-color 0.3s ease",
    minHeight: 24,
  };

  if (visualMode === "bohr") {
    return (
      <div style={containerStyle}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
          ⚡ ORBIT SPEED
        </span>
        <input
          type="range" min="0.1" max="3" step="0.1"
          value={orbitSpeed}
          onChange={(e) => setOrbitSpeed(parseFloat(e.target.value))}
          style={{ flex: 1, maxWidth: 200, accentColor: "#2563eb", cursor: "pointer" }}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--clb-text-primary)", fontFamily: "'Space Mono', monospace", minWidth: 32 }}>
          {orbitSpeed.toFixed(1)}×
        </span>
        <div style={{ display: "flex", gap: 8, fontSize: 9, color: "var(--clb-text-muted)", marginLeft: -8 }}>
          <span>0.1×</span>
          <span>·</span>
          <span>3.0×</span>
        </div>

        {/* Spacer to push action buttons to the right */}
        <div style={{ flex: 1 }} />

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="clb-btn"
            style={{ padding: "5px 12px", fontSize: "12px", fontWeight: 600 }}
            onClick={fitAll}
            title="Fit all molecules in view"
          >
            ⛶ Fit
          </button>
          <button
            className="clb-btn"
            style={{ padding: "5px 12px", fontSize: "12px", fontWeight: 600 }}
            onClick={resetView}
            title="Reset view (zoom & pan)"
          >
            ⌂ Reset
          </button>
        </div>
      </div>
    );
  }

  // simple (2D) mode — bond legend
  if (visualMode === "simple") {
    const lineStyle = { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--clb-text-primary)", whiteSpace: "nowrap" };
    return (
      <div style={containerStyle}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 0.5, whiteSpace: "nowrap", marginRight: 4 }}>
          BOND LEGEND
        </span>
        <div style={{ width: 1, height: 20, background: "var(--clb-border)" }} />
        <div style={lineStyle}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.5" /></svg>
          <span>Single</span>
        </div>
        <div style={lineStyle}>
          <svg width="24" height="10">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#64748b" strokeWidth="1.5" />
            <line x1="0" y1="7" x2="24" y2="7" stroke="#64748b" strokeWidth="1.5" />
          </svg>
          <span>Double</span>
        </div>
        <div style={lineStyle}>
          <svg width="24" height="10">
            <line x1="0" y1="2" x2="24" y2="2" stroke="#64748b" strokeWidth="1.2" />
            <line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.2" />
            <line x1="0" y1="8" x2="24" y2="8" stroke="#64748b" strokeWidth="1.2" />
          </svg>
          <span>Triple</span>
        </div>
        <div style={{ width: 1, height: 20, background: "var(--clb-border)" }} />
        <div style={lineStyle}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.5" /></svg>
          <span>Covalent</span>
        </div>
        <div style={lineStyle}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" /></svg>
          <span>Ionic</span>
        </div>

        {/* Spacer to push action buttons to the right */}
        <div style={{ flex: 1 }} />

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="clb-btn"
            style={{ padding: "5px 12px", fontSize: "12px", fontWeight: 600 }}
            onClick={fitAll}
            title="Fit all molecules in view"
          >
            ⛶ Fit
          </button>
          <button
            className="clb-btn"
            style={{ padding: "5px 12px", fontSize: "12px", fontWeight: 600 }}
            onClick={resetView}
            title="Reset view (zoom & pan)"
          >
            ⌂ Reset
          </button>
        </div>
      </div>
    );
  }

  // bohr default / any other mode — empty bar placeholder
  return null;
}
