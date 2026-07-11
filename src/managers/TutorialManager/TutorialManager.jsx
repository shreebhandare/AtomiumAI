import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { TUTORIAL_STEPS } from "./tutorialSteps";
import { useUIStore } from "../../stores/UIStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const CARD_W = 360;
const CARD_PAD = 16; // gap between target edge and card edge
const ARROW_SIZE = 10; // half-size of the pointer triangle

// ─── Geometry helpers ─────────────────────────────────────────────────────────
/**
 * Compute the best placement side and card (x, y) so the card stays
 * fully inside the viewport. Prefers the `preferred` side, falls back
 * through the remaining sides in priority order.
 */
function computePlacement(targetRect, preferred) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const CARD_H_ESTIMATE = 280;

  const order = [preferred, "bottom", "top", "right", "left"].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  for (const side of order) {
    let x, y;
    switch (side) {
      case "top":
        x = targetRect.left + targetRect.width / 2 - CARD_W / 2;
        y = targetRect.top - CARD_PAD - CARD_H_ESTIMATE;
        break;
      case "bottom":
        x = targetRect.left + targetRect.width / 2 - CARD_W / 2;
        y = targetRect.bottom + CARD_PAD;
        break;
      case "right":
        x = targetRect.right + CARD_PAD;
        y = targetRect.top + targetRect.height / 2 - CARD_H_ESTIMATE / 2;
        break;
      case "left":
        x = targetRect.left - CARD_PAD - CARD_W;
        y = targetRect.top + targetRect.height / 2 - CARD_H_ESTIMATE / 2;
        break;
      default:
        x = vw / 2 - CARD_W / 2;
        y = vh / 2 - CARD_H_ESTIMATE / 2;
    }

    x = Math.max(12, Math.min(x, vw - CARD_W - 12));
    y = Math.max(12, Math.min(y, vh - CARD_H_ESTIMATE - 12));

    const fitsH = y >= 0 && y + CARD_H_ESTIMATE <= vh;
    const fitsW = x >= 0 && x + CARD_W <= vw;
    if (fitsH && fitsW) return { x, y, side };
  }

  return {
    x: Math.max(12, vw / 2 - CARD_W / 2),
    y: Math.max(12, vh / 2 - CARD_H_ESTIMATE / 2),
    side: "center",
  };
}

/** Arrow pointer triangle pointing from the card toward the target */
function ArrowPointer({ side, targetRect, placement, cardRect }) {
  if (!targetRect || !cardRect || side === "center") return null;

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  // Relative offsets from card top-left corner
  const relX = targetCenterX - placement.x;
  const relY = targetCenterY - placement.y;

  // Clamp arrow position within the card border boundary (offsetting by card rounded corners)
  const clampedRelX = Math.min(
    Math.max(24, relX - ARROW_SIZE),
    CARD_W - 24 - ARROW_SIZE * 2
  );
  const clampedRelY = Math.min(
    Math.max(24, relY - ARROW_SIZE),
    cardRect.height - 24 - ARROW_SIZE * 2
  );

  const base = {
    position: "absolute",
    width: 0,
    height: 0,
    pointerEvents: "none",
  };
  const color = "#3b82f6";

  switch (side) {
    case "bottom":
      return (
        <div style={{ ...base, top: -ARROW_SIZE, left: clampedRelX,
          borderLeft: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid transparent`,
          borderBottom: `${ARROW_SIZE}px solid ${color}` }} />
      );
    case "top":
      return (
        <div style={{ ...base, bottom: -ARROW_SIZE, left: clampedRelX,
          borderLeft: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid transparent`,
          borderTop: `${ARROW_SIZE}px solid ${color}` }} />
      );
    case "right":
      return (
        <div style={{ ...base, left: -ARROW_SIZE, top: clampedRelY,
          borderTop: `${ARROW_SIZE}px solid transparent`,
          borderBottom: `${ARROW_SIZE}px solid transparent`,
          borderRight: `${ARROW_SIZE}px solid ${color}` }} />
      );
    case "left":
      return (
        <div style={{ ...base, right: -ARROW_SIZE, top: clampedRelY,
          borderTop: `${ARROW_SIZE}px solid transparent`,
          borderBottom: `${ARROW_SIZE}px solid transparent`,
          borderLeft: `${ARROW_SIZE}px solid ${color}` }} />
      );
    default:
      return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TutorialManager({ onComplete }) {
  const { tutorialStep, setTutorialStep } = useUIStore();

  const step = TUTORIAL_STEPS[tutorialStep] ?? TUTORIAL_STEPS[0];
  const isLast = tutorialStep === TUTORIAL_STEPS.length - 1;
  const isFirst = tutorialStep === 0;

  const [targetRect, setTargetRect] = useState(null);
  const [placement, setPlacement] = useState({ x: 0, y: 0, side: "center" });
  const [cardRect, setCardRect] = useState(null);
  const [visible, setVisible] = useState(false);

  const cardRef = useRef(null);

  // Recompute target rect & card placement
  const recompute = useCallback(() => {
    const el = step.target ? document.getElementById(step.target) : null;

    if (!el) {
      setTargetRect(null);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPlacement({ x: vw / 2 - CARD_W / 2, y: vh / 2 - 150, side: "center" });
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    setPlacement(computePlacement(rect, step.position ?? "bottom"));
  }, [step]);

  // On step change: hide card + arrow → wait for CSS animations → recompute → show
  useEffect(() => {
    setVisible(false);
    setCardRect(null);   // kill stale arrow immediately
    setTargetRect(null); // kill stale highlight immediately

    // Wait long enough for CSS tray transitions (350ms) to finish before measuring
    const t1 = setTimeout(() => {
      recompute();
      setVisible(true);
    }, 450);

    // Safety re-measure in case layout settled after the first read
    const t2 = setTimeout(() => recompute(), 650);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [recompute]);

  // Recompute on resize / scroll
  useEffect(() => {
    const h = () => recompute();
    window.addEventListener("resize", h);
    window.addEventListener("scroll", h, true);
    return () => {
      window.removeEventListener("resize", h);
      window.removeEventListener("scroll", h, true);
    };
  }, [recompute]);

  // Measure the card for arrow positioning
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const obs = new ResizeObserver(() => {
      if (cardRef.current) setCardRect(cardRef.current.getBoundingClientRect());
    });
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, [placement]);

  const handleNext = () => {
    if (isLast) onComplete?.();
    else setTutorialStep((i) => i + 1);
  };

  const handlePrev = () => {
    setTutorialStep((i) => Math.max(0, i - 1));
  };

  // ── Backdrop with SVG cutout ────────────────────────────────────────────────
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const Backdrop = () => {
    if (!targetRect) {
      return (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.62)",
            zIndex: 10000,
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
          onClick={() => onComplete?.()}
        />
      );
    }

    const INSET = 6;
    const rx = targetRect.left - INSET;
    const ry = targetRect.top - INSET;
    const rw = targetRect.width + INSET * 2;
    const rh = targetRect.height + INSET * 2;

    return (
      <svg
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 10000, cursor: "pointer" }}
        onClick={() => onComplete?.()}
      >
        <defs>
          <mask id="tutorial-cutout">
            <rect width={vw} height={vh} fill="white" />
            <rect x={rx} y={ry} width={rw} height={rh} rx={10} ry={10} fill="black" />
          </mask>
        </defs>
        <rect width={vw} height={vh} fill="rgba(0,0,0,0.62)" mask="url(#tutorial-cutout)" />
      </svg>
    );
  };

  // ── Highlight ring around target ────────────────────────────────────────────
  const HighlightBox = () => {
    if (!targetRect) return null;
    const INSET = 4;
    return (
      <div style={{
        position: "fixed",
        top: targetRect.top - INSET,
        left: targetRect.left - INSET,
        width: targetRect.width + INSET * 2,
        height: targetRect.height + INSET * 2,
        borderRadius: 10,
        border: "2px solid #3b82f6",
        boxShadow: "0 0 0 3px rgba(59,130,246,0.35), 0 0 20px rgba(59,130,246,0.2)",
        zIndex: 10002,
        pointerEvents: "none",
        transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
      }} />
    );
  };

  return (
    <>
      <Backdrop />
      <HighlightBox />

      {/* Tutorial Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        style={{
          position: "fixed",
          top: placement.y,
          left: placement.x,
          width: CARD_W,
          zIndex: 10003,
          background: "var(--clb-bg-panel, #0f172a)",
          border: "1px solid #3b82f6",
          borderRadius: 16,
          padding: "24px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.2)",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(6px)",
          transition:
            "opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.4,0,0.2,1), left 0.35s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.8px", textTransform: "uppercase" }}>
            Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}
          </div>
          <button
            onClick={() => onComplete?.()}
            style={{
              background: "transparent", border: "none",
              color: "var(--clb-text-muted, #64748b)",
              cursor: "pointer", fontSize: 18, lineHeight: 1,
              padding: "2px 4px", borderRadius: 4,
            }}
            aria-label="Skip tutorial"
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "var(--clb-border, #334155)", borderRadius: 2, marginBottom: 18, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100}%`,
            background: "linear-gradient(90deg, #3b82f6, #6366f1)",
            borderRadius: 2,
            transition: "width 0.4s ease",
          }} />
        </div>

        <h2 id="tutorial-title" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: "var(--clb-text-primary, #f1f5f9)" }}>
          {step.title}
        </h2>

        <p style={{ margin: "0 0 20px", fontSize: 13.5, lineHeight: 1.65, color: "var(--clb-text-secondary, #94a3b8)" }}>
          {step.description}
        </p>

        {/* Dot indicators */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 18 }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === tutorialStep ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === tutorialStep ? "#3b82f6" : "var(--clb-border, #334155)",
              transition: "width 0.3s ease, background 0.3s ease",
            }} />
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {!isFirst && (
            <button
              onClick={handlePrev}
              style={{
                padding: "7px 16px", borderRadius: 8,
                border: "1px solid var(--clb-border, #334155)",
                background: "transparent",
                color: "var(--clb-text-secondary, #94a3b8)",
                fontFamily: "inherit", fontWeight: 600, fontSize: 13,
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              padding: "7px 20px", borderRadius: 8,
              border: "none",
              background: isLast
                ? "linear-gradient(135deg,#16a34a,#15803d)"
                : "linear-gradient(135deg,#3b82f6,#2563eb)",
              color: "#fff",
              fontFamily: "inherit", fontWeight: 700, fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.3)"; }}
          >
            {isLast ? "🚀 Start Experimenting!" : "Next →"}
          </button>
        </div>

        {/* Arrow pointer nested inside card */}
        {cardRect && (
          <ArrowPointer
            side={placement.side}
            targetRect={targetRect}
            placement={placement}
            cardRect={cardRect}
          />
        )}
      </div>
    </>
  );
}
