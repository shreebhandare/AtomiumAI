import { createContext, useContext, useState, useCallback } from "react";

const UIStoreContext = createContext(null);

export function UIStoreProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem("atomium-theme") || "dark"; // Default dark theme as requested!
    } catch {
      return "dark";
    }
  });

  const [tutorialActive, setTutorialActive] = useState(() => {
    try {
      return localStorage.getItem("atomium-tutorial-completed") !== "true";
    } catch {
      return true;
    }
  });

  const [tutorialStep, setTutorialStep] = useState(0);
  const [dialogs, setDialogs] = useState({}); // e.g. { confirmation: false }

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("atomium-theme", newTheme);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const completeTutorial = useCallback(() => {
    setTutorialActive(false);
    try {
      localStorage.setItem("atomium-tutorial-completed", "true");
    } catch (e) {
      console.error(e);
    }
  }, []);

  const openDialog = useCallback((name) => {
    setDialogs(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeDialog = useCallback((name) => {
    setDialogs(prev => ({ ...prev, [name]: false }));
  }, []);

  const value = {
    theme,
    setTheme,
    tutorialActive,
    setTutorialActive,
    tutorialStep,
    setTutorialStep,
    completeTutorial,
    dialogs,
    openDialog,
    closeDialog
  };

  return (
    <UIStoreContext.Provider value={value}>
      {children}
    </UIStoreContext.Provider>
  );
}

export function useUIStore() {
  const context = useContext(UIStoreContext);
  if (!context) {
    throw new Error("useUIStore must be used within a UIStoreProvider");
  }
  return context;
}
