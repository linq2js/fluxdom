export interface DomainMeta {}

export interface StoreMeta {}

export interface ModuleMeta {}

// --- Core Primitives ---

/** Base Action interface. All actions must have a `type`. */
export interface Action {
  type: string;
}

/** Action that allows any additional properties. Used as fallback in dispatch. */
export type AnyAction = Action & { [key: string]: unknown };

/** A pure function that transitions state based on an action. */
export type Reducer<TState, TAction extends Action = Action> = (
  state: TState,
  action: TAction
) => TState;

// --- Reducer Map Types ---

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
export type Handler<TState, TArgs extends any[] = []> = (
  state: TState,
  ...args: TArgs
) => TState;

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
export type ImmerHandler<TState, TArgs extends any[] = []> = (
  state: TState,
  ...args: TArgs
) => TState | void;

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
}
  ? S
  : TMap extends { [key: string]: ImmerHandler<infer S, any[]> }
  ? S
  : never;

/**
 * Infer state type from a Store.
 */
export type StateOf<T> = T extends Store<infer S> ? S : never;

/**
 * Infer action type from various sources:
 * - MutableStore<any, TAction> -> TAction
 * - ActionCreator -> { type, payload }
 * - Record<string, ActionCreator> -> union of all actions
 *
 * @example
 * ```ts
 * const store = app.store("counter", 0, reducer);
 * type StoreAction = ActionOf<typeof store>; // inferred from store
 *
 * const counterActions = actions({ inc: true, add: (n: number) => n });
 * type CounterAction = ActionOf<typeof counterActions>;
 * // { type: "inc"; payload: void } | { type: "add"; payload: number }
 *
 * type IncAction = ActionOf<typeof counterActions.inc>;
 * // { type: "inc"; payload: void }
 * ```
 */
export type ActionOf<T> =
  // MutableStore -> extract TAction
  T extends MutableStore<any, infer A>
    ? A
    : // Single ActionCreator -> extract action shape
    T extends { type: infer TType; (...args: any[]): infer TAction }
    ? TAction extends { type: TType }
      ? TAction
      : never
    : // Record<string, ActionCreator> -> union of all actions
    T extends Record<string, { type: string; (...args: any[]): infer TAction }>
    ? TAction
    : never;

/**
 * Action creator function with a `.type` property.
 * Calling it returns an action with type matching the handler key.
 *
 * @template TKey - The action name (e.g., "increment")
 * @template TArgs - The argument types for the action
 */
export interface ActionCreator<TKey extends string, TArgs extends any[]> {
  (...args: TArgs): { type: TKey; args: TArgs };
  readonly type: TKey;
}

/**
 * Infer action creators from a reducer map.
 * Each handler becomes an action creator with matching parameter types.
 * Works with both ReducerMap and ImmerReducerMap.
 */
export type ActionsFromMap<
  TState,
  TMap extends ReducerMap<TState> | ImmerReducerMap<TState>
> = {
  [K in keyof TMap]: TMap[K] extends Handler<TState, infer TArgs>
    ? ActionCreator<K & string, TArgs>
    : TMap[K] extends ImmerHandler<TState, infer TArgs>
    ? ActionCreator<K & string, TArgs>
    : never;
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
export type MapActionsUnion<
  TState,
  TMap extends ReducerMap<TState> | ImmerReducerMap<TState>
> = {
  [K in keyof TMap]: TMap[K] extends Handler<TState, infer TArgs>
    ? { type: K & string; args: TArgs }
    : TMap[K] extends ImmerHandler<TState, infer TArgs>
    ? { type: K & string; args: TArgs }
    : never;
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
export type ActionsWithReducer<
  TState,
  TMap extends ReducerMap<TState>,
  TFallbackAction extends Action = Action
> = ActionsFromMap<TState, TMap> & {
  readonly reducer: Reducer<
    TState,
    MapActionsUnion<TState, TMap> | TFallbackAction
  >;
};

// --- Store Config Types ---

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
export type ThunkCreator<TContext, TArgs extends any[], TResult = void> = (
  ...args: TArgs
) => (context: TContext) => TResult;

/**
 * A map of thunk creators.
 * Simplified type for better inference - context is loosely typed as `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThunksMap<TContext> = Record<
  string,
  (...args: any[]) => (ctx: TContext) => any
>;

/**
 * Input configuration for storeConfigs().
 */
export interface StoreConfigInput<
  TState,
  TReducers extends ReducerMap<TState>,
  TThunks extends ThunksMap<
    StoreContext<TState, MapActionsUnion<TState, TReducers>>
  >,
  TFallbackAction extends Action = Action
> {
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
export interface ImmerStoreConfigInput<
  TState,
  TReducers extends ImmerReducerMap<TState>,
  TThunks extends ThunksMap<
    StoreContext<TState, MapActionsUnion<TState, TReducers>>
  >,
  TFallbackAction extends Action = Action
> {
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
export interface StoreConfigOutput<
  TState,
  TReducers extends ReducerMap<TState> | ImmerReducerMap<TState>,
  TThunks extends ThunksMap<
    StoreContext<TState, MapActionsUnion<TState, TReducers>>
  >,
  TFallbackAction extends Action = Action
> {
  /** Initial state value */
  readonly initial: TState;
  /** Combined reducer handling all reducer actions and fallback */
  readonly reducer: Reducer<
    TState,
    MapActionsUnion<TState, TReducers> | TFallbackAction
  >;
  /** Action creators from reducers + thunk creators */
  readonly actions: ActionsFromMap<TState, TReducers> & TThunks;
}

// --- Thunk & Dispatch System ---

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

// --- Module & Injection System ---

/**
 * Domain - root container for state management.
 *
 * Domains can dispatch any action (AnyAction) - type safety comes from action creators.
 * Stores and subdomains within a domain also have no action restrictions.
 */
export interface Domain extends Pipeable {
  /** Name of the domain */
  readonly name: string;

  readonly meta?: DomainMeta;

  /** Reference to the root domain of this hierarchy (or itself if root) */
  readonly root: Domain;

  // Domain dispatch accepts any action - type safety comes from action creators
  dispatch: Dispatch<DomainContext, AnyAction>;

  /** Global listener for all actions flowing through this domain. */
  onDispatch(listener: OnDispatch<AnyAction, DomainContext>): () => void;

  /**
   * Global listener for all actions flowing through this domain AND its descendants.
   * Bubbles up from all child stores and sub-domains.
   */
  onAnyDispatch(listener: OnDispatch): () => void;

  /** Resolve a module directly from the domain instance. */
  get: ResolveModule;

  /**
   * Override a module implementation.
   * Useful for testing (injecting mocks) or environment-specific config.
   * @returns A function to revert the override.
   */
  override<TModule>(
    source: ModuleDef<TModule>,
    override: ModuleDef<TModule>
  ): VoidFunction;

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
   * const store = app.store({
   *   name: "counter",
   *   initial: 0,
   *   reducer: counterActions.reducer,
   *   equals: "shallow", // optional
   * });
   * store.dispatch(counterActions.increment());
   * ```
   */
  store<TState, TStoreActions extends Action>(
    config: StoreConfig<TState, TStoreActions>
  ): MutableStore<TState, TStoreActions>;

  /** Create a sub-domain (child) that inherits context from this domain. */
  domain(name: string, meta?: DomainMeta): Domain;

  /**
   * Create a read-only Derived Store scoped to this domain.
   * Useful for computing state from multiple stores.
   */
  derived<TState, const TStores extends readonly Store<any>[]>(
    name: string,
    dependencies: TStores,
    selector: (
      ...args: {
        [K in keyof TStores]: TStores[K] extends Store<infer T> ? T : never;
      }
    ) => TState,
    equals?: Equality<TState>
  ): DerivedStore<TState>;

  /**
   * Create a Model — a store with bound action methods.
   *
   * Models provide a cleaner API by binding actions and thunks directly
   * to the returned object. Under the hood, it's still a store with
   * proper action dispatch, so middleware and listeners work normally.
   *
   * @param config - Model configuration object
   *
   * @example
   * ```ts
   * const counter = app.model({
   *   name: "counter",
   *   initial: 0,
   *   actions: (ctx) => ({
   *     increment: (state) => state + 1,
   *     add: (state, n: number) => state + n,
   *     reset: ctx.reset,
   *   }),
   *   thunks: () => ({
   *     fetchAndSet: (url: string) => async ({ dispatch }) => {
   *       const value = await fetch(url).then(r => r.json());
   *       dispatch({ type: "add", args: [value] });
   *     },
   *   }),
   *   equals: "shallow", // optional equality strategy
   * });
   *
   * counter.increment();     // bound action
   * counter.add(5);          // bound action with arg
   * counter.fetchAndSet(url); // bound thunk
   * counter.getState();      // 6
   * ```
   */
  model<
    TState,
    TActionMap extends ModelActionMap<TState>,
    TThunkMap extends ModelThunkMap<
      TState,
      MapActionsUnion<TState, TActionMap>
    > = Record<string, never>
  >(
    config: ModelConfig<TState, TActionMap, TThunkMap>
  ): ModelWithMethods<TState, TActionMap, TThunkMap>;

  /**
   * Register a plugin that hooks into store, domain, and module methods.
   *
   * Plugins are batched - all pre hooks run in order, then the operation,
   * then all post hooks in order.
   *
   * @param config - Plugin configuration with filter/pre/post hooks
   * @returns The domain itself for chaining
   *
   * @example
   * ```ts
   * const app = domain("app")
   *   .plugin({
   *     store: {
   *       pre: (config) => console.log("[store:pre]", config.name),
   *       post: (store) => console.log("[store:post]", store.getState()),
   *     },
   *   })
   *   .plugin({
   *     domain: {
   *       post: (d) => console.log("[domain:created]", d.name),
   *     },
   *   });
   * ```
   */
  plugin(config: DomainPluginConfig): this;
}

/**
 * A Module Definition.
 * Static definition of a module, separated from its instantiation.
 *
 * Modules are singletons shared across the entire domain hierarchy.
 * The `create` function always receives the **root domain**, ensuring
 * consistent behavior regardless of which subdomain first requests the module.
 */
export interface ModuleDef<TModule> {
  /** Unique name for the module (e.g. 'api', 'auth', 'logger') */
  readonly name: string;

  readonly meta?: ModuleMeta;
  /**
   * Factory function to create the module instance.
   * @param domain - The root domain (always root, never a subdomain)
   */
  readonly create: (domain: Domain) => TModule;
}

/** Function signature to resolve a module from a definition. */
export type ResolveModule = <TModule>(
  definition: ModuleDef<TModule>
) => TModule;

// --- Contexts ---

/**
 * Context available to Domain-level logic.
 * Contains dispatch capabilities and module resolution.
 */
export interface DomainContext {
  // Domain dispatch accepts any action - type safety comes from action creators
  dispatch: Dispatch<this, AnyAction>;
  /** Resolve a module by its factory. Lazy-loads if needed. */
  get: ResolveModule;
}

/**
 * Context available to Store-level logic.
 * Extends Domain context with access to the Store's local state.
 */
export interface StoreContext<TState, TAction extends Action = Action> {
  dispatch: Dispatch<this, TAction>;
  domain: DomainContext;
  getState: () => TState;
}

// --- Main Interfaces ---

/**
 * Base Readable Store.
 * Can be subscribed to, but not necessarily dispatched to.
 * Used for both 'Source Stores' and 'Derived Stores'.
 */
export interface Store<TState> extends Pipeable {
  /** Name of the store */
  name: string;

  meta?: StoreMeta;

  /** Get the current snapshot of the state. */
  getState(): TState;

  /** Subscribe to state changes. */
  onChange(listener: () => void): () => void;
}

/**
 * A Writable Store.
 * created via `domain.store()`. Has dispatch capabilities.
 */
export interface MutableStore<TState, TAction extends Action>
  extends Store<TState> {
  /** Dispatch an action or thunk to this store. */
  dispatch: Dispatch<StoreContext<TState, TAction>, TAction>;

  /**
   * Intercept actions dispatched to (or bubbling through) this store.
   * Useful for easy side-effects logging without middleware.
   */
  onDispatch(
    listener: OnDispatch<TAction | AnyAction, StoreContext<TState, TAction>>
  ): () => void;
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
export type EqualityShorthand =
  | "strict"
  | "shallow"
  | "shallow2"
  | "shallow3"
  | "deep";

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
export type Equality<T = unknown> =
  | EqualityShorthand
  | ((a: T, b: T) => boolean);

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
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type Listener<T> = (value: T) => void;

export type SingleOrMultipleListeners<T> = Listener<T> | Listener<T>[];

export type DispatchArgs<TAction, TContext> = {
  action: TAction;
  source: string;
  context: TContext;
};

export type OnDispatch<TAction = Action, TContext = unknown> = (
  args: DispatchArgs<TAction, TContext>
) => void;

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
  on<TValue>(
    map: (value: T) => { value: TValue } | undefined,
    listeners: SingleOrMultipleListeners<TValue>
  ): VoidFunction;

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

// ============================================
// Model Types
// ============================================

/**
 * Action matcher for action context.
 * Can be an action creator with `.match()` method.
 */
export interface ActionMatcher<TAction extends Action> {
  match: (action: Action) => action is TAction;
}

/**
 * Built-in reducer helpers for common patterns.
 */
export interface ModelReducerHelpers<TState> {
  /** Returns initial state (reset to default) */
  reset: (state: TState) => TState;
  /** Sets state to the given value */
  set: (state: TState, value: TState) => TState;
}

/**
 * Context provided to action builder in model().
 * Contains helper functions for common reducer patterns and
 * methods to handle domain actions via `on()`.
 *
 * All matched handlers registered via `on()` run in sequence — no "first match wins".
 * Each handler receives the result of the previous one.
 *
 * @example
 * ```ts
 * app.model({
 *   name: "counter",
 *   initial: 0,
 *   actions: (ctx) => {
 *     // Handle domain actions with ctx.on()
 *     ctx.on(appActions.logout, ctx.reducers.reset);
 *     ctx.on([appActions.clear, appActions.reset], ctx.reducers.reset);
 *
 *     // Catch-all handler (receives AnyAction)
 *     ctx.on((state, action) => {
 *       console.log("Received:", action.type);
 *       return state;
 *     });
 *
 *     // Return action handlers
 *     return {
 *       increment: (state) => state + 1,
 *       reset: ctx.reducers.reset,
 *     };
 *   },
 * });
 * ```
 */
export interface ModelActionContext<TState> {
  /** Built-in reducer helpers (reset, set) */
  reducers: ModelReducerHelpers<TState>;

  /**
   * Register a catch-all handler for any action not handled by action map.
   * Receives AnyAction (action with any properties).
   */
  on(handler: (state: TState, action: AnyAction) => TState): void;

  /**
   * Register a handler for a specific action.
   * Uses the action creator's `.match()` method for type-safe matching.
   */
  on<TAction extends Action>(
    action: ActionMatcher<TAction>,
    handler: (state: TState, action: TAction) => TState
  ): void;

  /**
   * Register a handler for multiple actions.
   * Handler runs if any of the actions match.
   */
  on<TAction extends Action>(
    actions: ActionMatcher<TAction>[],
    handler: (state: TState, action: TAction) => TState
  ): void;
}

/**
 * Action handler for model() — sync reducer function.
 */
export type ModelActionHandler<TState, TArgs extends any[] = []> = (
  state: TState,
  ...args: TArgs
) => TState;

/**
 * Map of action handlers returned by actionBuilder in model().
 */
export type ModelActionMap<TState> = Record<
  string,
  ModelActionHandler<TState, any[]>
>;

/**
 * Infer action creator type from handler.
 * Handler args (minus state) become action creator args.
 */
export type ModelBoundAction<THandler> = THandler extends (state: any) => any
  ? () => void
  : THandler extends (state: any, ...args: infer TArgs) => any
  ? (...args: TArgs) => void
  : never;

/**
 * Map all action handlers to bound action methods.
 */
export type ModelBoundActions<TMap extends ModelActionMap<any>> = {
  [K in keyof TMap]: ModelBoundAction<TMap[K]>;
};

/**
 * Infer action union from action map for internal dispatch typing.
 */
export type ModelActionUnion<TMap extends ModelActionMap<any>> = {
  [K in keyof TMap]: TMap[K] extends ModelActionHandler<any, infer TArgs>
    ? {
        type: K & string;
        payload: TArgs extends [] ? void : TArgs extends [infer P] ? P : TArgs;
      }
    : never;
}[keyof TMap];

/**
 * Action creator generated from a model action handler.
 * Maps handler args to action object with { type, args }.
 */
export type ModelActionCreator<
  TKey extends string,
  THandler
> = THandler extends (state: any) => any
  ? () => { type: TKey; args: [] }
  : THandler extends (state: any, ...args: infer TArgs) => any
  ? (...args: TArgs) => { type: TKey; args: TArgs }
  : never;

/**
 * Map action handlers to action creators.
 */
export type ModelActionCreators<TActionMap extends ModelActionMap<any>> = {
  [K in keyof TActionMap & string]: ModelActionCreator<K, TActionMap[K]>;
};

// =============================================================================
// Task Helper Types (for effects)
// =============================================================================

/**
 * Options for the task() helper in effects.
 * Provides lifecycle hooks for async operations.
 *
 * Each callback can return:
 * - `Action` → dispatched automatically to this model's store
 * - `void` → listener only, no auto-dispatch (user handles manually)
 *
 * @example
 * ```ts
 * // Return action → auto-dispatched
 * start: () => actions.setLoading(true)
 *
 * // Return void → manual control
 * start: () => {
 *   domain.dispatch({ type: 'SYNC_START' });
 *   otherModel.setLoading(true);
 * }
 * ```
 */
export interface TaskOptions<TResult, TError = Error> {
  /** Called before async operation starts. Return action to dispatch, or void for manual control. */
  start?: () => Action | void;
  /** Called when operation succeeds. Return action to dispatch, or void for manual control. */
  done?: (result: TResult) => Action | void;
  /** Called when operation fails (error is re-thrown after). Return action to dispatch, or void for manual control. */
  fail?: (error: TError) => Action | void;
  /** Called after done OR fail. Return action to dispatch, or void for manual control. */
  end?: (
    error: TError | undefined,
    result: TResult | undefined
  ) => Action | void;
}

/**
 * Task helper for wrapping async operations with lifecycle dispatching.
 * Accepts any PromiseLike (native Promises, Bluebird, jQuery Deferreds, etc.)
 */
export interface TaskHelper {
  /**
   * Wrap a promise/thenable - dispatches lifecycle actions.
   * @returns The same promise result
   */
  <TResult>(
    promise: PromiseLike<TResult>,
    options: TaskOptions<TResult>
  ): Promise<TResult>;

  /**
   * Wrap an async function - returns function with same signature.
   * @returns Wrapped function that dispatches lifecycle actions
   */
  <TArgs extends any[], TResult>(
    fn: (...args: TArgs) => PromiseLike<TResult>,
    options: TaskOptions<TResult>
  ): (...args: TArgs) => Promise<TResult>;
}

// =============================================================================
// Model Effects Types
// =============================================================================

/**
 * Context provided to effects builder in model().
 * Effects are regular functions that capture this context in closure.
 *
 * @example
 * ```ts
 * effects: ({ task, actions, dispatch, getState, domain }) => ({
 *   fetchData: task(
 *     async () => {
 *       const api = domain.get(ApiModule);
 *       return await api.fetch();
 *     },
 *     {
 *       start: () => actions.setLoading(true),
 *       done: (data) => actions.setData(data),
 *       fail: (err) => actions.setError(err.message),
 *       end: () => actions.setLoading(false),
 *     }
 *   ),
 *   addItem: async (title: string) => {
 *     const state = getState();
 *     if (state.loading) return;
 *     dispatch(actions.add(title));
 *   }
 * })
 * ```
 */
export interface ModelEffectsContext<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TActions extends Action = MapActionsUnion<TState, TActionMap>
> {
  /** Task helper for async operations with lifecycle dispatching */
  task: TaskHelper;
  /** Type-safe action creators from the actions builder */
  actions: ModelActionCreators<TActionMap>;
  /** Initial state value (for reference, e.g., reset effects) */
  initial: TState;
  /** Dispatch actions to this model's store */
  dispatch: Dispatch<StoreContext<TState, TActions>, TActions>;
  /** Get current state of this model's store */
  getState: () => TState;
  /** Parent domain (for accessing modules, other stores, etc.) */
  domain: Domain;
}

/**
 * A model effect - regular function (not curried).
 * Context (task, dispatch, getState, domain) is captured from closure.
 */
export type ModelEffect<TArgs extends any[] = any[], TResult = any> = (
  ...args: TArgs
) => TResult;

/**
 * Map of effects returned by effectsBuilder in model().
 * Effects are regular functions - context is in closure.
 */
export type ModelEffectsMap<_TState, _TActions extends Action> = Record<
  string,
  ModelEffect<any[], any>
>;

/**
 * Map effects to their bound method types.
 * Since effects are already regular functions, this is just identity mapping.
 */
export type ModelBoundEffects<TMap> = {
  [K in keyof TMap]: TMap[K];
};

// Legacy aliases for backward compatibility
/** @deprecated Use ModelEffectsContext instead */
export type ModelThunkContext<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TActions extends Action = MapActionsUnion<TState, TActionMap>
> = ModelEffectsContext<TState, TActionMap, TActions>;

/** @deprecated Use ModelEffectsMap instead */
export type ModelThunkMap<TState, TActions extends Action> = ModelEffectsMap<
  TState,
  TActions
>;

/** @deprecated Use ModelBoundEffects instead */
export type ModelBoundThunks<TMap> = ModelBoundEffects<TMap>;

/**
 * Model base type - extends MutableStore so it can be used anywhere a store is expected.
 * This means models work with useSelector, derived(), and any store-based APIs.
 */
export type Model<
  TState,
  TActionMap extends ModelActionMap<TState>,
  _TEffectsMap
> = MutableStore<TState, MapActionsUnion<TState, TActionMap>>;

/**
 * Full model type with bound action and effect methods.
 * Model IS a MutableStore, plus bound action/effect methods attached directly.
 */
export type ModelWithMethods<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TEffectsMap
> = Model<TState, TActionMap, TEffectsMap> &
  ModelBoundActions<TActionMap> &
  ModelBoundEffects<TEffectsMap>;

/**
 * Configuration options for domain.store().
 */
export interface StoreConfig<TState, TAction extends Action = Action> {
  /** Store name (will be prefixed with domain name) */
  name: string;

  /** Initial state value */
  initial: TState;

  /** Reducer function to handle actions */
  reducer: Reducer<TState, TAction>;

  /** Optional equality strategy for change detection */
  equals?: Equality<TState>;

  meta?: StoreMeta;
}

/**
 * Configuration options for domain.model().
 */
export interface ModelConfig<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TEffectsMap extends ModelEffectsMap<
    TState,
    MapActionsUnion<TState, TActionMap>
  >
> {
  /** Store name (will be prefixed with domain name) */
  name: string;

  /** Initial state value */
  initial: TState;

  /**
   * Action builder function that receives context helpers and returns action handlers.
   *
   * Use `ctx.on()` to handle domain actions (cross-cutting concerns like RESET_ALL, LOGOUT).
   * Use `ctx.reducers` for built-in helpers (reset, set).
   *
   * @example
   * ```ts
   * actions: (ctx) => {
   *   // Handle domain actions
   *   ctx.on(appActions.logout, ctx.reducers.reset);
   *   ctx.on([appActions.clear, appActions.reset], ctx.reducers.reset);
   *
   *   // Return action handlers
   *   return {
   *     increment: (state) => state + 1,
   *     reset: ctx.reducers.reset,
   *   };
   * }
   * ```
   */
  actions: (ctx: ModelActionContext<TState>) => TActionMap;

  /**
   * Optional effects builder function that returns effect functions.
   * Effects are async operations with optional lifecycle hooks via task().
   *
   * @example
   * ```ts
   * effects: ({ task, actions, dispatch, getState, domain }) => ({
   *   fetchTodos: task(
   *     async () => {
   *       const api = domain.get(ApiModule);
   *       return await api.fetchTodos();
   *     },
   *     {
   *       start: () => actions.setLoading(true),
   *       done: (items) => actions.setItems(items),
   *       fail: (err) => actions.setError(err.message),
   *     }
   *   ),
   *   reset: () => {
   *     dispatch(actions.setItems([]));
   *   },
   * })
   * ```
   */
  effects?: (ctx: ModelEffectsContext<TState, TActionMap>) => TEffectsMap;

  /** Optional equality strategy for change detection */
  equals?: Equality<TState>;

  meta?: StoreMeta;
}

export interface DomainConfig {
  name: string;
  meta?: DomainMeta;
}

// =============================================================================
// Domain Plugin Types
// =============================================================================

/**
 * Configuration for domain plugins.
 *
 * Plugins can hook into store, domain, and module methods:
 * - `pre` hooks can transform config before method executes (return new config or void)
 * - `post` hooks receive created instance for side effects (must return void)
 * - `filter` skips hooks if returns false
 *
 * Hooks are batched - all pre hooks run in order, then the operation,
 * then all post hooks in order.
 *
 * @example
 * ```ts
 * const app = domain("app").plugin({
 *   store: {
 *     pre: (config) => {
 *       console.log('[store:pre]', config.name);
 *       // Can return modified config or void (use original)
 *     },
 *     post: (store) => {
 *       console.log('[store:post]', store.getState());
 *       // Must return void - side effects only
 *     },
 *   },
 * });
 * ```
 */

export interface DomainPluginConfig {
  /**
   * Hooks for domain creation.
   */
  domain?: {
    /**
     * Filter function to determine if this plugin should run.
     * If returns false, pre/post hooks are skipped for this domain.
     */
    filter?: (config: DomainConfig) => boolean;
    /**
     * Called before a sub-domain is created.
     * Can return modified config or void to use original.
     */
    pre?: (config: DomainConfig) => DomainConfig | void;
    /**
     * Called after a sub-domain is created.
     * For side effects only - must return void.
     */
    post?: (domain: Domain, config: DomainConfig) => void;
  };

  /**
   * Hooks for store/model creation.
   */
  store?: {
    /**
     * Filter function to determine if this plugin should run.
     * If returns false, pre/post hooks are skipped for this store.
     * @example
     * ```ts
     * // Only apply to stores with meta.persisted = true
     * filter: (config) => config.meta?.persisted === true
     * ```
     */
    filter?: (config: StoreConfig<any, any>) => boolean;
    /**
     * Called before a store is created.
     * Can return modified config or void to use original.
     */
    pre?: (config: StoreConfig<any, any>) => StoreConfig<any, any> | void;
    /**
     * Called after a store is created.
     * For side effects only - must return void.
     */
    post?: (
      store: MutableStore<any, any>,
      config: StoreConfig<any, any>
    ) => void;
  };

  /**
   * Hooks for module instantiation.
   */
  module?: {
    /**
     * Filter function to determine if this plugin should run.
     * If returns false, pre/post hooks are skipped for this module.
     */
    filter?: (definition: ModuleDef<any>) => boolean;
    /**
     * Called before a module is instantiated.
     * Can return modified definition or void to use original.
     */
    pre?: (definition: ModuleDef<any>) => ModuleDef<any> | void;
    /**
     * Called after a module is instantiated.
     * Receives both the instance and its definition.
     * For side effects only - must return void.
     */
    post?: (instance: any, definition: ModuleDef<any>) => void;
  };
}
