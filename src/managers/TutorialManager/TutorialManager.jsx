import { useState } from "react";
import { TUTORIAL_STEPS } from "./tutorialSteps";

export default function TutorialManager({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);

  const step = TUTORIAL_STEPS[stepIndex];
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 10000,
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
        onClick={() => onComplete?.()}
      />

      {/* Tutorial Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10001,
          background: "var(--clb-bg-panel, #0f172a)",
          border: "1px solid #3b82f6",
          borderRadius: "16px",
          padding: "28px 32px",
          maxWidth: "420px",
          width: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.2)",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        {/* Step counter */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "16px",
        }}>
          <div style={{
            fontSize: "11px", fontWeight: "700", color: "#3b82f6",
            letterSpacing: "0.8px", textTransform: "uppercase",
          }}>
            Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
          </div>
          <button
            onClick={() => onComplete?.()}
            style={{
              background: "transparent", border: "none",
              color: "var(--clb-text-muted, #64748b)",
              cursor: "pointer", fontSize: "18px",
            }}
            aria-label="Skip tutorial"
          >×</button>
        </div>

        {/* Progress bar */}
        <div style={{
          height: "3px", background: "var(--clb-border, #334155)",
          borderRadius: "2px", marginBottom: "20px", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${((stepIndex + 1) / TUTORIAL_STEPS.length) * 100}%`,
            background: "linear-gradient(90deg, #3b82f6, #6366f1)",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }} />
        </div>

        <h2 id="tutorial-title" style={{
          margin: "0 0 10px",
          fontSize: "18px", fontWeight: "700",
          color: "var(--clb-text-primary, #f1f5f9)",
        }}>
          {step.title}
        </h2>

        <p style={{
          margin: "0 0 24px",
          fontSize: "14px", lineHeight: "1.6",
          color: "var(--clb-text-secondary, #94a3b8)",
        }}>
          {step.description}
        </p>

        {/* Navigation buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          {!isFirst && (
            <button
              onClick={handlePrev}
              style={{
                padding: "8px 18px", borderRadius: "8px",
                border: "1px solid var(--clb-border, #334155)",
                background: "transparent",
                color: "var(--clb-text-secondary, #94a3b8)",
                fontFamily: "inherit", fontWeight: "600", fontSize: "13px",
                cursor: "pointer",
              }}
            >
              ← Previous
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              padding: "8px 20px", borderRadius: "8px",
              border: "1px solid #2563eb",
              background: isLast ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#3b82f6,#2563eb)",
              color: "#ffffff",
              fontFamily: "inherit", fontWeight: "600", fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            }}
          >
            {isLast ? "Start Experimenting! 🚀" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
