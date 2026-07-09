// "Reading bonds in Simple Mode" modal (Upgrade #4.2.3): explains bond
// notation — single/double/triple bond line-count, and dashed (ionic) vs
// solid (covalent) bond styling. Appears every time Simple Mode is opened
// (see the prevVisualModeRef transition-detection in ChemLabCanvas.jsx),
// dismissible via the backdrop, the ✕, or "Got it".
export default function SimpleModeLegend({ onDismiss }) {
  return (
    <div
      role="presentation"
      onClick={onDismiss}
      style={{
        position: "absolute", inset: 0, zIndex: 30,
        background: "rgba(15, 23, 42, 0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="simple-mode-legend-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)", padding: "20px 24px",
          maxWidth: 460, width: "calc(100% - 48px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div id="simple-mode-legend-title" style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            Reading bonds in Simple Mode
          </div>
          <button
            className="clb-btn"
            style={{ fontSize: 12, padding: "3px 8px" }}
            onClick={onDismiss}
            title="Close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: "#334155", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="34" height="14"><line x1="2" y1="7" x2="32" y2="7" stroke="#64748b" strokeWidth="2" /></svg>
            Single bond
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="34" height="14">
              <line x1="2" y1="4" x2="32" y2="4" stroke="#64748b" strokeWidth="2" />
              <line x1="2" y1="10" x2="32" y2="10" stroke="#64748b" strokeWidth="2" />
            </svg>
            Double bond
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="34" height="14">
              <line x1="2" y1="2" x2="32" y2="2" stroke="#64748b" strokeWidth="2" />
              <line x1="2" y1="7" x2="32" y2="7" stroke="#64748b" strokeWidth="2" />
              <line x1="2" y1="12" x2="32" y2="12" stroke="#64748b" strokeWidth="2" />
            </svg>
            Triple bond
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="34" height="14"><line x1="2" y1="7" x2="32" y2="7" stroke="#64748b" strokeWidth="2" /></svg>
            Covalent (solid)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="34" height="14"><line x1="2" y1="7" x2="32" y2="7" stroke="#64748b" strokeWidth="2" strokeDasharray="5,4" /></svg>
            Ionic (dashed)
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="clb-btn"
            style={{ fontSize: 12, padding: "7px 14px", background: "#2563eb", borderColor: "#2563eb", color: "#fff" }}
            onClick={onDismiss}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
