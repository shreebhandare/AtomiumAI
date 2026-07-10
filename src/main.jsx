import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import AtomiumCanvas from "./AtomiumCanvas.jsx";
import { initializeReactionStore } from "./chemistry/initializeReactionStore";

function AppLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeReactionStore().then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a", // Deep premium slate blue matching Atomium aesthetic
        color: "#f8fafc",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        gap: 20
      }}>
        <div style={{
          width: 54,
          height: 54,
          border: "4.5px solid #1e293b",
          borderTop: "4.5px solid #2563eb",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          boxShadow: "0 0 15px rgba(37,99,235,0.2)"
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "-0.2px",
          color: "#94a3b8",
          animation: "pulse 1.5s ease-in-out infinite"
        }}>
          Syncing chemical formulas...
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return <AtomiumCanvas />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppLoader />
  </React.StrictMode>
);
