import { useMemo, useState } from "react";
import { ELEMENTS, getGroupStyles } from "../../data/elements";

// Draggable periodic-table tray. Dragging a cell onto the canvas sets the
// "symbol" dataTransfer key that the canvas's onDrop handler reads.
//
// Upgrade #1 (Instant element search): typing filters+highlights matching
// cells live (by symbol or name), and Enter spawns the top match onto the
// canvas directly — the keyboard equivalent of dragging it, since native
// HTML5 drag-and-drop has no keyboard-triggerable path.
//
// Presentational — hover-tooltip state and the actual canvas-spawn action
// live in AtomiumCanvas; this component just reports the selection up.
export default function PeriodicTablePalette({ setHoveredElement, onSelectElement }) {
  const [search, setSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(true);

  const query = search.trim().toLowerCase();
  const matchedSyms = useMemo(() => {
    if (!query) return new Set();
    return new Set(
      ELEMENTS
        .filter((el) => el.sym.toLowerCase().includes(query) || el.name.toLowerCase().includes(query))
        .map((el) => el.sym)
    );
  }, [query]);

  // First match in atomic-number order is what Enter will select.
  const topMatch = useMemo(() => {
    if (!query) return null;
    return ELEMENTS.find((el) => matchedSyms.has(el.sym)) || null;
  }, [query, matchedSyms]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && topMatch) {
      onSelectElement?.(topMatch.sym);
      setSearch("");
    } else if (e.key === "Escape") {
      setSearch("");
    }
  };

  return (
    <div style={{
      background: "var(--clb-bg-canvas)",
      borderTop: "1px solid var(--clb-border)",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      width: "100%",
      transition: "background 0.3s ease, border-color 0.3s ease",
    }}>
      {/* Clickable Header — toggles expand/collapse */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0",
          background: "var(--clb-bg-panel)",
          cursor: "pointer",
          userSelect: "none",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--clb-bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--clb-bg-panel)"; }}
        title={isCollapsed ? "Expand Periodic Table" : "Collapse Periodic Table"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🧪</span>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--clb-text-primary)" }}>Periodic Table</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--clb-text-secondary)", fontWeight: 600, letterSpacing: 0.5 }}>
          {isCollapsed ? "▼" : "▲"}
        </span>
      </div>

      {/* Expandable/Collapsible Content Area */}
      <div style={{
        maxHeight: isCollapsed ? "0px" : "600px",
        opacity: isCollapsed ? 0 : 1,
        overflow: "hidden",
        overflowX: "auto",
        transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out, padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        padding: isCollapsed ? "0px 24px" : "14px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, maxWidth: 290 }}>
          <span style={{ fontSize: 13 }}>🔎</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search elements (e.g. Fe, Iron)..."
            title="Type to highlight matches; press Enter to add the top match to the canvas"
            style={{
              flex: 1,
              fontSize: 12,
              padding: "5px 9px",
              borderRadius: 8,
              border: "1px solid var(--clb-border-accent)",
              background: "var(--clb-bg-panel)",
              color: "var(--clb-text-primary)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              className="clb-btn"
              style={{ padding: "4px 8px", fontSize: 10.5 }}
              onClick={(e) => { e.stopPropagation(); setSearch(""); }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {/* 90% scaled grid — reclaims ~10% vertical space */}
        <div style={{ transform: "scale(0.9)", transformOrigin: "top left", width: "111.11%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(18, minmax(32px, 1fr))", gridTemplateRows: "repeat(10, auto)", gap: "3px", minWidth: "600px", paddingBottom: 4 }}>
          {ELEMENTS.map((el) => {
            const groupStyle = getGroupStyles(el.group);
            const isMatch = query !== "" && matchedSyms.has(el.sym);
            const isTopMatch = topMatch?.sym === el.sym;
            const dimmed = query !== "" && !isMatch;
            return (
              <div
                key={el.sym}
                className="clb-elem"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("symbol", el.sym)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredElement({
                    el,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 6
                  });
                }}
                onMouseLeave={() => setHoveredElement(null)}
                style={{
                  gridRow: el.row,
                  gridColumn: el.col,
                  padding: "4px 2px 3px",
                  textAlign: "center",
                  borderRadius: 6,
                  background: groupStyle.bg,
                  border: isTopMatch ? "2px solid #2563eb" : `1px solid ${groupStyle.border}`,
                  boxShadow: isTopMatch
                    ? "0 0 0 3px rgba(37,99,235,0.25)"
                    : isMatch
                    ? "0 0 0 2px rgba(37,99,235,0.35)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  opacity: dimmed ? 0.35 : 1,
                  transition: "opacity 0.12s ease, box-shadow 0.12s ease",
                  cursor: "grab"
                }}
              >
                {/* Cell content */}
                <div style={{ fontSize: 7, fontWeight: "700", color: groupStyle.text, textAlign: "left", lineHeight: 1, paddingLeft: 2 }}>{el.z}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: groupStyle.text, fontFamily: "'Space Mono', monospace", lineHeight: 1.15 }}>{el.sym}</div>
                <div style={{ fontSize: 6, fontWeight: "600", color: groupStyle.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>{el.name}</div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
