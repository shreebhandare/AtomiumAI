// ─────────────────────────────────────────────────────────────────────────
// moleculeSidebar.jsx
//
// Small floating list of every distinct molecule currently on the canvas
// (each locked molecule, plus the active/forming one). Clicking an entry
// only changes what use3DMoleculeManager fetches/shows — it has no effect
// on the 2D canvas or selection state there.
//
// Auto-collapses to a small tab the moment the host page tells it the user
// has started interacting with the 3D view (drag/rotate/zoom), via the
// `interactionSignal` prop — pass any value that changes on interaction
// (e.g. a counter incremented on mousedown/wheel over the 3D viewer).
// ─────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

export default function MoleculeSidebar({ molecules, selectedKey, onSelect, interactionSignal }) {
  const [collapsed, setCollapsed] = useState(false);

  // Collapse whenever the interaction signal changes (i.e. the user touched
  // the 3D viewer). Doesn't fire on mount since the effect only reacts to
  // changes after the initial render captures the starting value.
  useEffect(() => {
    if (interactionSignal) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionSignal]);

  if (!molecules || molecules.length === 0) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title="Show molecule list"
        style={{
          position: "absolute", top: 10, left: 10, zIndex: 15,
          display: "flex", alignItems: "center", gap: 6,
          background: "#ffffffee", border: "1px solid #e2e8f0", borderRadius: 8,
          padding: "6px 10px", fontSize: 11.5, fontWeight: 700, color: "#334155",
          cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        }}
      >
        🧪 {molecules.length}
      </button>
    );
  }

  return (
    <div style={{
      position: "absolute", top: 10, left: 10, zIndex: 15,
      width: 180, maxHeight: "70%", overflowY: "auto",
      background: "#ffffffee", backdropFilter: "blur(6px)",
      border: "1px solid #e2e8f0", borderRadius: 10,
      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", borderBottom: "1px solid #f1f5f9",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.6 }}>
          MOLECULES ({molecules.length})
        </span>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse"
          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12, padding: 0 }}
        >
          ✕
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: 6, gap: 4 }}>
        {molecules.map((m) => {
          const isSelected = m.key === selectedKey;
          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              style={{
                textAlign: "left", border: "1px solid", borderRadius: 8,
                padding: "6px 8px", cursor: "pointer",
                background: isSelected ? "#eff6ff" : "transparent",
                borderColor: isSelected ? "#93c5fd" : "transparent",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: isSelected ? "#1d4ed8" : "#1e293b", fontFamily: "'Space Mono', monospace" }}>
                {m.formula || m.name}
                {m.isActive && <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: "#d97706" }}>forming</span>}
              </div>
              {m.name && m.formula && m.name !== m.formula && (
                <div style={{ fontSize: 10, color: "#64748b" }}>{m.name}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
