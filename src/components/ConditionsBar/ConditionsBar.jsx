// Temperature/pressure sliders that drive the physics engine's bonding-
// probability factors.
// Presentational — state lives in ChemLabCanvas.
export default function ConditionsBar({
  tempK, setTempK, pressureAtm, setPressureAtm,
}) {
  return (
    <div style={{
      background: "#ffffff",
      borderTop: "1px solid #e2e8f0",
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      gap: 32,
      flexShrink: 0
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>🌡 Temperature</span>
        <input
          type="range"
          min="100"
          max="900"
          step="10"
          value={tempK}
          onChange={(e) => setTempK(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, fontFamily: "'Space Mono', monospace", width: 52 }}>
          {tempK}K
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>⬡ Pressure</span>
        <input
          type="range"
          min="0.1"
          max="60"
          step="0.5"
          value={pressureAtm}
          onChange={(e) => setPressureAtm(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, fontFamily: "'Space Mono', monospace", width: 72 }}>
          {pressureAtm.toFixed(1)} atm
        </span>
      </div>
    </div>
  );
}
