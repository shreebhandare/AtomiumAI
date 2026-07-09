// "Reading bonds in Simple Mode" legend (Upgrade #4.2.3): explains bond
// notation — single/double/triple bond line-count, and dashed (ionic) vs
// solid (covalent) bond styling. Placed in a corner of the canvas.
export default function SimpleModeLegend() {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 20,
        background: "var(--clb-bg-panel, #ffffff)",
        border: "1px solid var(--clb-border, #e2e8f0)",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        pointerEvents: "none",
        width: 175,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "background 0.3s ease, border-color 0.3s ease",
        fontFamily: "'Space Grotesk', sans-serif"
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--clb-text-secondary, #64748b)", letterSpacing: 0.5 }}>
        SIMPLE MODE BONDS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--clb-text-primary, #334155)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.5" /></svg>
          <span>Single</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="10">
            <line x1="0" y1="3" x2="24" y2="3" stroke="#64748b" strokeWidth="1.5" />
            <line x1="0" y1="7" x2="24" y2="7" stroke="#64748b" strokeWidth="1.5" />
          </svg>
          <span>Double</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="10">
            <line x1="0" y1="2" x2="24" y2="2" stroke="#64748b" strokeWidth="1.2" />
            <line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.2" />
            <line x1="0" y1="8" x2="24" y2="8" stroke="#64748b" strokeWidth="1.2" />
          </svg>
          <span>Triple</span>
        </div>
        <div style={{ height: 1, background: "var(--clb-border, #f1f5f9)", margin: "2px 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.5" /></svg>
          <span>Covalent (Solid)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" /></svg>
          <span>Ionic (Dashed)</span>
        </div>
      </div>
    </div>
  );
}

