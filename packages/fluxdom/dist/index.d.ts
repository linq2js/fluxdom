import { Action, Domain, DerivedStore, Store } from "./types";
export * from "./types";
/**
 * Create a new FluxDom domain.
 *
 * A domain is the root container for state management. It provides:
 * - Store creation via `domain.store()`
 * - Module resolution via `domain.get()`
 * - Action dispatch via `domain.dispatch()`
 * - Sub-domain creation via `domain.domain()`
 *
 * @example
 * ```ts
 * const appDomain = domain<AppAction>("app");
 * const counterStore = appDomain.store("counter", 0, counterReducer);
 * ```
 *
 * @param name - Identifier for the domain (used for debugging)
 * @returns A new Domain instance
 */
export declare function domain<TAction extends Action = Action>(name: string): Domain<TAction>;
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
 * @returns A read-only DerivedStore
 */
export declare function derived<T, TStores extends Store<any>[]>(name: string, dependencies: [...TStores], selector: (...args: any[]) => T): DerivedStore<T>;
//# sourceMappingURL=index.d.ts.map