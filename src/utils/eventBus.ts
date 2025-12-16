/**
 * Système d'événements global pour la communication entre composants
 * Permet de synchroniser les données entre les pages sans props drilling
 */

type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Record<string, EventCallback[]> = {};

  /**
   * S'abonner à un événement
   */
  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Se désabonner d'un événement
   */
  off(event: string, callback: EventCallback) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Émettre un événement
   */
  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Erreur dans l'événement ${event}:`, error);
      }
    });
  }

  /**
   * Nettoyer tous les événements (utile pour les tests)
   */
  clear() {
    this.events = {};
  }
}

// Instance singleton
export const eventBus = new EventBus();

// Types d'événements pour une meilleure sécurité de type
export const EVENTS = {
  FORM_SENT_TO_ANALYSIS: 'form_sent_to_analysis',
  ANALYSIS_STATUS_CHANGED: 'analysis_status_changed',
  SAMPLES_UPDATED: 'samples_updated'
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];
