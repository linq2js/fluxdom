import { AnyFunc, DerivedStore, Store, Equality } from "../types";
import { withUse } from "../withUse";
import { emitter } from "../emitter";
import { resolveEquality } from "../equality";

/**
 * Create a derived (computed) store from one or more source stores.
 *
 * Derived stores are read-only and automatically update when any
 * dependency store changes. Useful for computing derived state.
 *
 * @example
 * ```ts
 * const totalStore = derived(
 *   "total",
 *   [priceStore, quantityStore],
 *   (price, quantity) => price * quantity
 * );
 * ```
 *
 * @param name - Identifier for the derived store
 * @param dependencies - Array of source stores to derive from
 * @param selector - Function that computes the derived value
 * @param equals - Equality strategy (default: "strict")
 * @returns A read-only DerivedStore
 */
export function derived<T, const TStores extends readonly Store<any>[]>(
  name: string,
  dependencies: TStores,
  selector: (
    ...args: {
      [K in keyof TStores]: TStores[K] extends Store<infer T> ? T : never;
    }
  ) => T,
  equals?: Equality<T>
): DerivedStore<T> {
  // Lazy State
  let currentState: { value: T } | undefined;
  const changeEmitter = emitter<void>();
  const eq = resolveEquality(equals || "strict");

  const computeState = () =>
    (selector as AnyFunc)(...dependencies.map((d) => d.getState()));

  const checkUpdates = () => {
    // If we have listeners, we must evaluate eagerly to know if we should emit
    if (changeEmitter.size() > 0) {
      const newState = computeState();
      // If we were dirty, we treat it as a change (or just update).
      // If we were clean, we compare.
      // Simpler: Just compare with current (if dirty, currentState might be stale, but we update it)

      // If dirty, we don't strictly know if it changed from "real" previous,
      // but we update to latest.
      if (!currentState || !eq(currentState.value, newState)) {
        currentState = { value: newState };
        changeEmitter.emit();
      }
    } else {
      currentState = undefined;
    }
  };

  // Subscribe to all dependencies
  dependencies.forEach((d) => d.onChange(checkUpdates));

  // Public Interface
  const getState = () => {
    if (!currentState) {
      currentState = { value: computeState() };
    }
    return currentState.value;
  };

  const derivedStore: DerivedStore<T> = withUse({
    name,
    dependencies,
    getState,
    onChange: (listener: () => void) => {
      return changeEmitter.on(listener);
    },
  });

  return derivedStore;
}
