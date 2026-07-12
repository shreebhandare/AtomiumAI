/**
 * CanvasHUD.jsx
 * Floating action buttons overlaid on the canvas for key simulation controls.
 * Props:
 *   mode        — "setup" | "running"
 *   startReaction  — fn
 *   clearAll       — fn
 *   fitAll         — fn
 *   resetView      — fn
 */
export default function CanvasHUD({ mode, startReaction, clearAll, fitAll, resetView }) {
  const btnBase = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "inherit",
    borderRadius: "8px",
    border: "1px solid var(--clb-border)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    background: "var(--clb-bg-panel)",
    color: "var(--clb-text-primary)",
    whiteSpace: "nowrap",
  };

  const isRunning = mode === "running";

  return (
    <div
      style={{
        position: "absolute",
        top: "12px",
        right: "52px",
        display: "flex",
        gap: "6px",
        zIndex: 20,
        alignItems: "center",
      }}
    >
      {/* Start / Stop */}
      <button
        id="hud-start-stop"
        aria-label={isRunning ? "Stop reaction simulation" : "Start reaction simulation"}
        style={{
          ...btnBase,
          background: isRunning ? "#dc2626" : "#16a34a",
          border: isRunning ? "1px solid #b91c1c" : "1px solid #15803d",
          color: "#ffffff",
          boxShadow: isRunning
            ? "0 2px 8px rgba(220,38,38,0.25)"
            : "0 2px 8px rgba(22,163,74,0.25)",
        }}
        onClick={startReaction}
        title={isRunning ? "Stop reaction" : "Start reaction"}
      >
        {isRunning ? "⏹ Stop Reaction" : "▶ Start Reaction"}
      </button>

      {/* Clear */}
      <button
        id="hud-clear"
        aria-label="Clear all atoms and bonds from canvas"
        style={btnBase}
        onClick={clearAll}
        title="Clear canvas"
      >
        🗑 Clear Canvas
      </button>

      {/* Fit All */}
      <button
        id="hud-fit"
        aria-label="Fit all molecules into the viewport"
        style={btnBase}
        onClick={fitAll}
        title="Fit all molecules in view"
      >
        ⛶ Fit
      </button>

      {/* Reset View */}
      <button
        id="hud-reset"
        aria-label="Reset canvas viewport to default zoom and pan"
        style={btnBase}
        onClick={resetView}
        title="Reset view (zoom & pan)"
      >
        ⌂ Reset
      </button>
    </div>
  );
}
