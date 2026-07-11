import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { migratePanelLayout } from "../utils/migration";

const PanelStoreContext = createContext(null);

export const PANEL_IDS = {
  CANVAS: "canvas",
  CHAT: "chat",
  INSPECTOR: "inspector",
  PERIODIC: "periodic",
  MOLECULES: "molecules",
  NOTEBOOK: "notebook",
  VIEWER_2D: "viewer2d",
  VIEWER_3D: "viewer3d",
  BOHR: "bohr"
};

const DEFAULT_PANEL_STATE = {
  [PANEL_IDS.CANVAS]: { id: PANEL_IDS.CANVAS, x: 340, y: 80, width: 800, height: 600, zIndex: 1, active: true, collapsed: false },
  [PANEL_IDS.CHAT]: { id: PANEL_IDS.CHAT, x: 1160, y: 80, width: 340, height: 600, zIndex: 2, active: true, collapsed: false },
  [PANEL_IDS.INSPECTOR]: { id: PANEL_IDS.INSPECTOR, x: 10, y: 400, width: 320, height: 400, zIndex: 1, active: true, collapsed: false },
  [PANEL_IDS.PERIODIC]: { id: PANEL_IDS.PERIODIC, x: 340, y: 700, width: 800, height: 260, zIndex: 1, active: true, collapsed: false },
  [PANEL_IDS.MOLECULES]: { id: PANEL_IDS.MOLECULES, x: 340, y: 700, width: 800, height: 260, zIndex: 1, active: false, collapsed: false },
  [PANEL_IDS.NOTEBOOK]: { id: PANEL_IDS.NOTEBOOK, x: 10, y: 80, width: 320, height: 300, zIndex: 1, active: true, collapsed: false },
  [PANEL_IDS.VIEWER_3D]: { id: PANEL_IDS.VIEWER_3D, x: 340, y: 80, width: 800, height: 600, zIndex: 1, active: false, collapsed: false }
};

export function PanelStoreProvider({ children }) {
  const [panels, setPanels] = useState(() => {
    try {
      const saved = localStorage.getItem("atomium-panel-layout-v2");
      if (saved) {
        const migrated = migratePanelLayout(saved);
        if (migrated) return migrated;
      }
    } catch (e) {
      console.error("Failed to load panel layout from localStorage:", e);
    }
    return DEFAULT_PANEL_STATE;
  });

  const [activePanelId, setActivePanelId] = useState(null);
  const saveTimeoutRef = useRef(null);

  // Clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const updatePanel = useCallback((id, updates) => {
    setPanels((prev) => {
      const updated = {
        ...prev,
        [id]: { ...prev[id], ...updates }
      };
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem("atomium-panel-layout-v2", JSON.stringify({
            version: 2,
            layout: updated
          }));
        } catch (e) {
          console.error("Failed to save panel layout to localStorage:", e);
        }
      }, 250);

      return updated;
    });
  }, []);

  const focusPanel = useCallback((id) => {
    setActivePanelId(id);
    setPanels((prev) => {
      const maxZ = Math.max(...Object.values(prev).map(p => p.zIndex || 1), 0) + 1;
      const updated = {
        ...prev,
        [id]: { ...prev[id], zIndex: maxZ }
      };
      return updated;
    });
  }, []);

  const value = {
    panels,
    updatePanel,
    focusPanel,
    activePanelId,
    setActivePanelId
  };

  return (
    <PanelStoreContext.Provider value={value}>
      {children}
    </PanelStoreContext.Provider>
  );
}

export function usePanelStore() {
  const context = useContext(PanelStoreContext);
  if (!context) {
    throw new Error("usePanelStore must be used within a PanelStoreProvider");
  }
  return context;
}
