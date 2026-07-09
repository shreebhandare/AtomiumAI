import { useState, useEffect } from "react";

const WAITING_MESSAGES = ["Searching...", "Researching...", "Finding your answer..."];

// Gemini chat assistant panel: message thread, input box, expand/collapse.
// Presentational — all state (messages, input, expanded) lives in ChemLabCanvas.
export default function ChatPanel({
  chatExpanded, setChatExpanded, chatMessages, chatInput, setChatInput,
  sendChatMessage, useAI, isWaitingForGemini, handleSpawnReaction,
}) {
  // Upgrade #11.3: cycle through waiting messages every 1.4s while a request
  // is in flight, so the panel doesn't sit silently during the Gemini call.
  const [waitingMsgIndex, setWaitingMsgIndex] = useState(0);
  useEffect(() => {
    if (!isWaitingForGemini) {
      setWaitingMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setWaitingMsgIndex((i) => (i + 1) % WAITING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isWaitingForGemini]);

  // Upgrade #11.1: once a message is actively streaming in, its own growing
  // text is the "something is happening" signal — showing the generic
  // waiting-dots bubble underneath it at the same time is redundant.
  const hasActiveStream = chatMessages.some((m) => m.streaming);

  return (
        <div style={{ width: chatExpanded ? 460 : 320, transition: "width 0.2s ease, background 0.3s ease", background: "var(--clb-bg-panel)", borderLeft: "1px solid var(--clb-border)", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative" }}>
          <style>{`
            @keyframes clbCursorBlink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
            .clb-stream-cursor { display: inline-block; margin-left: 1px; animation: clbCursorBlink 0.9s step-start infinite; color: #9b72cb; }
          `}</style>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--clb-border)", background: "var(--clb-bg-canvas)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "conic-gradient(#4285f4,#9b72cb,#d96570,#4285f4)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--clb-text-primary)" }}>Gemini Assistant</span>
              {!useAI && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} title="AI disabled" />}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button className="clb-btn" style={{ padding: "4px 8px", fontSize: 11, height: 26 }} onClick={() => setChatExpanded((v) => !v)} title={chatExpanded ? "Collapse" : "Expand"}>
                {chatExpanded ? "⤡" : "⤢"}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, background: "var(--clb-bg-canvas)" }}>
            {chatMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  background: m.role === "user" ? "var(--clb-bg-hover)" : "var(--clb-bg-panel)",
                  border: `1px solid ${m.role === "user" ? "var(--clb-border-accent)" : "var(--clb-border)"}`,
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  color: "var(--clb-text-primary)",
                  lineHeight: 1.5,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                }}
              >
                <div>{m.text}</div>
                {m.streaming && <span className="clb-stream-cursor">▋</span>}
                {m.pendingReaction && !m.spawned && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="clb-btn"
                      onClick={() => handleSpawnReaction?.(m.pendingReaction, i)}
                      style={{
                        background: "#2563eb",
                        borderColor: "#2563eb",
                        color: "#ffffff",
                        fontSize: "11px",
                        padding: "4px 10px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        borderRadius: "6px"
                      }}
                    >
                      🧪 Spawn Reactants
                    </button>
                  </div>
                )}
                {m.spawned && (
                  <div style={{ fontSize: 11, color: "#166534", marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>✓</span> Reactants added to canvas
                  </div>
                )}
              </div>
            ))}
            {isWaitingForGemini && !hasActiveStream && (
              <div style={{
                alignSelf: "flex-start", maxWidth: "88%",
                background: "var(--clb-bg-panel)", border: "1px solid var(--clb-border)", borderRadius: 10,
                padding: "8px 12px", fontSize: 12.5, color: "var(--clb-text-secondary)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#9b72cb", boxShadow: "0 0 6px #9b72cb",
                  animation: "pulse 1s infinite",
                }} />
                {WAITING_MESSAGES[waitingMsgIndex]}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, padding: 12, borderTop: "1px solid var(--clb-border)", background: "var(--clb-bg-panel)" }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isWaitingForGemini && sendChatMessage()}
              placeholder="Ask Gemini..."
              disabled={isWaitingForGemini}
              style={{ flex: 1, background: "var(--clb-bg-card)", border: "1px solid var(--clb-border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--clb-text-primary)", outline: "none", opacity: isWaitingForGemini ? 0.6 : 1 }}
            />
            <button
              className="clb-btn"
              style={{ padding: "8px 14px", background: "#2563eb", borderColor: "#2563eb", color: "#ffffff", opacity: isWaitingForGemini ? 0.6 : 1 }}
              onClick={sendChatMessage}
              disabled={isWaitingForGemini}
            >
              ➤
            </button>
          </div>
        </div>
  );
}
