import type { Equality, Store } from "./index";
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
export declare function useSelector<TState>(store: Store<TState>): TState;
export declare function useSelector<TState, TSelected>(store: Store<TState>, selector: (state: TState) => TSelected, equality?: Equality<TSelected>): TSelected;
export declare function useSelector<const TStores extends readonly Store<any>[], TSelected>(stores: TStores, selector: (...states: {
    [K in keyof TStores]: TStores[K] extends Store<infer T> ? T : never;
}) => TSelected, equality?: Equality<TSelected>): TSelected;
export * from "./index";
//# sourceMappingURL=react.d.ts.map