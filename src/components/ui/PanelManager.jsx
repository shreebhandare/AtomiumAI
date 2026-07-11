import React from "react";
import { Rnd } from "react-rnd";
import { usePanelStore } from "../../stores/PanelStore";
import PanelTitleBar from "./PanelTitleBar";

export default function PanelManager({ panelContents }) {
  const { panels, updatePanel, focusPanel, activePanelId } = usePanelStore();

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {Object.values(panels).map((panel) => {
        if (!panel.active) return null;

        const isFocused = activePanelId === panel.id;
        const content = panelContents[panel.id];

        if (!content) return null;

        return (
          <Rnd
            key={panel.id}
            size={{
              width: panel.width,
              height: panel.collapsed ? 36 : panel.height
            }}
            position={{ x: panel.x, y: panel.y }}
            onDragStop={(e, d) => {
              updatePanel(panel.id, { x: d.x, y: d.y });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              updatePanel(panel.id, {
                width: parseInt(ref.style.width, 10),
                height: parseInt(ref.style.height, 10),
                ...position
              });
            }}
            dragHandleClassName="panel-title-bar"
            cancel=".no-drag"
            bounds="parent"
            style={{
              zIndex: panel.zIndex || 1,
              display: "flex",
              flexDirection: "column",
              background: "var(--clb-bg-panel)",
              border: isFocused ? "1px solid #3b82f6" : "1px solid var(--clb-border)",
              boxShadow: isFocused ? "0 4px 20px rgba(59, 130, 246, 0.15)" : "0 4px 12px rgba(0, 0, 0, 0.08)",
              borderRadius: "8px",
              overflow: "hidden",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseDown={() => focusPanel(panel.id)}
            disableDragging={panel.collapsed}
            enableResizing={!panel.collapsed}
          >
            <PanelTitleBar
              title={panel.id.charAt(0).toUpperCase() + panel.id.slice(1)}
              isActive={isFocused}
              isCollapsed={panel.collapsed}
              onCollapse={() => updatePanel(panel.id, { collapsed: !panel.collapsed })}
              onRemove={() => updatePanel(panel.id, { active: false })}
            />
            {!panel.collapsed && (
              <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                {content}
              </div>
            )}
          </Rnd>
        );
      })}
    </div>
  );
}
