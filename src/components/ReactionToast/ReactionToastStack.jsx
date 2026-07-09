// Cross-cutting upgrade: surfaces the canonical reaction equation every single
// time a reaction is recognized on the canvas — not just the most recent one.
// Renders as a stack of transient cards (top-right) so several reactions in
// quick succession (e.g. a multi-step cascade, or locking one compound and
// letting the leftovers react again) are each visible in turn rather than
// silently overwriting one another. Always sourced from
// chemistry/equationBuilder's getCanonicalEquation — the single source of
// truth — so the text here never drifts from the Inspector or diagnostics.
export default function ReactionToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: "absolute", top: 12, right: 12, zIndex: 25,
      display: "flex", flexDirection: "column", gap: 8,
      alignItems: "flex-end", pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            background: "#f0fdfaee",
            border: "1px solid #99f6e4",
            borderRadius: 10,
            padding: "9px 12px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
            maxWidth: 320,
            animation: "reactionToastIn 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 13, marginTop: 1 }}>⚗️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f766e", letterSpacing: 0.3, marginBottom: 2 }}>
                REACTION
              </div>
              <div style={{
                fontSize: 13.5, fontWeight: 700, color: "#134e4a",
                fontFamily: "'Space Mono', monospace", wordBreak: "break-word",
              }}>
                {t.equation}
              </div>
              {t.name && (
                <div style={{ fontSize: 11, color: "#0d9488", marginTop: 2 }}>{t.name}</div>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                background: "transparent", border: "none", color: "#5eead4",
                cursor: "pointer", fontSize: 12, padding: "0 0 0 4px", lineHeight: 1,
              }}
              title="Dismiss"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes reactionToastIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
