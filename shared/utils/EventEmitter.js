class EventEmitter {
    constructor() {
      this.events = new Map();
    }
  
    on(event, listener) {
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }
      this.events.get(event).push(listener);
      
      // Return unsubscribe function
      return () => this.off(event, listener);
    }
  
    once(event, listener) {
      const onceWrapper = (...args) => {
        this.off(event, onceWrapper);
        listener.apply(this, args);
      };
      return this.on(event, onceWrapper);
    }
  
    off(event, listenerToRemove) {
      if (!this.events.has(event)) return;
      
      const listeners = this.events.get(event);
      const index = listeners.indexOf(listenerToRemove);
      
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      
      if (listeners.length === 0) {
        this.events.delete(event);
      }
    }
  
    emit(event, ...args) {
      if (!this.events.has(event)) return false;
      
      const listeners = this.events.get(event).slice(); // Copy array
      listeners.forEach(listener => {
        try {
          listener.apply(this, args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
      
      return true;
    }
  
    removeAllListeners(event) {
      if (event) {
        this.events.delete(event);
      } else {
        this.events.clear();
      }
    }
  
    listenerCount(event) {
      return this.events.has(event) ? this.events.get(event).length : 0;
    }
  
    eventNames() {
      return Array.from(this.events.keys());
    }
  }
  
  module.exports = EventEmitter;