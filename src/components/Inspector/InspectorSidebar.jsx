import { formatFormulaUnicode } from "../../chemistry/equationBuilder";

function getHazardClassification(formulaStr) {
  if (!formulaStr) return "Unknown";
  // Strip coefficient, whitespace, and charge
  const clean = formulaStr.replace(/^[0-9]+/, "").replace(/\s+/g, "").replace(/\^.*/, "").replace(/[\+\-]/g, "");

  const hazardMap = {
    // Safe
    "H2O": "Safe",
    "NaCl": "Safe",
    "CO2": "Safe",
    "O2": "Safe",
    "N2": "Safe",
    "He": "Safe",
    "C": "Safe",
    "Fe": "Safe",
    "Cu": "Safe",
    "Au": "Safe",
    "Ag": "Safe",
    "SiO2": "Safe",
    "C6H12O6": "Safe",

    // Caution
    "H2": "Caution",
    "NaHCO3": "Safe",
    "Na2CO3": "Caution",
    "CuSO4": "Caution",
    "BaSO4": "Caution",
    "NH3": "Caution",
    "CH4": "Caution",
    "C2H5OH": "Caution",
    "I2": "Caution",
    "KBr": "Caution",
    "KI": "Caution",
    "LiCl": "Caution",

    // Hazardous
    "Na": "Hazardous",
    "K": "Hazardous",
    "Li": "Hazardous",
    "Cl2": "Hazardous",
    "CO": "Hazardous",
    "HCl": "Hazardous",
    "NaOH": "Hazardous",
    "KOH": "Hazardous",
    "H2SO4": "Hazardous",
    "HNO3": "Hazardous",
    "HCN": "Hazardous",
    "U": "Hazardous",
    "Pu": "Hazardous",
    "Th": "Hazardous",
    "NO2": "Hazardous",
    "HF": "Hazardous",
  };

  if (hazardMap[clean]) return hazardMap[clean];
  if (clean.includes("U") || clean.includes("Pu") || clean.includes("Th")) return "Hazardous";
  if (clean.includes("HF") || clean.includes("CN") || clean.includes("CO")) return "Hazardous";
  return "Unknown";
}

// Left sidebar component managing Lab Notebook (independent scroll) and Atom Inspector (fixed bottom).
export default function InspectorSidebar({
  selEl, selBondCount, selMolecule,
  removeSelected, counts,
  currentMolecules = [], experimentHistory = [],
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      
      {/* Section 2: Lab Notebook (Scrolling area) */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingRight: 4,
        margin: "12px 0 16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>📓</span>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 1.2 }}>LAB NOTEBOOK</div>
        </div>

        {/* Current Experiment */}
        <div style={{ background: "var(--clb-sidebar-header-bg)", border: "1px solid var(--clb-sidebar-header-border)", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 1, marginBottom: 8 }}>CURRENT EXPERIMENT</div>
          {currentMolecules.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--clb-text-muted)", fontStyle: "italic" }}>Empty canvas (add atoms or molecules)</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {currentMolecules.map((mol, idx) => (
                <div key={idx} style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  color: "var(--clb-text-primary)",
                  background: "var(--clb-notebook-item-bg)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--clb-notebook-item-border)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                }}>
                  {formatFormulaUnicode(mol)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experiment History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 1 }}>EXPERIMENT HISTORY</div>
          {experimentHistory.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--clb-text-muted)", fontStyle: "italic", background: "var(--clb-sidebar-header-bg)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--clb-sidebar-header-border)" }}>
              No reaction history yet. Click Start when reactants are ready.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {experimentHistory.map((exp) => (
                <div key={exp.id} style={{
                  background: "var(--clb-notebook-item-bg)",
                  border: "1px solid var(--clb-notebook-item-border)",
                  borderRadius: 10,
                  padding: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb" }}>Experiment #{exp.number}</div>
                  
                  {/* Reactants */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 0.5 }}>REACTANTS</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {exp.reactants.map((r, i) => (
                        <span key={i} style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "'Space Mono', monospace",
                          color: "var(--clb-text-primary)",
                          background: "var(--clb-bg-canvas)",
                          padding: "2px 6px",
                          borderRadius: 4
                        }}>{formatFormulaUnicode(r)}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: 12, alignSelf: "center", fontWeight: "bold" }}>↓</div>

                  {/* Products */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 0.5 }}>PRODUCTS</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {exp.products.map((p, i) => {
                        const hazard = getHazardClassification(p);
                        let hzBg = "var(--clb-bg-canvas)", hzColor = "var(--clb-text-secondary)", hzBorder = "var(--clb-border)";
                        if (hazard === "Safe") {
                          hzBg = "#f0fdf4"; hzColor = "#166534"; hzBorder = "#bbf7d0";
                        } else if (hazard === "Caution") {
                          hzBg = "#fffbeb"; hzColor = "#9a3412"; hzBorder = "#fde68a";
                        } else if (hazard === "Hazardous") {
                          hzBg = "#fef2f2"; hzColor = "#991b1b"; hzBorder = "#fca5a5";
                        }

                        return (
                           <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: "'Space Mono', monospace",
                              color: "var(--clb-text-primary)"
                            }}>{formatFormulaUnicode(p)}</span>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              background: hzBg,
                              color: hzColor,
                              border: `1px solid ${hzBorder}`,
                              padding: "2px 6px",
                              borderRadius: 4,
                              textTransform: "uppercase"
                            }}>{hazard}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Explanation */}
                  <div style={{ borderTop: "1px solid var(--clb-border)", paddingTop: 8, marginTop: 2 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--clb-text-secondary)", letterSpacing: 0.5, marginBottom: 2 }}>AI EXPLANATION</div>
                    <div style={{ fontSize: 11.5, color: "var(--clb-text-secondary)", lineHeight: 1.4 }}>{exp.fact}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Atom Inspector (Fixed bottom) */}
      {selEl ? (
        <div style={{
          flexShrink: 0,
          marginBottom: 12,
          marginTop: 8,
          background: "var(--clb-bg-panel)",
          border: "1px solid var(--clb-border)",
          borderRadius: 14,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}>
          {/* Card header with element color accent */}
          <div style={{
            background: `linear-gradient(135deg, #${selEl.color.toString(16).padStart(6, "0")}18, #${selEl.color.toString(16).padStart(6, "0")}08)`,
            borderBottom: `1px solid #${selEl.color.toString(16).padStart(6, "0")}20`,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 40, height: 40,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 10,
                background: `#${selEl.color.toString(16).padStart(6, "0")}20`,
                border: `2px solid #${selEl.color.toString(16).padStart(6, "0")}40`,
                fontSize: 20, fontWeight: 800,
                color: `#${selEl.color.toString(16).padStart(6, "0")}`,
                fontFamily: "'Space Mono', monospace",
              }}>{selEl.sym}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--clb-text-primary)" }}>{selEl.name}</div>
                <div style={{ fontSize: 11, color: "var(--clb-text-secondary)", fontWeight: 500 }}>Z = {selEl.z}</div>
              </div>
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: "var(--clb-text-secondary)",
              letterSpacing: 1.2, textTransform: "uppercase",
              background: "var(--clb-bg-canvas)", padding: "3px 8px", borderRadius: 6,
              border: "1px solid var(--clb-border)"
            }}>Inspector</div>
          </div>

          {/* Property rows */}
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Mass", `${selEl.mass} u`],
              ["Valence e⁻", selEl.valence],
              ["Electronegativity", selEl.en ?? "—"],
              ["Shell Config", selEl.shells.join("-")],
              ["Bond Count", selBondCount],
            ].map(([k, v], i, arr) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--clb-border)" : "none",
              }}>
                <span style={{ fontSize: 12, color: "var(--clb-text-secondary)", fontWeight: 500 }}>{k}</span>
                <span style={{
                  fontSize: 12.5, color: "var(--clb-text-primary)",
                  fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  background: "var(--clb-bg-canvas)", padding: "2px 8px", borderRadius: 5,
                }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Remove button */}
          <div style={{ padding: "0 14px 12px" }}>
            <button
              onClick={removeSelected}
              style={{
                width: "100%",
                padding: "9px 0",
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
                color: "#dc2626",
                background: "linear-gradient(to bottom, #fff5f5, #fee2e2)",
                border: "1px solid #fca5a5",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(220, 38, 38, 0.08)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(220,38,38,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(to bottom, #fff5f5, #fee2e2)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(220,38,38,0.08)"; }}
            >
              🗑️ Remove Selected
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
