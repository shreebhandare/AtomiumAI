import { createContext, useContext, useState, useCallback } from "react";

const AIStoreContext = createContext(null);

export function AIStoreProvider({ children }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your Atomium AI Chemistry Assistant. Ask me to explain concepts, predict reactions, or even spawn molecules on the canvas like [SPAWN: water]!"
    }
  ]);
  const [spawning, setSpawning] = useState(false);
  const [thinking, setThinking] = useState(false);

  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, { id: `msg_${Date.now()}`, ...message }]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const value = {
    messages,
    setMessages,
    addMessage,
    clearMessages,
    spawning,
    setSpawning,
    thinking,
    setThinking
  };

  return (
    <AIStoreContext.Provider value={value}>
      {children}
    </AIStoreContext.Provider>
  );
}

export function useAIStore() {
  const context = useContext(AIStoreContext);
  if (!context) {
    throw new Error("useAIStore must be used within a AIStoreProvider");
  }
  return context;
}
