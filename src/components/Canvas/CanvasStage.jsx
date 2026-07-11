import { useEffect, useRef } from "react";
import Molecule3DViewer from "../../Molecule3DViewer";
import ReactionToastStack from "../ReactionToast/ReactionToastStack";
import ViewModeTabs from "./ViewModeTabs";
import CanvasBottomBar from "./CanvasBottomBar";

// The reaction canvas itself: status banners (active-reaction / PubChem lookup),
// the empty-state placeholder, the 3D-mode overlay, the actual <canvas> element
// (physics rendering lives in AtomiumCanvas — this just hosts the ref + handlers),
// and the zoom controls.
export default function CanvasStage({
  diagnostics, pubchemStatus, counts, formulaInput, visualMode, setVisualMode,
  viewer3dSdf, viewer3dXyz, viewer3dTitle,
  canvasRef, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel, handleDrop,
  zoom, setZoom, fitAll, resetView,
  reactionToasts, dismissReactionToast,
  orbitSpeed, setOrbitSpeed,
  distinctMolecules, selected3DMoleculeIndex, setSelected3DMoleculeIndex,
  materialFinish,
  mode, startReaction, clearAll,
  theme,
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelRaw = (e) => {
      handleWheel(e);
    };

    canvas.addEventListener("wheel", handleWheelRaw, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheelRaw);
    };
  }, [canvasRef, handleWheel]);

  // Touch & Pinch-to-zoom support for tablet/mobile viewports
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let startTouchDist = 0;
    let startTouchZoom = 1;

    const getDistance = (t1, t2) => {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleMouseDown({
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => {}
        });
      } else if (e.touches.length === 2) {
        startTouchDist = getDistance(e.touches[0], e.touches[1]);
        startTouchZoom = zoomRef.current;
      }
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleMouseMove({
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => {}
        });
      } else if (e.touches.length === 2) {
        const dist = getDistance(e.touches[0], e.touches[1]);
        if (startTouchDist > 0) {
          const ratio = dist / startTouchDist;
          const targetZoom = Math.max(0.4, Math.min(2.2, startTouchZoom * ratio));
          setZoom(targetZoom);
        }
      }
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      handleMouseUp();
      startTouchDist = 0;
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [canvasRef, handleMouseDown, handleMouseMove, handleMouseUp, setZoom]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <ViewModeTabs
        visualMode={visualMode}
        setVisualMode={setVisualMode}
        mode={mode}
        startReaction={startReaction}
        clearAll={clearAll}
        fitAll={fitAll}
        resetView={resetView}
      />
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--clb-bg-canvas)", transition: "background 0.3s ease" }}>
            
            {/* Active reaction / pulling status */}
            {diagnostics.length > 0 && (
              <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
                {diagnostics.map((diag) => (
                  <div key={diag.key} style={{ background: "#e0f2feee", border: "1px solid #7dd3fc", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", color: "#0369a1" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0284c7", boxShadow: "0 0 6px #0284c7", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700 }}>{diag.equation || `${diag.formula} (${diag.name})`}</span>
                    <span style={{ color: "#0284c7", fontWeight: 500 }}>{diag.issues[0].label}</span>
                  </div>
                ))}
              </div>
            )}
            {/* PubChem/AtomiumAI lookup status — every branch (including failure) renders
                something, so a lookup miss is visible rather than silently vanishing. */}
            {pubchemStatus && (
              <div style={{ position: "absolute", top: diagnostics.length > 0 ? 54 : 12, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
                <div style={{
                  background: pubchemStatus === "not-found" ? "#fef2f2ee" : "#f5f3ffee",
                  border: pubchemStatus === "not-found" ? "1px solid #fecaca" : "1px solid #ddd6fe",
                  borderRadius: 8, padding: "7px 14px", fontSize: 11.5, display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}>
                  {pubchemStatus === "searching" ? (
                    <>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 5px #7c3aed", animation: "pulse 1s infinite" }} />
                      <span style={{ color: "#6d28d9", fontWeight: 500 }}>Searching for reaction data...</span>
                    </>
                  ) : pubchemStatus === "ai-generating" ? (
                    <>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#2563eb", boxShadow: "0 0 5px #2563eb", animation: "pulse 1s infinite" }} />
                      <span style={{ color: "#1d4ed8", fontWeight: 500 }}>AtomiumAI — generating reaction data...</span>
                    </>
                  ) : pubchemStatus === "not-found" ? (
                    <>
                      <span style={{ color: "#b91c1c", fontWeight: "bold" }}>✕</span>
                      <span style={{ color: "#b91c1c", fontWeight: 500 }}>No known reaction found for this combination.</span>
                    </>
                  ) : pubchemStatus.startsWith("found:") ? (
                    <>
                      <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓</span>
                      <span style={{ color: "#15803d", fontWeight: 600 }}>Found: {pubchemStatus.replace("found:", "")}</span>
                    </>
                  ) : null}
                </div>
              </div>
            )}
            {counts.atoms === 0 && !formulaInput && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ fontSize: 42, opacity: 0.15, marginBottom: 12 }}>⚛</div>
                <div style={{ color: "#475569", fontSize: 14, fontWeight: 500, textAlign: "center" }}>
                  Drag elements from below, or type a formula above to render
                </div>
              </div>
            )}
            <ReactionToastStack toasts={reactionToasts} onDismiss={dismissReactionToast} />
            {visualMode === "3d" && (
              <div style={{
                position: "absolute",
                top: 0, left: 0,
                width: "100%", height: "100%",
                zIndex: 5
              }}>
                <Molecule3DViewer
                  sdfData={viewer3dSdf}
                  xyzData={viewer3dXyz}
                  title={viewer3dTitle}
                  distinctMolecules={distinctMolecules}
                  selected3DMoleculeIndex={selected3DMoleculeIndex}
                  setSelected3DMoleculeIndex={setSelected3DMoleculeIndex}
                  materialFinish={materialFinish}
                  theme={theme}
                />
              </div>
            )}
            <canvas
              ref={canvasRef}
              style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave || handleMouseUp}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            />
            {/* Mode-specific bottom bar: orbit speed (bohr) or bond legend (simple) */}
            <CanvasBottomBar
              visualMode={visualMode}
              orbitSpeed={orbitSpeed}
              setOrbitSpeed={setOrbitSpeed}
              fitAll={fitAll}
              resetView={resetView}
            />
            <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'Space Mono', monospace", fontWeight: 600 }}>{Math.round(zoom * 100)}%</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <button className="clb-btn" style={{ width: 32, height: 32, padding: 0, borderRadius: 6 }} onClick={() => setZoom((z) => Math.min(2.2, z * 1.15))}>+</button>
                <button className="clb-btn" style={{ width: 32, height: 32, padding: 0, borderRadius: 6 }} onClick={() => setZoom((z) => Math.max(0.4, z * 0.85))}>−</button>
                <button className="clb-btn" style={{ width: 32, height: 32, padding: 0, borderRadius: 6, fontSize: 12 }} onClick={resetView} title="Reset zoom and pan">⌂</button>
                <button className="clb-btn" style={{ width: 32, height: 32, padding: 0, borderRadius: 6, fontSize: 12 }} onClick={fitAll} title="Fit all molecules in view">⛶</button>
              </div>
            </div>
      </div>
    </div>
  );
}
