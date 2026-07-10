import { useRef } from "react";
import { parseFormula, expandFormulaToAtoms, normalizeFormulaInput } from "../../formulaParser";

// The chemical-formula entry card: validated text input, live atom-count preview,
// and the Spawn Atoms button. Presentational — all state lives in AtomiumCanvas.
export default function FormulaInput({ formulaInput, setFormulaInput, spawnAtomsFromFormula }) {
  const inputRef = useRef(null);

  const handleSpawn = () => {
    spawnAtomsFromFormula();
    // Upgrade #3.7: keep keyboard focus on the input after a successful add.
    inputRef.current?.focus();
  };

  // Chemical Formula Input Card
  return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 1.2 }}>CHEMICAL FORMULA</div>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "var(--clb-bg-card)",
              border: formulaInput && (() => { const p = parseFormula(formulaInput); return p.isValid ? "1px solid #22c55e" : "1px solid #f87171"; })() || "1px solid var(--clb-border-accent)",
              borderRadius: 8,
              padding: "2px 8px 2px 10px",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
              transition: "border-color 0.2s"
            }}>
              <span style={{ fontSize: 15, marginRight: 8, userSelect: "none" }}>🧪</span>
              <input
                ref={inputRef}
                type="text"
                value={formulaInput}
                onChange={(e) => setFormulaInput(normalizeFormulaInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSpawn();
                  }
                }}
                placeholder="H2O, NaCl, Ca(OH)2..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--clb-text-primary)",
                  fontSize: 14.5,
                  fontWeight: "500",
                  padding: "6px 0",
                  fontFamily: "'Space Grotesk', sans-serif"
                }}
              />
              {formulaInput && (
                <button
                  onClick={() => setFormulaInput("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 15,
                    padding: "2px 4px"
                  }}
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Atom count preview when formula is valid */}
            {formulaInput && (() => {
              const parsed = parseFormula(formulaInput);
              if (!parsed.isValid) return (
                <div style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: 12,
                  fontWeight: "600",
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "1px solid #fca5a5",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}>
                  <span>⚠️</span>
                  <span>{parsed.error}</span>
                </div>
              );
              const atoms = expandFormulaToAtoms(formulaInput);
              return (
                <div style={{
                  background: "#f0fdf4",
                  color: "#15803d",
                  fontSize: 12,
                  fontWeight: "600",
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "1px solid #86efac",
                  display: "flex",
                  alignItems: "center",
                  gap: 5
                }}>
                  <span>✓</span>
                  <span>{atoms.length} atom{atoms.length !== 1 ? "s" : ""} — press Enter or Spawn</span>
                </div>
              );
            })()}

            {/* Spawn Atoms button */}
            <button
              onClick={handleSpawn}
              disabled={!formulaInput || !parseFormula(formulaInput).isValid}
              style={{
                background: formulaInput && parseFormula(formulaInput).isValid
                  ? "linear-gradient(135deg, #2563eb, #4f46e5)"
                  : "#e2e8f0",
                color: formulaInput && parseFormula(formulaInput).isValid ? "#fff" : "#94a3b8",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: formulaInput && parseFormula(formulaInput).isValid ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "background 0.2s, transform 0.1s",
                boxShadow: formulaInput && parseFormula(formulaInput).isValid
                  ? "0 2px 8px rgba(37,99,235,0.3)"
                  : "none",
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: 0.3
              }}
              title="Spawn atoms from formula onto the canvas"
            >
              <span style={{ fontSize: 15 }}>⚗️</span>
              SPAWN ATOMS
            </button>
          </div>
  );
}
