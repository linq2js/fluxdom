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
export type Reducer<TState, TAction extends Action = Action> = (state: TState, action: TAction) => TState;
/**
 * Action shape used by reducer maps.
 * Contains the action type and an array of arguments.
 */
export interface MapAction<TArgs extends any[] = any[]> extends Action {
    type: string;
    args: TArgs;
}
/**
 * A handler function in a reducer map.
 * Receives state and optional arguments, returns new state.
 */
export type Handler<TState, TArgs extends any[] = []> = (state: TState, ...args: TArgs) => TState;
/**
 * A map of handler functions keyed by action name.
 */
export type ReducerMap<TState> = {
    [key: string]: Handler<TState, any[]>;
};
/**
 * An Immer handler function that can mutate state or return new state.
 * Used with fluxdom/immer where handlers can return void (mutate draft).
 */
export type ImmerHandler<TState, TArgs extends any[] = []> = (state: TState, ...args: TArgs) => TState | void;
/**
 * A map of Immer handler functions keyed by action name.
 * Handlers can either mutate state (return void) or return new state.
 */
export type ImmerReducerMap<TState> = {
    [key: string]: ImmerHandler<TState, any[]>;
};
/**
 * Infer state type from a reducer map.
 */
export type InferState<TMap> = TMap extends {
    [key: string]: Handler<infer S, any[]>;
} ? S : TMap extends {
    [key: string]: ImmerHandler<infer S, any[]>;
} ? S : never;
/**
 * Infer state type from a Store.
 */
export type StateOf<T> = T extends Store<infer S> ? S : never;
/**
 * Infer action type from a Domain or MutableStore.
 *
 * @example
 * ```ts
 * const app = domain<{ type: "INC" } | { type: "DEC" }>("app");
 * type AppAction = ActionOf<typeof app>; // { type: "INC" } | { type: "DEC" }
 *
 * const store = app.store("counter", 0, reducer);
 * type StoreAction = ActionOf<typeof store>; // inferred from store
 * ```
 */
export type ActionOf<T> = T extends Domain<infer A> ? A : T extends MutableStore<any, infer A, any> ? A : never;
/**
 * Action creator function with a `.type` property.
 * Calling it returns an action with type matching the handler key.
 *
 * @template TKey - The action name (e.g., "increment")
 * @template TArgs - The argument types for the action
 */
export interface ActionCreator<TKey extends string, TArgs extends any[]> {
    (...args: TArgs): {
        type: TKey;
        args: TArgs;
    };
    readonly type: TKey;
}
/**
 * Infer action creators from a reducer map.
 * Each handler becomes an action creator with matching parameter types.
 * Works with both ReducerMap and ImmerReducerMap.
 */
export type ActionsFromMap<TState, TMap extends ReducerMap<TState> | ImmerReducerMap<TState>> = {
    [K in keyof TMap]: TMap[K] extends Handler<TState, infer TArgs> ? ActionCreator<K & string, TArgs> : TMap[K] extends ImmerHandler<TState, infer TArgs> ? ActionCreator<K & string, TArgs> : never;
};
/**
 * Generate a union of valid action types from a reducer map.
 * Each action has type matching the handler key and args matching the handler params.
 * Works with both ReducerMap and ImmerReducerMap.
 *
 * @example
 * ```ts
 * // For map: { increment: (s, n: number) => s, decrement: (s) => s }
 * // Generates:
 * // | { type: "increment"; args: [number] }
 * // | { type: "decrement"; args: [] }
 * ```
 */
export type MapActionsUnion<TState, TMap extends ReducerMap<TState> | ImmerReducerMap<TState>> = {
    [K in keyof TMap]: TMap[K] extends Handler<TState, infer TArgs> ? {
        type: K & string;
        args: TArgs;
    } : TMap[K] extends ImmerHandler<TState, infer TArgs> ? {
        type: K & string;
        args: TArgs;
    } : never;
}[keyof TMap];
/**
 * Actions object with attached reducer.
 * Created by `actions()` - contains action creators and a reducer property.
 *
 * @example
 * ```ts
 * const counterActions = actions({
 *   inc: (state: number) => state + 1,
 *   add: (state: number, n: number) => state + n,
 * });
 *
 * counterActions.inc();       // { type: "inc", args: [] }
 * counterActions.reducer;     // (state, action) => newState
 * ```
 */
export type ActionsWithReducer<TState, TMap extends ReducerMap<TState>, TFallbackAction extends Action = Action> = ActionsFromMap<TState, TMap> & {
    readonly reducer: Reducer<TState, MapActionsUnion<TState, TMap> | TFallbackAction>;
};
/**
 * A thunk creator is a function that takes arguments and returns a thunk.
 * The thunk receives a context with getState and dispatch.
 *
 * @example
 * ```ts
 * // () => (ctx) => Promise<void>
 * const fetchTodos: ThunkCreator<TodoContext, [], Promise<void>> =
 *   () => async (ctx) => {
 *     const todos = await api.getTodos();
 *     ctx.dispatch(actions.setTodos(todos));
 *   };
 *
 * // (text: string) => (ctx) => Promise<void>
 * const addAsync: ThunkCreator<TodoContext, [string], Promise<void>> =
 *   (text) => async (ctx) => {
 *     await api.addTodo(text);
 *     ctx.dispatch(actions.add(text));
 *   };
 * ```
 */
export type ThunkCreator<TContext, TArgs extends any[], TResult = void> = (...args: TArgs) => (context: TContext) => TResult;
/**
 * A map of thunk creators.
 * Simplified type for better inference - context is loosely typed as `any`.
 */
export type ThunksMap<TContext> = Record<string, (...args: any[]) => (ctx: TContext) => any>;
/**
 * Input configuration for storeConfigs().
 */
export interface StoreConfigInput<TState, TReducers extends ReducerMap<TState>, TThunks extends ThunksMap<StoreContext<TState, MapActionsUnion<TState, TReducers>, TFallbackAction>>, TFallbackAction extends Action = Action> {
    /** Initial state value */
    initial: TState;
    /** Map of reducer handlers */
    reducers: TReducers;
    /** Map of thunk creators (optional) */
    thunks?: TThunks;
    /** Fallback reducer for unhandled actions (optional) */
    fallback?: Reducer<TState, TFallbackAction>;
}
/**
 * Input configuration for Immer storeConfigs().
 * Same as StoreConfigInput but allows handlers that return void (mutate draft).
 */
export interface ImmerStoreConfigInput<TState, TReducers extends ImmerReducerMap<TState>, TThunks extends ThunksMap<StoreContext<TState, MapActionsUnion<TState, TReducers>, TFallbackAction>>, TFallbackAction extends Action = Action> {
    /** Initial state value */
    initial: TState;
    /** Map of reducer handlers (can mutate state or return new state) */
    reducers: TReducers;
    /** Map of thunk creators (optional) */
    thunks?: TThunks;
    /** Fallback reducer for unhandled actions (optional, can mutate state) */
    fallback?: (state: TState, action: TFallbackAction) => TState | void;
}
/**
 * Output from storeConfigs().
 * Contains initial state, combined reducer, and action creators (reducers + thunks).
 */
export interface StoreConfigOutput<TState, TReducers extends ReducerMap<TState> | ImmerReducerMap<TState>, TThunks extends ThunksMap<StoreContext<TState, MapActionsUnion<TState, TReducers>, TFallbackAction>>, TFallbackAction extends Action = Action> {
    /** Initial state value */
    readonly initial: TState;
    /** Combined reducer handling all reducer actions and fallback */
    readonly reducer: Reducer<TState, MapActionsUnion<TState, TReducers> | TFallbackAction>;
    /** Action creators from reducers + thunk creators */
    readonly actions: ActionsFromMap<TState, TReducers> & TThunks;
}
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
    readonly name: string;
    /** Reference to the root domain of this hierarchy (or itself if root) */
    readonly root: Domain<any>;
    dispatch: Dispatch<DomainContext<TDomainAction>, TDomainAction>;
    /** Global listener for all actions flowing through this domain. */
    onDispatch(listener: OnDispatch<TDomainAction, DomainContext<TDomainAction>>): () => void;
    /**
     * Global listener for all actions flowing through this domain AND its descendants.
     * Bubbles up from all child stores and sub-domains.
     */
    onAnyDispatch(listener: OnDispatch): () => void;
    /** Resolve a module directly from the domain instance. */
    get: ResolveModule<TDomainAction>;
    /**
     * Override a module implementation.
     * Useful for testing (injecting mocks) or environment-specific config.
     * @returns A function to revert the override.
     */
    override<TModule>(source: ModuleDef<TModule, TDomainAction>, override: ModuleDef<TModule, TDomainAction>): VoidFunction;
    /**
     * Create a State Store within this domain.
     * The store will automatically receive actions dispatched to this Domain.
     *
     * @example
     * ```ts
     * // With custom reducer
     * const store = app.store("counter", 0, (state, action) => {
     *   switch (action.type) {
     *     case "increment": return state + 1;
     *     default: return state;
     *   }
     * });
     *
     * // With actions() helper
     * const counterActions = actions({
     *   increment: (state: number) => state + 1,
     *   add: (state: number, n: number) => state + n,
     * });
     * const store = app.store("counter", 0, counterActions.reducer);
     * store.dispatch(counterActions.increment());
     * ```
     */
    store<TState, TStoreActions extends Action = TDomainAction>(name: string, initial: TState, reducer: Reducer<TState, TStoreActions>): MutableStore<TState, TStoreActions, TDomainAction>;
    /** Create a sub-domain (child) that inherits context from this domain. */
    domain<TSubDomainAction extends Action = never>(name: string): Domain<TSubDomainAction | TDomainAction>;
    /**
     * Create a read-only Derived Store scoped to this domain.
     * Useful for computing state from multiple stores.
     */
    derived<TState, const TStores extends readonly Store<any>[]>(name: string, dependencies: TStores, selector: (...args: {
        [K in keyof TStores]: TStores[K] extends Store<infer T> ? T : never;
    }) => TState, equals?: Equality<TState>): DerivedStore<TState>;
}
/**
 * A Module Definition.
 * Static definition of a module, separated from its instantiation.
 */
export interface ModuleDef<TModule, TAction extends Action = any> {
    /** Unique name for the module (e.g. 'api', 'auth', 'logger') */
    readonly name: string;
    /** Factory function to create the module instance */
    readonly create: (domain: Domain<TAction>) => TModule;
}
/** Function signature to resolve a module from a definition. */
export type ResolveModule<TAction extends Action = Action> = <TModule>(definition: ModuleDef<TModule, TAction>) => TModule;
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
    onDispatch(listener: OnDispatch<TAction | TDomainAction, StoreContext<TState, TAction, TDomainAction>>): () => void;
}
/**
 * A Derived Store (Read-Only).
 * Created via global `derived()`. Tracks dependencies.
 */
export interface DerivedStore<TState> extends Store<TState> {
    dependencies: readonly Store<any>[];
}
export type Plugin<S, R = void> = (source: S) => R extends void ? void : R;
/**
 * Pipeable interface for extensibility via plugins.
 *
 * The `use()` method allows extending objects with new methods
 * or using them as context to create something.
 */
export interface Pipeable {
    /**
     * Apply a plugin function to this object.
     *
     * @param plugin - Function that receives this object and returns:
     *   - `void` — Original object is returned
     *   - Object with methods — Merged with original object
     *   - Any value — Returned as-is
     *
     * @example
     * ```ts
     * // Extension pattern: add new methods
     * const enhanced = store.use((s) => ({
     *   ...s,
     *   reset: () => s.dispatch({ type: "RESET" }),
     * }));
     *
     * enhanced.reset(); // Available
     * ```
     */
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
export type Listener<T> = (value: T) => void;
export type SingleOrMultipleListeners<T> = Listener<T> | Listener<T>[];
export type DispatchArgs<TAction, TContext> = {
    action: TAction;
    source: string;
    context: TContext;
};
export type OnDispatch<TAction = Action, TContext = unknown> = (args: DispatchArgs<TAction, TContext>) => void;
/**
 * Event emitter interface for pub/sub pattern.
 *
 * @template T - The type of payload emitted to listeners (defaults to void)
 */
export interface Emitter<T = void> {
    /**
     * Subscribe to events with one or more listeners.
     *
     * @param listeners - Single listener or array of listeners
     * @returns Unsubscribe function (idempotent - safe to call multiple times)
     */
    on(listeners: SingleOrMultipleListeners<T>): VoidFunction;
    /**
     * Subscribe with a mapping function that filters and transforms events.
     *
     * The map function receives the emitted value and returns either:
     * - `{ value: TValue }` - Listener is called with the transformed value
     * - `undefined` - Listener is NOT called (event filtered out)
     *
     * @template TValue - The transformed value type passed to listeners
     * @param map - Transform function that can filter (return undefined) or map values
     * @param listeners - Single listener or array of listeners for transformed values
     * @returns Unsubscribe function
     *
     * @example Filter and transform
     * ```ts
     * const emitter = emitter<{ type: string; data: number }>();
     *
     * // Only listen to 'success' events, extract just the data
     * emitter.on(
     *   (event) => event.type === 'success' ? { value: event.data } : undefined,
     *   (data) => console.log('Success data:', data)
     * );
     * ```
     */
    on<TValue>(map: (value: T) => {
        value: TValue;
    } | undefined, listeners: SingleOrMultipleListeners<TValue>): VoidFunction;
    /**
     * Emit an event to all registered listeners.
     *
     * @param payload - The value to pass to all listeners
     */
    emit(payload: T): void;
    /**
     * Emit an event to all registered listeners in LIFO (reverse) order.
     * Useful for cleanup scenarios where resources should be released
     * in reverse order of acquisition.
     *
     * @param payload - The value to pass to all listeners
     */
    emitLifo(payload: T): void;
    /**
     * Remove all registered listeners.
     */
    clear(): void;
    /**
     * Emit an event to all listeners, then clear all listeners.
     * Useful for one-time events like disposal.
     *
     * @param payload - The value to pass to all listeners
     */
    emitAndClear(payload: T): void;
    /**
     * Emit an event to all listeners in LIFO (reverse) order, then clear.
     * Useful for cleanup scenarios where resources should be released
     * in reverse order of acquisition.
     *
     * @param payload - The value to pass to all listeners
     */
    emitAndClearLifo(payload: T): void;
    /**
     * Emit to all listeners, clear, and "settle" the emitter.
     *
     * After settling:
     * - Any new `on()` call immediately invokes the listener with the settled payload
     * - Returns a no-op unsubscribe function
     * - `emit()` and `emitAndClear()` become no-ops
     *
     * Useful for one-time events where late subscribers should still receive the value
     * (similar to Promise behavior).
     *
     * @param payload - The final value to pass to all listeners
     */
    settle(payload: T): void;
    /** Number of registered listeners */
    size(): number;
    /** Whether the emitter has been settled */
    settled(): boolean;
}
//# sourceMappingURL=types.d.ts.map