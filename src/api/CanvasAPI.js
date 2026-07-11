import { eventBus } from "../events/EventBus";

// Command History Stack for Transactional Undo/Redo
class HistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Execute an action and push it to the undo stack.
   * @param {object} action { type, payload, undo, redo }
   */
  execute(action) {
    try {
      action.redo();
      this.undoStack.push(action);
      this.redoStack = []; // Clear redo stack on new action
      eventBus.emit("history:changed", { canUndo: this.canUndo(), canRedo: this.canRedo() });
    } catch (err) {
      console.error("Failed to execute action:", err);
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const action = this.undoStack.pop();
    try {
      action.undo();
      this.redoStack.push(action);
      eventBus.emit("history:changed", { canUndo: this.canUndo(), canRedo: this.canRedo() });
    } catch (err) {
      console.error("Failed to undo action:", err);
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const action = this.redoStack.pop();
    try {
      action.redo();
      this.undoStack.push(action);
      eventBus.emit("history:changed", { canUndo: this.canUndo(), canRedo: this.canRedo() });
    } catch (err) {
      console.error("Failed to redo action:", err);
    }
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    eventBus.emit("history:changed", { canUndo: false, canRedo: false });
  }
}

export const historyManager = new HistoryManager();

/**
 * CanvasAPI
 * Single unified public interface for invoking canvas operations.
 * Communicates with the actual canvas component via EventBus events.
 */
export const canvasAPI = {
  // Spawn a molecule using its JSON data or formula ID
  spawnMolecule(moleculeId) {
    eventBus.emit("canvas:spawn", moleculeId);
  },

  // Remove a molecule by its group or ID
  removeMolecule(moleculeId) {
    eventBus.emit("canvas:remove", moleculeId);
  },

  // Select an atom or molecule
  select(entity) {
    eventBus.emit("canvas:select", entity);
  },

  // Clear all atoms/bonds on canvas
  clear() {
    eventBus.emit("canvas:clear");
  },

  // Start the chemical reaction/physics simulation
  startReaction() {
    eventBus.emit("canvas:startReaction");
  },

  // Stop/Pause the chemical reaction/physics simulation
  stopReaction() {
    eventBus.emit("canvas:stopReaction");
  },

  // Fit viewport zoom/pan to bounding box of current content
  fitView() {
    eventBus.emit("canvas:fitView");
  },

  // Undo last action
  undo() {
    historyManager.undo();
  },

  // Redo last undone action
  redo() {
    historyManager.redo();
  },

  // Register command in history
  pushAction(type, payload, undoFn, redoFn) {
    historyManager.execute({
      type,
      payload,
      undo: undoFn,
      redo: redoFn
    });
  }
};
