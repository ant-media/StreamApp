export class Emitter<EventMap extends Record<string, unknown>> {
  private handlers: Map<keyof EventMap, Set<(payload: EventMap[keyof EventMap]) => void>> =
    new Map();

  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    // TypeScript cannot narrow Set element type per key; wrap to preserve type safety
    const wrapped = ((p: unknown) => handler(p as EventMap[K])) as (
      payload: EventMap[keyof EventMap]
    ) => void;
    (wrapped as unknown as { original?: typeof handler }).original = handler;
    this.handlers.get(event)!.add(wrapped);
  }

  off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      if ((fn as unknown as { original?: unknown }).original === handler) {
        set.delete(fn);
      }
    }
  }

  once<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
    const wrap = (payload: EventMap[K]) => {
      this.off(event, wrap as unknown as (p: EventMap[K]) => void);
      handler(payload);
    };
    this.on(event, wrap);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        (fn as (p: EventMap[K]) => void)(payload);
      } catch (e) {
        console.warn(e);
      }
    }
  }
}
