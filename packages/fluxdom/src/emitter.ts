import { Listener, Emitter } from "./types";

// Force coverage update

const noop = () => {};

/**
 * Class-based emitter implementation for better V8 optimization.
 * All instances share methods via prototype.
 */
class EmitterImpl<T = void> implements Emitter<T> {
  /** Set of registered listeners */
  private _listeners: Set<Listener<T>>;
  /** Settled payload (if settled) */
  private _settledPayload: T | undefined = undefined;
  /** Whether the emitter has been settled */
  private _isSettled = false;

  constructor(initialListeners?: Listener<T>[]) {
    this._listeners = new Set<Listener<T>>(initialListeners);
    // Bind 'on' to preserve 'this' context when passed as callback
  }

  size = (): number => {
    return this._listeners.size;
  };

  settled = (): boolean => {
    return this._isSettled;
  };

  on = (listenersOrMap: any, mappedListeners?: any): VoidFunction => {
    let newListeners: Listener<T>[];

    if (mappedListeners === undefined) {
      // Simple form: on(listeners)
      newListeners = Array.isArray(listenersOrMap)
        ? listenersOrMap
        : [listenersOrMap];
    } else {
      // Mapped form: on(map, listeners)
      const map = listenersOrMap as (value: T) => { value: any } | undefined;
      const sourceListeners: Listener<any>[] = Array.isArray(mappedListeners)
        ? mappedListeners
        : [mappedListeners];

      newListeners = [
        (value: T) => {
          const mappedValue = map(value);
          if (mappedValue) {
            for (let i = 0; i < sourceListeners.length; i++) {
              sourceListeners[i]!(mappedValue.value);
            }
          }
        },
      ];
    }

    // If settled, call listeners immediately and return no-op
    if (this._isSettled) {
      const payload = this._settledPayload as T;
      for (let i = 0; i < newListeners.length; i++) {
        newListeners[i]!(payload);
      }
      return noop;
    }

    const listeners = this._listeners;
    for (let i = 0; i < newListeners.length; i++) {
      listeners.add(newListeners[i]!);
    }

    return () => {
      for (let i = 0; i < newListeners.length; i++) {
        listeners.delete(newListeners[i]!);
      }
    };
  };

  emit = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, false, false);
  };

  emitLifo = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, false, true);
  };

  clear = (): void => {
    this._listeners.clear();
  };

  emitAndClear = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, true, false);
  };

  emitAndClearLifo = (payload: T): void => {
    if (this._isSettled) return;
    this._doEmit(payload, true, true);
  };

  settle = (payload: T): void => {
    if (this._isSettled) return;
    this._settledPayload = payload;
    this._isSettled = true;
    this._doEmit(payload, true, false);
  };

  /**
   * Internal emit implementation.
   * Creates snapshot to handle modifications during iteration.
   */
  private _doEmit = (payload: T, clear: boolean, lifo: boolean): void => {
    const listeners = this._listeners;
    const size = listeners.size;
    if (size === 0) return;

    // Create snapshot - necessary because Set.forEach includes items added during iteration
    const copy = Array.from(listeners);
    if (clear) {
      listeners.clear();
    }

    // Use traditional for loop for maximum performance
    if (lifo) {
      for (let i = size - 1; i >= 0; i--) {
        copy[i]!(payload);
      }
    } else {
      for (let i = 0; i < size; i++) {
        copy[i]!(payload);
      }
    }
  };
}

/**
 * Creates an event emitter for managing and notifying listeners.
 *
 * An emitter provides a simple pub/sub pattern for managing event listeners.
 * It's used internally by signals and effects to manage subscriptions and notifications.
 *
 * Features:
 * - Add listeners that will be notified when events are emitted
 * - Emit events to all registered listeners
 * - Remove listeners via unsubscribe functions
 * - Clear all listeners at once
 * - Safe to call unsubscribe multiple times (idempotent)
 *
 * @template T - The type of payload that will be emitted to listeners (defaults to void)
 * @returns An emitter object with add, emit, and clear methods
 *
 * @example
 * ```ts
 * const eventEmitter = emitter<string>();
 *
 * // Subscribe to events
 * const unsubscribe = eventEmitter.on((message) => {
 *   console.log('Received:', message);
 * });
 *
 * // Emit an event
 * eventEmitter.emit('Hello'); // Logs: "Received: Hello"
 *
 * // Unsubscribe
 * unsubscribe();
 *
 * // Clear all listeners
 * eventEmitter.clear();
 * ```
 */
export function emitter<T = void>(
  initialListeners?: Listener<T>[]
): Emitter<T> {
  return new EmitterImpl<T>(initialListeners);
}
