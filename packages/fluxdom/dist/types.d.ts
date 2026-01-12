/** Base Action interface. All actions must have a `type`. */
export interface Action {
    type: string;
    meta?: {
        requestId?: string;
        correlationId?: string;
        source?: string;
        [k: string]: any;
    };
}
/** A pure function that transitions state based on an action. */
export type Reducer<TState, TAction extends Action> = (state: TState, action: TAction) => TState;
/**
 * A Thunk is a function that performs logic (async or sync)
 * and interacts with the system via a Context object.
 */
export type Thunk<TContext, TReturn = void> = (context: TContext) => TReturn;
/**
 * Polymorphic Dispatch.
 * Can dispatch a plain Action object OR a Thunk function.
 */
export interface Dispatch<TThunkContext, TAction extends Action = Action> {
    (action: TAction): void;
    <TResult>(thunk: Thunk<TThunkContext, TResult>): TResult;
}
export interface Domain<TDomainAction extends Action = Action> extends Pipeable {
    /** Name of the domain */
    name: string;
    dispatch: Dispatch<DomainContext<TDomainAction>, TDomainAction>;
    /** Global listener for all actions flowing through this domain. */
    onDispatch(listener: (action: TDomainAction, context: DomainContext<TDomainAction>) => void): () => void;
    /** Resolve a module directly from the domain instance. */
    get: ResolveModule<TDomainAction>;
    /**
     * Override a module implementation.
     * Useful for testing (injecting mocks) or environment-specific config.
     * @returns A function to revert the override.
     */
    override<TService>(source: ModuleFactory<TService, TDomainAction>, override: ModuleFactory<TService, TDomainAction>): VoidFunction;
    /**
     * Create a State Store within this domain.
     * The store will automatically receive actions dispatched to this Domain.
     */
    store<TState, TStoreActions extends Action = TDomainAction>(name: string, initial: TState, reducer: Reducer<TState, TStoreActions>): MutableStore<TState, TStoreActions, TDomainAction>;
    /** Create a sub-domain (child) that inherits context from this domain. */
    domain<SubAction extends Action = TDomainAction>(name: string): Domain<SubAction | TDomainAction>;
}
/**
 * A Factory function that creates a Module.
 * It receives the full Domain instance, allowing it to:
 * 1. Create internal private stores.
 * 2. Listen to domain events.
 * 3. Use other modules.
 */
export type ModuleFactory<TService, TAction extends Action = any> = (domain: Domain<TAction>) => {
    /** Unique name for the module (e.g. 'api', 'auth', 'logger') */
    name: string;
    /** The public API of the module */
    service: TService;
};
/** Function signature to resolve a module from a factory. */
export type ResolveModule<TAction extends Action = Action> = <TService>(factory: ModuleFactory<TService, TAction>) => TService;
/**
 * Context available to Domain-level logic.
 * Contains dispatch capabilities and module resolution.
 */
export interface DomainContext<TAction extends Action = Action> {
    dispatch: Dispatch<this, TAction>;
    /** Resolve a module by its factory. Lazy-loads if needed. */
    get: ResolveModule<TAction>;
}
/**
 * Context available to Store-level logic.
 * Extends Domain context with access to the Store's local state.
 */
export interface StoreContext<TState, TAction extends Action = Action, TDomainAction extends Action = Action> {
    dispatch: Dispatch<this, TAction>;
    domain: DomainContext<TDomainAction>;
    getState: () => TState;
}
/**
 * Base Readable Store.
 * Can be subscribed to, but not necessarily dispatched to.
 * Used for both 'Source Stores' and 'Derived Stores'.
 */
export interface Store<TState> extends Pipeable {
    /** Name of the store */
    name: string;
    /** Get the current snapshot of the state. */
    getState(): TState;
    /** Subscribe to state changes. */
    onChange(listener: () => void): () => void;
}
/**
 * A Writable Store.
 * created via `domain.store()`. Has dispatch capabilities.
 */
export interface MutableStore<TState, TAction extends Action, TDomainAction extends Action = Action> extends Store<TState> {
    /** Dispatch an action or thunk to this store. */
    dispatch: Dispatch<StoreContext<TState, TAction, TDomainAction>, TAction>;
    /**
     * Intercept actions dispatched to (or bubbling through) this store.
     * Useful for easy side-effects logging without middleware.
     */
    onDispatch(listener: (action: TAction | TDomainAction, context: StoreContext<TState, TAction, TDomainAction>) => void): () => void;
}
/**
 * A Derived Store (Read-Only).
 * Created via global `derived()`. Tracks dependencies.
 */
export interface DerivedStore<TState> extends Store<TState> {
    dependencies: Store<any>[];
}
export type Plugin<S, R = void> = (source: S) => R extends void ? void : R;
export interface Pipeable {
    use<P = void>(plugin: Plugin<this, P>): P extends void ? this : this & P;
}
/**
 * Generic function type for any function signature.
 * Used internally for type constraints.
 */
export type AnyFunc = (...args: any[]) => any;
/**
 * Built-in equality strategy names.
 *
 * Used with atoms to control when subscribers are notified:
 * - `"strict"` - Object.is (default, fastest)
 * - `"shallow"` - Compare object keys/array items with Object.is
 * - `"shallow2"` - 2 levels deep
 * - `"shallow3"` - 3 levels deep
 * - `"deep"` - Full recursive comparison (slowest)
 */
export type EqualityShorthand = "strict" | "shallow" | "shallow2" | "shallow3" | "deep";
/**
 * Equality strategy for change detection.
 *
 * Can be a shorthand string or custom comparison function.
 * Used by atoms to determine if value has "changed" -
 * if equal, subscribers won't be notified.
 *
 * @template T - Type of values being compared
 *
 * @example
 * ```ts
 * // Using shorthand
 * const [user, setUser] = atom(data, { equals: "shallow" });
 *
 * // Using custom function
 * const [user, setUser] = atom(data, {
 *   equals: (a, b) => a.id === b.id
 * });
 * ```
 */
export type Equality<T = unknown> = EqualityShorthand | ((a: T, b: T) => boolean);
/**
 * Prettify a type by adding all properties to the type.
 * @template T - The type to prettify
 * @returns The prettified type
 * @example
 * ```ts
 * type Person = { name: string; age: number };
 * type PrettifyPerson = Prettify<Person>; // { name: string; age: number; }
 * ```
 */
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
//# sourceMappingURL=types.d.ts.map