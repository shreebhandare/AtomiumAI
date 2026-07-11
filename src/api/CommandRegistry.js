import { canvasAPI } from "./CanvasAPI";

class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.setupDefaultCommands();
  }

  /**
   * Register a new command handler.
   * @param {string} name 
   * @param {Function} handler (value: string | undefined) => void
   */
  register(name, handler) {
    this.commands.set(name.toUpperCase(), handler);
  }

  /**
   * Execute a command.
   * @param {string} name 
   * @param {string} [value] 
   */
  execute(name, value) {
    const cmd = name.toUpperCase();
    if (this.commands.has(cmd)) {
      try {
        this.commands.get(cmd)(value);
      } catch (err) {
        console.error(`Error executing command ${cmd}:`, err);
      }
    } else {
      console.warn(`Command "${cmd}" is not registered in the CommandRegistry.`);
    }
  }

  /**
   * Scans a text message for command patterns such as:
   * [SPAWN:water] or [CLEAR]
   * and runs them in order.
   * @param {string} text 
   */
  parseAndExecute(text) {
    if (!text) return;
    
    // Pattern matches: [COMMAND] or [COMMAND:VALUE]
    // Allow characters inside brackets, excluding other brackets
    const regex = /\[([A-Z0-9_]+)(?::([^\]]+))?\]/gi;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const value = match[2]; // undefined if not provided
      this.execute(name, value);
    }
  }

  setupDefaultCommands() {
    this.register("SPAWN", (val) => canvasAPI.spawnMolecule(val));
    this.register("CLEAR", () => canvasAPI.clear());
    this.register("START_REACTION", () => canvasAPI.startReaction());
    this.register("STOP_REACTION", () => canvasAPI.stopReaction());
    this.register("SELECT", (val) => canvasAPI.select(val));
    // Focus can emit to eventBus to focus panels
    this.register("FOCUS", (val) => {
      import("../events/EventBus").then(({ eventBus }) => {
        eventBus.emit("panel:focus", val);
      });
    });
  }
}

export const commandRegistry = new CommandRegistry();
