import { createContext, useContext, useState, useCallback, useRef } from "react";

const NotificationContext = createContext(null);

const TOAST_TTL_DEFAULT = 4000;
let _idCounter = 0;

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [hints, setHints] = useState([]);
  const timersRef = useRef({});

  // ─── Toast ───────────────────────────────────────────────────────
  const addToast = useCallback(({ message, type = "info", ttl = TOAST_TTL_DEFAULT }) => {
    const id = `toast-${++_idCounter}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, ttl);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
  }, []);

  // ─── Hint (e.g. "Drag to rotate") ────────────────────────────────
  const addHint = useCallback(({ message, ttl = 6000 }) => {
    const id = `hint-${++_idCounter}`;
    setHints((prev) => [...prev, { id, message }]);
    setTimeout(() => setHints((prev) => prev.filter((h) => h.id !== id)), ttl);
    return id;
  }, []);

  const dismissHint = useCallback((id) => {
    setHints((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const value = { addToast, dismissToast, addHint, dismissHint, toasts, hints };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <HintStack hints={hints} onDismiss={dismissHint} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}

// ─── Toast Stack UI ──────────────────────────────────────────────
const TYPE_STYLES = {
  success: { border: "#16a34a", bg: "#f0fdf4", color: "#15803d", icon: "✓" },
  error:   { border: "#dc2626", bg: "#fef2f2", color: "#b91c1c", icon: "✕" },
  warning: { border: "#d97706", bg: "#fffbeb", color: "#b45309", icon: "⚠" },
  info:    { border: "#2563eb", bg: "#eff6ff", color: "#1d4ed8", icon: "ℹ" },
};

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: "20px", right: "20px",
      display: "flex", flexDirection: "column", gap: "8px",
      zIndex: 9999, pointerEvents: "none",
    }}>
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div key={t.id} style={{
            background: s.bg, border: `1px solid ${s.border}`, color: s.color,
            borderRadius: "10px", padding: "10px 14px",
            display: "flex", alignItems: "center", gap: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            fontSize: "13px", fontWeight: "500", pointerEvents: "auto",
            maxWidth: "360px", animation: "slideInRight 0.2s ease",
          }}>
            <span style={{ fontWeight: "700", flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              style={{ background: "none", border: "none", color: s.color, cursor: "pointer", fontSize: "16px", padding: "0 0 0 4px", flexShrink: 0 }}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}

function HintStack({ hints, onDismiss }) {
  if (hints.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
      display: "flex", flexDirection: "column", gap: "6px",
      zIndex: 9998, pointerEvents: "none", alignItems: "center",
    }}>
      {hints.map((h) => (
        <div key={h.id} style={{
          background: "rgba(15,23,42,0.85)", color: "#f1f5f9",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          borderRadius: "20px", padding: "7px 18px",
          fontSize: "12.5px", fontWeight: "500",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          pointerEvents: "auto", cursor: "pointer",
        }}
          onClick={() => onDismiss(h.id)}
        >
          {h.message}
        </div>
      ))}
    </div>
  );
}
