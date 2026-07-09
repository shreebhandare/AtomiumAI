export default function ReactionsBar({ equation }) {
  let type = "initial";
  let text = "Waiting for experiment...";

  if (equation && typeof equation === "object") {
    type = equation.type;
    text = equation.text;
  } else if (typeof equation === "string") {
    text = equation;
    if (text.includes("→")) {
      type = "success";
    } else if (text.includes("No") || text.includes("Error") || text.includes("Please") || text.includes("Could not")) {
      type = "warning";
    } else if (text.includes("Reactants") || text.includes("+")) {
      type = "building";
    }
  }

  const isReaction = type === "success";
  
  // Premium styling depending on type
  let textColor = "var(--clb-text-secondary)";
  let bgColor = "var(--clb-bg-canvas)";
  let borderColor = "var(--clb-border)";

  if (type === "success") {
    textColor = "#2563eb";
    bgColor = "#eff6ff";
    borderColor = "#bfdbfe";
  } else if (type === "warning") {
    textColor = "#dc2626";
    bgColor = "#fef2f2";
    borderColor = "#fecaca";
  } else if (type === "building") {
    textColor = "#0891b2";
    bgColor = "#ecfeff";
    borderColor = "#a5f3fc";
  }

  return (
    <div style={{
      background: "var(--clb-bg-panel)",
      borderTop: "1px solid var(--clb-border)",
      borderBottom: "1px solid var(--clb-border)",
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      minHeight: 52,
      boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.01)",
      transition: "background 0.3s ease, border-color 0.3s ease",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: 14.5,
        color: "var(--clb-text-primary)",
      }}>
        <span style={{ fontSize: 16 }}>⚗️</span>
        <span style={{ color: "var(--clb-text-secondary)", fontWeight: 500 }}>
          {type === "success" ? "Reaction Equation:" : type === "building" ? "Experiment State:" : "Status:"}
        </span>
        <span style={{
          fontFamily: (type === "success" || type === "building") ? "'Space Mono', monospace" : "inherit",
          fontSize: (type === "success" || type === "building") ? "15.5px" : "14px",
          fontWeight: 700,
          color: textColor,
          background: bgColor,
          padding: "6px 16px",
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          transition: "all 0.3s ease",
          boxShadow: isReaction ? "0 2px 4px rgba(37,99,235,0.06)" : "none",
          letterSpacing: "-0.2px",
        }}>
          {text}
        </span>
      </div>
    </div>
  );
}
