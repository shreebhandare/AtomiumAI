export default function HeaderBar({
  mode,
  setMode,
  startReaction,
  clearAll,
  searchOnline,
  toggleSearchOnline,
  equationMode,
  setEquationMode,
  settingsOpen,
  setSettingsOpen,
  useAI,
  toggleUseAI,
  visualMode,
  setVisualMode,
  theme,
  setTheme,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        background: "var(--clb-bg-header)",
        borderBottom: "1px solid var(--clb-border)",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Title / Logo Container */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "conic-gradient(#3b82f6,#8b5cf6,#ef4444,#10b981,#3b82f6)",
          }}
        />
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: -0.2,
            color: "var(--clb-text-primary)",
          }}
        >
          ChemLab <span style={{ color: "#2563eb" }}>AI</span>
        </span>
      </div>

      {/* Central Visualization Tabs (Moved from Canvas Area for Maximized Space) */}
      <div style={{
        display: "flex",
        background: "var(--clb-bg-canvas)",
        padding: 3,
        borderRadius: 10,
        border: "1px solid var(--clb-border)",
        gap: 2,
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}>
        {[
          { id: "bohr", label: "Bohr Model" },
          { id: "simple", label: "Simple 2D" },
          { id: "3d", label: "3D Model" }
        ].map((tab) => {
          const isActive = visualMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setVisualMode(tab.id)}
              style={{
                padding: "6px 14px",
                fontSize: "12.5px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#2563eb" : "var(--clb-text-secondary)",
                background: isActive ? "var(--clb-bg-panel)" : "transparent",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                transition: "all 0.15s ease",
                fontFamily: "inherit",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--clb-bg-hover)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Center/Right Control buttons */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          className="clb-btn"
          onClick={clearAll}
          style={{
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 600,
          }}
          title="Clear all atoms and molecules from the canvas"
        >
          🗑 Clear
        </button>

        {mode === "setup" ? (
          <button
            className="clb-btn"
            style={{
              background: "#16a34a",
              borderColor: "#16a34a",
              color: "#fff",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
            }}
            onClick={startReaction}
          >
            ▶ Start
          </button>
        ) : (
          <button
            className="clb-btn"
            style={{
              background: "#dc2626",
              borderColor: "#dc2626",
              color: "#fff",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
            }}
            onClick={() => setMode("setup")}
          >
            ⏹ Stop
          </button>
        )}

        <div style={{ width: 1, height: 20, background: "var(--clb-border)", margin: "0 4px" }} />

        {/* Settings button */}
        <button
          className="clb-btn"
          onClick={() => setSettingsOpen(true)}
          style={{
            padding: "8px 12px",
            fontSize: "18px",
            background: "transparent",
            borderColor: "transparent",
            boxShadow: "none",
            color: "var(--clb-text-secondary)",
            transition: "transform 0.2s ease, color 0.2s ease",
            cursor: "pointer",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "var(--clb-text-primary)";
            e.currentTarget.style.transform = "rotate(30deg)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "var(--clb-text-secondary)";
            e.currentTarget.style.transform = "rotate(0deg)";
          }}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Unified Settings Modal */}
      {settingsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalSlideUp {
              from { transform: translateY(12px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
              padding: "24px 28px",
              width: 400,
              maxWidth: "90%",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              animation: "modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0f172a",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Settings
              </div>
              <button
                className="clb-btn"
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
                onClick={() => setSettingsOpen(false)}
                title="Close settings"
              >
                ✕
              </button>
            </div>

            {/* USE AI TOGGLE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1, paddingRight: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>🤖 Use AI</div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                    Enable AI-powered chemistry assistant for natural language help and reaction suggestions.
                  </div>
                </div>
                <button
                  className="clb-btn"
                  onClick={toggleUseAI}
                  style={{
                    fontSize: 12,
                    padding: "6px 14px",
                    minWidth: 56,
                    background: useAI ? "#10b981" : "#f1f5f9",
                    borderColor: useAI ? "#10b981" : "#cbd5e1",
                    color: useAI ? "#ffffff" : "#475569",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                >
                  {useAI ? "Yes" : "No"}
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: "#f1f5f9" }} />

            {/* SEARCH ONLINE CONFIG */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1, paddingRight: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>🌐 Search Online</div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                    Query PubChem for active compound and reaction lookups. When off, uses cache only.
                  </div>
                </div>
                <button
                  className="clb-btn"
                  onClick={toggleSearchOnline}
                  style={{
                    fontSize: 12,
                    padding: "6px 14px",
                    minWidth: 56,
                    background: searchOnline ? "#10b981" : "#f1f5f9",
                    borderColor: searchOnline ? "#10b981" : "#cbd5e1",
                    color: searchOnline ? "#ffffff" : "#475569",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                >
                  {searchOnline ? "Yes" : "No"}
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: "#f1f5f9" }} />

            {/* REACTION EQUATION MODE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>⚗️ Reaction Equation Mode</div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                  Controls how the equation is displayed in the Reactions Bar.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  className="clb-btn"
                  onClick={() => setEquationMode("experiment")}
                  style={{
                    fontSize: 12,
                    padding: "6px 12px",
                    background: equationMode === "experiment" ? "#2563eb" : "#f1f5f9",
                    borderColor: equationMode === "experiment" ? "#2563eb" : "#cbd5e1",
                    color: equationMode === "experiment" ? "#ffffff" : "#475569",
                    fontWeight: 600,
                  }}
                >
                  Experiment
                </button>
                <button
                  className="clb-btn"
                  onClick={() => setEquationMode("standard")}
                  style={{
                    fontSize: 12,
                    padding: "6px 12px",
                    background: equationMode === "standard" ? "#2563eb" : "#f1f5f9",
                    borderColor: equationMode === "standard" ? "#2563eb" : "#cbd5e1",
                    color: equationMode === "standard" ? "#ffffff" : "#475569",
                    fontWeight: 600,
                  }}
                >
                  Standard Chemistry
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: "#f1f5f9" }} />

            {/* APPLICATION THEME */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>🎨 App Theme</div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                  Select the color palette for your lab workbench.
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {[
                  { id: "light", label: "Light" },
                  { id: "dawn", label: "Dawn" },
                  { id: "dark", label: "Dark" },
                  { id: "grey", label: "Grey" }
                ].map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      className="clb-btn"
                      onClick={() => setTheme(t.id)}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        padding: "6px 12px",
                        background: isActive ? "#2563eb" : "#f1f5f9",
                        borderColor: isActive ? "#2563eb" : "#cbd5e1",
                        color: isActive ? "#ffffff" : "#475569",
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 8,
                borderTop: "1px solid #f1f5f9",
                paddingTop: 14,
              }}
            >
              <button
                className="clb-btn"
                style={{
                  fontSize: 12.5,
                  padding: "8px 20px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  borderColor: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                }}
                onClick={() => setSettingsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
