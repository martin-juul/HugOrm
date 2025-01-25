type Listener<T = any> = (payload: T) => void;

export class EventEmitter<Events extends Record<string, any>> {
  private events: Partial<Record<keyof Events, Listener<any>[]>> = {};

  on<Event extends keyof Events>(event: Event, listener: Listener<Events[Event]>): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event]!.push(listener);
  }

  off<Event extends keyof Events>(event: Event, listener: Listener<Events[Event]>): void {
    if (this.events[event]) {
      this.events[event] = this.events[event]!.filter(l => l !== listener);
    }
  }

  emit<Event extends keyof Events>(event: Event, payload: Events[Event]): void {
    if (this.events[event]) {
      this.events[event]!.forEach(listener => listener(payload));
    }
  }
}
