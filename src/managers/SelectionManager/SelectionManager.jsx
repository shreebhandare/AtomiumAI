import { createContext, useContext, useState, useCallback } from "react";

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const [selectedAtoms, setSelectedAtoms] = useState([]); // array of atom ids
  const [selectedBonds, setSelectedBonds] = useState([]); // array of bond ids
  const [selectedMolecule, setSelectedMolecule] = useState(null); // { groupId, atomIds }
  const [selectionBox, setSelectionBox] = useState(null); // { x, y, w, h } lasso rect
  const [hoveredItem, setHoveredItem] = useState(null); // { type: 'atom'|'bond', id }

  const selectAtom = useCallback((id) => {
    setSelectedAtoms([id]);
    setSelectedBonds([]);
    setSelectedMolecule(null);
  }, []);

  const selectMolecule = useCallback((groupId, atomIds) => {
    setSelectedMolecule({ groupId, atomIds });
    setSelectedAtoms(atomIds);
    setSelectedBonds([]);
  }, []);

  const addToSelection = useCallback((id) => {
    setSelectedAtoms((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAtoms([]);
    setSelectedBonds([]);
    setSelectedMolecule(null);
    setSelectionBox(null);
  }, []);

  const isAtomSelected = useCallback(
    (id) => selectedAtoms.includes(id),
    [selectedAtoms]
  );

  const value = {
    selectedAtoms,
    setSelectedAtoms,
    selectedBonds,
    setSelectedBonds,
    selectedMolecule,
    selectAtom,
    selectMolecule,
    addToSelection,
    clearSelection,
    isAtomSelected,
    selectionBox,
    setSelectionBox,
    hoveredItem,
    setHoveredItem,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within a SelectionProvider");
  return ctx;
}
