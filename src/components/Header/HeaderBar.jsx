import { useState } from "react";
import { useUIStore } from "../../stores/UIStore";

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
  materialFinish,
  setMaterialFinish,
}) {
  const [activeTab, setActiveTab] = useState("general");
  const { setTutorialActive, setTutorialStep } = useUIStore();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        background: "var(--clb-bg-panel)",
        borderBottom: "1px solid var(--clb-border)",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Title / Logo Container */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={theme === "dark" || theme === "grey" ? "/logo_dark.png" : "/logo_light.png"}
          alt="AtomiumAI Logo"
          style={{
            width: 28,
            height: 28,
            objectFit: "contain",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: -0.2,
              color: "var(--clb-text-primary)",
            }}
          >
            Atomium <span style={{ color: "#2563eb" }}>AI</span>
          </span>
          <span style={{ fontSize: "11px", color: "var(--clb-text-secondary)", marginTop: "-2px" }}>
            AI based chemistry canvas - Atomium
          </span>
        </div>
      </div>
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
              width: 600,
              height: 400,
              maxWidth: "95%",
              maxHeight: "90%",
              display: "flex",
              flexDirection: "column",
              animation: "modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #f1f5f9",
                padding: "16px 24px",
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

            {/* Content Area with Sidebar and Main display */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Sidebar */}
              <div
                style={{
                  width: 180,
                  background: "#f8fafc",
                  borderRight: "1px solid #f1f5f9",
                  padding: "16px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  { id: "general", label: "🌐 General" },
                  { id: "appearance", label: "🎨 Appearance" },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: "10px 14px",
                        fontSize: "13px",
                        fontWeight: isActive ? 600 : 500,
                        textAlign: "left",
                        border: "none",
                        borderRadius: 8,
                        background: isActive ? "#e2e8f0" : "transparent",
                        color: isActive ? "#0f172a" : "#64748b",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Main Content Area */}
              <div
                style={{
                  flex: 1,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  overflowY: "auto",
                }}
              >
                {activeTab === "general" && (
                  <>
                    {/* SEARCH ONLINE CONFIG */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ flex: 1, paddingRight: 16 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>🌐 Search Online</div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                            Query online databases for active compound and reaction lookups. When off, uses cache only.
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

                    {/* INTERACTIVE TUTORIAL */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ flex: 1, paddingRight: 16 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>📖 Help & Tutorial</div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                            Launch the step-by-step interactive tour to learn how to use the chemistry simulator.
                          </div>
                        </div>
                        <button
                          className="clb-btn"
                          onClick={() => {
                            setTutorialActive(true);
                            setTutorialStep(0);
                            setSettingsOpen(false);
                          }}
                          style={{
                            fontSize: 12,
                            padding: "6px 14px",
                            background: "#2563eb",
                            borderColor: "#2563eb",
                            color: "#ffffff",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          Start Tutorial
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "appearance" && (
                  <>
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

                    <div style={{ height: 1, background: "#f1f5f9" }} />

                    {/* 3D MATERIAL FINISH */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ flex: 1, paddingRight: 16 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>✨ 3D Material Finish</div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                          Toggle between glossy (shiny reflections) and matte (flat, diffuse) surfaces in 3D view.
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button
                          className="clb-btn"
                          onClick={() => setMaterialFinish("glossy")}
                          style={{
                            fontSize: 12,
                            padding: "6px 12px",
                            background: materialFinish === "glossy" ? "#2563eb" : "#f1f5f9",
                            borderColor: materialFinish === "glossy" ? "#2563eb" : "#cbd5e1",
                            color: materialFinish === "glossy" ? "#ffffff" : "#475569",
                            fontWeight: 600,
                          }}
                        >
                          ✨ Glossy
                        </button>
                        <button
                          className="clb-btn"
                          onClick={() => setMaterialFinish("matte")}
                          style={{
                            fontSize: 12,
                            padding: "6px 12px",
                            background: materialFinish === "matte" ? "#2563eb" : "#f1f5f9",
                            borderColor: materialFinish === "matte" ? "#2563eb" : "#cbd5e1",
                            color: materialFinish === "matte" ? "#ffffff" : "#475569",
                            fontWeight: 600,
                          }}
                        >
                          🪨 Matte
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                borderTop: "1px solid #f1f5f9",
                padding: "16px 24px",
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
