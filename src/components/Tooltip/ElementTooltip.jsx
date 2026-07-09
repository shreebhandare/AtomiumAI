import { getGroupStyles } from "../../data/elements";

// Fixed-position element tooltip shown on periodic-table hover. Rendered at the
// viewport level (not inside any scrolling container) to avoid layout shift.
export default function ElementTooltip({ hoveredElement }) {
  if (!hoveredElement) return null;
  return (
        <div style={{
          position: "fixed",
          left: hoveredElement.x,
          top: hoveredElement.y,
          transform: "translate(-50%, -100%)",
          background: "#ffffff",
          border: `1px solid ${getGroupStyles(hoveredElement.el.group).border}`,
          borderRadius: 10,
          padding: "10px 14px",
          minWidth: 120,
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          pointerEvents: "none",
          color: "#0f172a",
          fontSize: 11.5,
          zIndex: 999999,
          animation: "pulse 1.5s infinite"
        }}>
          {/* Small triangle arrow pointer */}
          <div style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            border: "6px solid transparent",
            borderTopColor: getGroupStyles(hoveredElement.el.group).border
          }} />
          <div style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%) translate(0, -1px)",
            border: "6px solid transparent",
            borderTopColor: "#ffffff"
          }} />

          <div style={{ fontSize: 9.5, color: "#64748b", fontWeight: 700, marginBottom: 2 }}>{hoveredElement.el.z}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: getGroupStyles(hoveredElement.el.group).text, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{hoveredElement.el.sym}</div>
          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>{hoveredElement.el.name}</div>
          <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 3, fontFamily: "'Space Mono', monospace" }}>{hoveredElement.el.mass} u</div>
          {/* Upgrade #4.1.2: shell electron-configuration breakdown, shown when
              hovering an atom already placed on the canvas in Bohr mode. */}
          {hoveredElement.shells && (
            <div style={{
              marginTop: 7, paddingTop: 6, borderTop: "1px solid #e2e8f0",
              fontSize: 10, color: "#334155", fontFamily: "'Space Mono', monospace",
            }}>
              <div style={{ fontSize: 8.5, color: "#94a3b8", fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>SHELLS</div>
              {hoveredElement.shells.join(", ")}
            </div>
          )}
        </div>
  );
}
