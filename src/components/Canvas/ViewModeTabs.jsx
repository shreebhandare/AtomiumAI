/**
 * ViewModeTabs.jsx
 * Bohr / 2D (Simple) / 3D tab switcher displayed above the canvas.
 */
export default function ViewModeTabs({
  visualMode,
  setVisualMode,
  mode,
  startReaction,
  clearAll,
}) {
  const tabs = [
    { id: "bohr", label: "⚛ Bohr", title: "Electron shell (Bohr) view" },
    { id: "simple", label: "⬡ 2D", title: "Structural 2D bond view" },
    { id: "3d", label: "🔬 3D", title: "Interactive 3D molecular view" },
  ];

  const isRunning = mode === "running";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        height: 48,
        minHeight: 48,
        padding: "0 12px",
        background: "var(--clb-bg-panel)",
        borderBottom: "1px solid var(--clb-border)",
        flexShrink: 0,
      }}
      role="tablist"
      aria-label="Visualization mode"
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: "700",
          color: "var(--clb-text-muted)",
          letterSpacing: "0.8px",
          marginRight: "8px",
          textTransform: "uppercase",
        }}
      >
        View
      </span>
      <div id="view-mode-tabs" style={{ display: "flex", gap: "2px" }}>
        {tabs.map((tab) => {
          const isActive = visualMode === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`canvas-panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setVisualMode(tab.id)}
              title={tab.title}
              style={{
                padding: "5px 14px",
                fontSize: "12.5px",
                fontWeight: "600",
                fontFamily: "inherit",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: isActive ? "#2563eb" : "transparent",
                color: isActive ? "#ffffff" : "var(--clb-text-secondary)",
                boxShadow: isActive ? "0 2px 6px rgba(37,99,235,0.25)" : "none",
                outline: "none",
              }}
              onFocus={(e) => {
                if (!isActive) e.currentTarget.style.outline = "2px solid #3b82f6";
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = "none";
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* Spacer to push controls to the right */}
      <div style={{ flex: 1 }} />

      {/* Actions container matching the layout request */}
      <div id="hud-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Start / Stop */}
        <button
          id="hud-start-stop"
          className="clb-btn"
          style={{
            background: isRunning ? "#dc2626" : "#16a34a",
            borderColor: isRunning ? "#dc2626" : "#16a34a",
            color: "#ffffff",
            padding: "6px 12px",
            fontSize: "12.5px",
            fontWeight: 600,
          }}
          onClick={startReaction}
          title={isRunning ? "Stop reaction" : "Start reaction"}
        >
          {isRunning ? "⏹ Stop Reaction" : "▶ Start Reaction"}
        </button>

        {/* Clear */}
        <button
          id="hud-clear"
          className="clb-btn"
          style={{
            padding: "6px 12px",
            fontSize: "12.5px",
            fontWeight: 600,
          }}
          onClick={clearAll}
          title="Clear canvas"
        >
          🗑 Clear Canvas
        </button>
      </div>
    </div>
  );
}
