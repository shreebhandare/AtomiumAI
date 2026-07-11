/**
 * EventBus.js
 * A lightweight Publish-Subscribe event emitter to decouple features.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register an event listener.
   * @param {string} event 
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return an unsubscribe function for React cleanup convenience
    return () => this.off(event, callback);
  }

  /**
   * Register a one-time event listener.
   * @param {string} event 
   * @param {Function} callback 
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      this.off(event, onceWrapper);
      callback(data);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Deregister an event listener.
   * @param {string} event 
   * @param {Function} callback 
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event);
    const index = list.indexOf(callback);
    if (index !== -1) {
      list.splice(index, 1);
    }
    if (list.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Publish an event.
   * @param {string} event 
   * @param {any} data 
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    // Shallow copy to prevent issues if a listener unsubscribes during execution
    const list = [...this.listeners.get(event)];
    for (const callback of list) {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
  }

  /**
   * Clear all listeners.
   */
  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
