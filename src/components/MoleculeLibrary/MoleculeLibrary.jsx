import { useState, useEffect } from "react";
import { listMoleculeIds, loadMolecule } from "../../services/SpawnService/SpawnService";
import { supabase } from "../../supabase";

/**
 * MoleculeLibrary.jsx
 * Displays all registered molecule presets and allows spawning them
 * via the onSpawn callback (passes the moleculeId or moleculeData to the parent).
 */
export default function MoleculeLibrary({ onSpawn }) {
  const [molecules, setMolecules] = useState([]);

  useEffect(() => {
    async function loadMolecules() {
      // 1. Load static local preset molecules
      const localIds = listMoleculeIds();
      const localPresets = await Promise.all(
        localIds.map(async (id) => {
          const data = await loadMolecule(id);
          return data ? { id, name: data.name, formula: data.id || id, atomCount: data.atoms?.length ?? 0, data } : null;
        })
      );
      const filteredPresets = localPresets.filter(Boolean);

      // Keep track of loaded formulas to prevent duplicates
      const loadedFormulas = new Set(filteredPresets.map(m => m.formula.toLowerCase()));

      // 2. Load cached molecules from Supabase reactions table
      const dbMolecules = [];
      try {
        const { data: dbRows, error } = await supabase
          .from("reactions")
          .select("formula, name, reactants, bonds, coords");

        if (!error && dbRows) {
          dbRows.forEach((row) => {
            const formulaKey = row.formula?.toLowerCase();
            if (formulaKey && !loadedFormulas.has(formulaKey) && row.reactants) {
              loadedFormulas.add(formulaKey);

              // Adapt database compound representation to expected molecule schema
              const adaptedMolecule = {
                version: 1,
                id: row.formula,
                name: row.name || row.formula,
                atoms: row.reactants.map((sym, idx) => {
                  const c = row.coords?.[idx];
                  return {
                    sym,
                    x: c ? c.x * 90 : (idx * 40 - (row.reactants.length * 20)),
                    y: c ? c.y * 90 : 0,
                  };
                }),
                bonds: (row.bonds || []).map((b) => ({
                  a: b.from + 1,
                  b: b.to + 1,
                  order: b.order || 1,
                })),
              };

              dbMolecules.push({
                id: row.formula,
                name: row.name || row.formula,
                formula: row.formula,
                atomCount: row.reactants.length,
                data: adaptedMolecule,
                isFromSupabase: true,
              });
            }
          });
        }
      } catch (err) {
        console.warn("[MoleculeLibrary] Could not fetch molecules from Supabase:", err.message);
      }

      setMolecules([...filteredPresets, ...dbMolecules]);
    }

    loadMolecules();
  }, []);

  return (
    <div style={{
      padding: "12px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <div style={{
        fontSize: "10px", fontWeight: "700",
        color: "var(--clb-text-muted)",
        letterSpacing: "1px", textTransform: "uppercase",
        marginBottom: "2px",
      }}>
        Molecule Library
      </div>

      <div style={{
        fontSize: "11px",
        color: "var(--clb-text-muted)",
        fontStyle: "italic",
        marginBottom: "4px",
      }}>
        Note: The molecules here are populated as you discover them through your practice in this app.
      </div>

      {molecules.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--clb-text-muted)", fontStyle: "italic" }}>
          Loading molecules...
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "8px",
        }}>
          {molecules.map(({ id, name, atomCount, data, isFromSupabase }) => (
            <button
              key={id}
              id={`mol-lib-${id}`}
              aria-label={`Spawn ${name} molecule`}
              onClick={() => onSpawn?.(data || id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "4px",
                padding: "10px 12px",
                background: "var(--clb-bg-card)",
                border: "1px solid var(--clb-border)",
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--clb-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--clb-text-primary)" }}>
                {name}
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--clb-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>{atomCount} atoms · {id}</span>
                {isFromSupabase && (
                  <span style={{ fontSize: "9px", background: "#eff6ff", color: "#2563eb", padding: "1px 5px", borderRadius: "4px", fontWeight: "700", border: "1px solid #dbeafe" }}>
                    Cloud
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}