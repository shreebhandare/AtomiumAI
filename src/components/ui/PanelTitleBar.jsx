import React from "react";

export default function PanelTitleBar({ title, onCollapse, isCollapsed, onRemove, isActive }) {
  return (
    <div
      className="panel-title-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "36px",
        padding: "0 12px",
        background: isActive ? "var(--clb-bg-card)" : "var(--clb-bg-panel)",
        borderBottom: `1px solid ${isActive ? "#3b82f6" : "var(--clb-border)"}`,
        cursor: "grab",
        userSelect: "none",
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Active state blue indicator dot */}
        {isActive && (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#3b82f6",
              boxShadow: "0 0 8px #3b82f6"
            }}
          />
        )}
        <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--clb-text-primary)" }}>
          {title}
        </span>
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }} className="no-drag">
        {onCollapse && (
          <button
            onClick={(e) => { e.stopPropagation(); onCollapse(); }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--clb-text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              padding: "4px"
            }}
            aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? "▲" : "▼"}
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--clb-text-muted)",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              padding: "4px"
            }}
            aria-label="Close panel"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
