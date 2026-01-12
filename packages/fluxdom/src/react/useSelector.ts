import type { AnyFunc, Equality, Store } from "../index";
import { useSyncExternalStore } from "react";

import { useRef, useMemo, useCallback } from "react";
import { resolveEquality } from "../equality";

/**
 * React hook for selecting data from FluxDom stores.
 *
 * Subscribes to one or more stores and re-renders the component when the selected
 * value changes. Supports custom equality checks to prevent unnecessary re-renders.
 *
 * @example Single store
 * ```tsx
 * const count = useSelector(counterStore, (state) => state.count);
 * ```
 *
 * @example Multiple stores
 * ```tsx
 * const total = useSelector(
 *   [store1, store2],
 *   (s1, s2) => s1.value + s2.value
 * );
 * ```
 *
 * @example With equality check
 * ```tsx
 * const user = useSelector(userStore, (state) => state.user, "shallow");
 * ```
 *
 * @example Full state (no selector)
 * ```tsx
 * const state = useSelector(counterStore);
 * ```
 *
 * @param storeOrStores - Single store or array of stores to subscribe to
 * @param selector - Function to derive state from store values (optional for single store)
 * @param equality - Optional equality strategy: "strict" | "shallow" | "shallow2" | "shallow3" | "deep" | custom function
 * @returns The selected value
 */
// Overload: Single store, no selector - returns full state
export function useSelector<TState>(store: Store<TState>): TState;
// Overload: Single store with selector
export function useSelector<TState, TSelected>(
  store: Store<TState>,
  selector: (state: TState) => TSelected,
  equality?: Equality<TSelected>
): TSelected;
// Overload: Multiple stores with selector
export function useSelector<
  const TStores extends readonly Store<any>[],
  TSelected
>(
  stores: TStores,
  selector: (
    ...states: {
      [K in keyof TStores]: TStores[K] extends Store<infer T> ? T : never;
    }
  ) => TSelected,
  equality?: Equality<TSelected>
): TSelected;
// Implementation
export function useSelector(
  storeOrStores: Store<any> | readonly Store<any>[],
  selector?: AnyFunc,
  equality?: Equality<any>
): any {
  // Normalize to array for unified handling
  const stores = Array.isArray(storeOrStores) ? storeOrStores : [storeOrStores];

  // Resolve equality strategy once (memoized)
  const equalityFn = useMemo(() => resolveEquality(equality), [equality]);

  // Cache previous snapshot for equality comparison
  const lastSnapshot = useRef<any>(undefined);

  // Snapshot getter - computes derived value and applies equality check
  const getSnapshot = useCallback(() => {
    const states = stores.map((s) => s.getState());
    // Default to identity if no selector (single store case)
    const nextValue = selector ? selector(...states) : states[0];

    // Return cached value if equal (prevents unnecessary re-renders)
    if (
      lastSnapshot.current !== undefined &&
      equalityFn(lastSnapshot.current, nextValue)
    ) {
      return lastSnapshot.current;
    }
    lastSnapshot.current = nextValue;
    return nextValue;
  }, [stores.length, ...stores, selector, equalityFn]);

  // Subscribe to all stores - any change triggers re-evaluation
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubs = stores.map((s) => s.onChange(onStoreChange));
      return () => unsubs.forEach((unsub) => unsub());
    },
    [stores.length, ...stores]
  );

  // Use same snapshot for SSR (no hydration mismatch)
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
