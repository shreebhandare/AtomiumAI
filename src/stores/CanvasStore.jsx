import { createContext, useContext, useState, useCallback, useRef } from "react";

const CanvasStoreContext = createContext(null);

export function CanvasStoreProvider({ children }) {
  const [atoms, setAtomsState] = useState([]);
  const [bonds, setBondsState] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'atom' | 'molecule', id }

  // Use refs for internal physics loop synchronization to avoid stale react closure problems
  const atomsRef = useRef([]);
  const bondsRef = useRef([]);

  const setAtoms = useCallback((newAtoms) => {
    const updated = typeof newAtoms === "function" ? newAtoms(atomsRef.current) : newAtoms;
    atomsRef.current = updated;
    setAtomsState(updated);
  }, []);

  const setBonds = useCallback((newBonds) => {
    const updated = typeof newBonds === "function" ? newBonds(bondsRef.current) : newBonds;
    bondsRef.current = updated;
    setBondsState(updated);
  }, []);

  const value = {
    atoms,
    setAtoms,
    atomsRef,
    bonds,
    setBonds,
    bondsRef,
    reactions,
    setReactions,
    selectedEntity,
    setSelectedEntity,
  };

  return (
    <CanvasStoreContext.Provider value={value}>
      {children}
    </CanvasStoreContext.Provider>
  );
}

export function useCanvasStore() {
  const context = useContext(CanvasStoreContext);
  if (!context) {
    throw new Error("useCanvasStore must be used within a CanvasStoreProvider");
  }
  return context;
}
