import { useRef, useCallback } from "react";

/**
 * A drag handle divider that enables panel resizing.
 * direction: "vertical" = left|right resize (col-resize cursor, vertical bar)
 *            "horizontal" = top|bottom resize (row-resize cursor, horizontal bar)
 * onDrag(delta): called with px delta during drag
 */
export default function ResizeDivider({ direction = "vertical", onDrag, style = {} }) {
  const dragging = useRef(false);
  const lastPos = useRef(0);
  const divRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = direction === "vertical" ? e.clientX : e.clientY;

    const onMove = (ev) => {
      if (!dragging.current) return;
      const curr = direction === "vertical" ? ev.clientX : ev.clientY;
      const delta = curr - lastPos.current;
      lastPos.current = curr;
      onDrag(delta);
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = direction === "vertical" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [direction, onDrag]);

  const isVertical = direction === "vertical";

  return (
    <div
      ref={divRef}
      onMouseDown={handleMouseDown}
      style={{
        flexShrink: 0,
        width: isVertical ? 5 : "100%",
        height: isVertical ? "100%" : 5,
        cursor: isVertical ? "col-resize" : "row-resize",
        background: "transparent",
        position: "relative",
        zIndex: 20,
        transition: "background 0.15s ease",
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.35)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      title="Drag to resize"
    >
      {/* Visual grip dots */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        gap: 3,
        pointerEvents: "none",
        opacity: 0.4,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: isVertical ? 2 : 4,
            height: isVertical ? 4 : 2,
            borderRadius: 2,
            background: "var(--clb-text-muted, #94a3b8)",
          }} />
        ))}
      </div>
    </div>
  );
}
