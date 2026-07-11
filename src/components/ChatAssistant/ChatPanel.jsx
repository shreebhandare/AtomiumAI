import { useState, useEffect } from "react";

const WAITING_MESSAGES = ["Searching...", "Researching...", "Finding your answer..."];

// AtomiumAI chat assistant panel: message thread, input box, expand/collapse.
// Presentational — all state (messages, input, expanded) lives in AtomiumCanvas.
export default function ChatPanel({
  chatExpanded, setChatExpanded, chatMessages, chatInput, setChatInput,
  sendChatMessage, useAI, isWaitingForAI,
}) {
  const [waitingMsgIndex, setWaitingMsgIndex] = useState(0);
  useEffect(() => {
    if (!isWaitingForAI) {
      setWaitingMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setWaitingMsgIndex((i) => (i + 1) % WAITING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isWaitingForAI]);

  // Once a message is actively streaming in, its own growing
  // text is the "something is happening" signal — showing the generic
  // waiting-dots bubble underneath it at the same time is redundant.
  const hasActiveStream = chatMessages.some((m) => m.streaming);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      transition: "background 0.3s ease",
      background: "var(--clb-bg-panel)",
      borderLeft: "1px solid var(--clb-border)",
      boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.08)",
      zIndex: 10,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
      position: "relative"
    }}>
      <style>{`
        @keyframes clbCursorBlink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
        .clb-stream-cursor { display: inline-block; margin-left: 1px; animation: clbCursorBlink 0.9s step-start infinite; color: #9b72cb; }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 48,
        minHeight: 48,
        padding: "0 18px",
        borderBottom: "1px solid var(--clb-border)",
        background: "var(--clb-bg-panel)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: "bold",
            boxShadow: "0 2px 6px rgba(59, 130, 246, 0.25)"
          }}>AI</div>
          <span style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--clb-text-primary)",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: 0.2
          }}>AI Assistant</span>
          {!useAI && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} title="AI disabled" />}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="clb-btn"
            style={{ padding: "4px 8px", fontSize: 11, height: 26 }}
            onClick={() => setChatExpanded((v) => !v)}
            title={chatExpanded ? "Collapse" : "Expand"}
          >
            {chatExpanded ? "⤡" : "⤢"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "var(--clb-bg-panel)"
      }}>
        {chatMessages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: isUser ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "var(--clb-bg-panel)",
                border: isUser ? "none" : "1px solid var(--clb-border)",
                borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                padding: "10px 14px",
                fontSize: 12.5,
                color: isUser ? "#ffffff" : "var(--clb-text-primary)",
                lineHeight: 1.5,
                boxShadow: isUser ? "0 3px 10px rgba(37,99,235,0.14)" : "0 1px 3px rgba(0,0,0,0.02)",
                wordBreak: "break-word",
              }}
            >
              <div>{m.text}</div>
              {m.streaming && <span className="clb-stream-cursor">▋</span>}
              {m.pendingReaction && !m.spawned && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="clb-btn"
                    onClick={() => window.handleSpawnReaction?.(m.pendingReaction, i)}
                    style={{
                      background: "#2563eb",
                      borderColor: "#2563eb",
                      color: "#ffffff",
                      fontSize: "11px",
                      padding: "5px 12px",
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
                <div style={{ fontSize: 11, color: isUser ? "#bbf7d0" : "#166534", marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>✓</span> Reactants added to canvas
                </div>
              )}
            </div>
          );
        })}

        {isWaitingForAI && !hasActiveStream && (
          <div style={{
            alignSelf: "flex-start",
            maxWidth: "85%",
            background: "var(--clb-bg-panel)",
            border: "1px solid var(--clb-border)",
            borderRadius: "16px 16px 16px 2px",
            padding: "10px 14px",
            fontSize: 12.5,
            color: "var(--clb-text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#9b72cb",
              boxShadow: "0 0 6px #9b72cb",
              animation: "pulse 1s infinite",
            }} />
            {WAITING_MESSAGES[waitingMsgIndex]}
          </div>
        )}
      </div>

      {/* Input container */}
      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--clb-border)", background: "var(--clb-bg-panel)" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 6px 4px 12px",
          border: "1px solid var(--clb-border)",
          borderRadius: 22,
          background: "var(--clb-bg-canvas)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)"
        }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isWaitingForAI && sendChatMessage()}
            placeholder="Ask AI chemistry questions..."
            disabled={isWaitingForAI}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              color: "var(--clb-text-primary)",
              opacity: isWaitingForAI ? 0.6 : 1
            }}
          />
          <button
            onClick={sendChatMessage}
            disabled={isWaitingForAI}
            style={{
              border: "none",
              borderRadius: "50%",
              background: "#2563eb",
              color: "#ffffff",
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isWaitingForAI ? 0.6 : 1,
              transition: "background 0.15s ease",
              fontSize: 13,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#2563eb"; }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
