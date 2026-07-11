import { formatFormulaUnicode } from "../../chemistry/equationBuilder";

export default function ReactionsBar({ equation, currentMolecules = [], onRemoveMolecule }) {
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
      border: "1px solid var(--clb-border)",
      borderRadius: 12,
      padding: 14,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      transition: "background 0.3s ease, border-color 0.3s ease",
    }}>

      {/* Card heading — always CURRENT EXPERIMENT */}
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: "var(--clb-text-secondary)",
        letterSpacing: 1,
      }}>
        CURRENT EXPERIMENT
      </div>

      {/* Reactant molecule badges with × delete buttons */}
      {currentMolecules.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--clb-text-muted)", fontStyle: "italic" }}>
          Empty canvas (add atoms or molecules)
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {currentMolecules.map((mol, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
              color: "var(--clb-text-primary)",
              background: "var(--clb-bg-canvas)",
              padding: "5px 8px 5px 12px",
              borderRadius: 8,
              border: "1px solid var(--clb-border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}>
              {formatFormulaUnicode(mol)}
              {onRemoveMolecule && (
                <button
                  onClick={() => onRemoveMolecule(mol)}
                  title={`Remove ${mol}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontSize: 13,
                    lineHeight: 1,
                    color: "var(--clb-text-muted)",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#dc2626"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--clb-text-muted)"}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Divider between reactants and equation */}
      <div style={{ height: 1, background: "var(--clb-border)", margin: "2px 0" }} />

      {/* Sub-label for equation section */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: "var(--clb-text-muted)",
        letterSpacing: 1,
        textTransform: "uppercase",
      }}>
        {type === "success" ? "Reaction Equation" : type === "building" ? "Experiment State" : "Status"}
      </div>

      {/* Equation / status badge */}
      <div style={{
        fontFamily: (type === "success" || type === "building") ? "'Space Mono', monospace" : "inherit",
        fontSize: (type === "success" || type === "building") ? "15.5px" : "13.5px",
        fontWeight: 700,
        color: textColor,
        background: bgColor,
        padding: "8px 14px",
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        alignSelf: "flex-start",
        transition: "all 0.3s ease",
        boxShadow: isReaction ? "0 2px 4px rgba(37,99,235,0.06)" : "none",
        letterSpacing: "-0.2px",
        lineHeight: 1.45,
        wordBreak: "break-word",
      }}>
        {text}
      </div>
    </div>
  );
}
