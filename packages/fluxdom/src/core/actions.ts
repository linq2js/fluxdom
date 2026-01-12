import {
  Action,
  ActionCreator,
  ActionsFromMap,
  ActionsWithReducer,
  InferState,
  MapAction,
  MapActionsUnion,
  Reducer,
  ReducerMap,
} from "../types";

/**
 * Create an action creator function with a `.type` property.
 *
 * @param type - The action type string (e.g., "increment")
 * @returns An action creator that returns { type, args }
 *
 * @example
 * ```ts
 * const increment = createActionCreator<"increment", []>("increment");
 * increment();        // { type: "increment", args: [] }
 * increment.type;     // "increment"
 *
 * const add = createActionCreator<"add", [number]>("add");
 * add(5);             // { type: "add", args: [5] }
 * ```
 */
export function createActionCreator<TKey extends string, TArgs extends any[]>(
  type: TKey
): ActionCreator<TKey, TArgs> {
  const creator = (...args: TArgs) =>
    ({ type, args } as { type: TKey; args: TArgs });
  Object.defineProperty(creator, "type", { value: type, writable: false });
  return creator as ActionCreator<TKey, TArgs>;
}

/**
 * Convert a reducer map to a standard reducer function.
 *
 * The reducer looks up the handler by matching the action type directly
 * against the handler keys in the map.
 *
 * @param map - Object mapping handler names to handler functions
 * @returns A reducer function compatible with createStore
 *
 * @example
 * ```ts
 * const reducer = createReducerFromMap({
 *   increment: (state) => state + 1,
 *   add: (state, amount: number) => state + amount,
 * });
 *
 * reducer(0, { type: "increment", args: [] }); // 1
 * reducer(0, { type: "add", args: [5] });      // 5
 * ```
 */
export function createReducerFromMap<TState>(
  map: ReducerMap<TState>
): Reducer<TState, MapAction> {
  return (state, action) => {
    // Look up handler by action type directly
    const handler = map[action.type];

    if (handler) {
      return handler(state, ...(action.args || []));
    }

    return state;
  };
}

/**
 * Generate action creators from a reducer map.
 *
 * Each key in the map becomes an action creator with:
 * - A function that returns { type, args }
 * - A `.type` property matching the handler key
 *
 * @param map - Object mapping handler names to handler functions
 * @returns Object with action creators matching the map keys
 *
 * @example
 * ```ts
 * const actions = createActionsFromMap({
 *   increment: (state) => state + 1,
 *   add: (state, amount: number) => state + amount,
 * });
 *
 * actions.increment.type;  // "increment"
 * actions.increment();     // { type: "increment", args: [] }
 * actions.add.type;        // "add"
 * actions.add(5);          // { type: "add", args: [5] }
 * ```
 */
export function createActionsFromMap<TState, TMap extends ReducerMap<TState>>(
  map: TMap
): ActionsFromMap<TState, TMap> {
  const actions = {} as ActionsFromMap<TState, TMap>;

  for (const key in map) {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      // Type assertion needed because we're building the object dynamically
      (actions as any)[key] = createActionCreator<typeof key, any[]>(key);
    }
  }

  return actions;
}

/**
 * Check if a value is a reducer map (object) vs a reducer function.
 *
 * @param value - The value to check
 * @returns true if it's an object (reducer map), false if it's a function
 */
export function isReducerMap<TState>(
  value: ReducerMap<TState> | ((...args: any[]) => any)
): value is ReducerMap<TState> {
  return typeof value === "object" && value !== null;
}

/**
 * Create action creators and a reducer from a handler map.
 *
 * This is the recommended way to define store actions in FluxDom.
 * Returns action creators with a combined `.reducer` property.
 *
 * @param map - Object mapping action names to handler functions
 * @param onDomainAction - Optional reducer to handle domain-level actions
 * @returns Action creators object with `.reducer` property
 *
 * @example
 * ```ts
 * import { domain, actions } from "fluxdom";
 *
 * // Basic usage
 * const app = domain("app");
 *
 * const counterActions = actions({
 *   increment: (state: number) => state + 1,
 *   decrement: (state: number) => state - 1,
 *   add: (state: number, amount: number) => state + amount,
 * });
 *
 * const store = app.store("counter", 0, counterActions.reducer);
 * store.dispatch(counterActions.increment());
 * store.dispatch(counterActions.add(5));
 * ```
 *
 * @example
 * ```ts
 * // With domain action handler
 * type AppAction = { type: "RESET_ALL" };
 * const app = domain<AppAction>("app");
 *
 * const counterActions = actions(
 *   {
 *     increment: (state: number) => state + 1,
 *   },
 *   // Second param: handles domain-level actions
 *   (state, action: AppAction) => {
 *     if (action.type === "RESET_ALL") return 0;
 *     return state;
 *   }
 * );
 *
 * const store = app.store("counter", 10, counterActions.reducer);
 * store.dispatch(counterActions.increment()); // 11
 * app.dispatch({ type: "RESET_ALL" });        // 0
 * ```
 *
 * @example
 * ```ts
 * // With Immer for mutable syntax
 * import { withImmer } from "fluxdom/immer";
 *
 * const todoActions = actions(withImmer({
 *   add: (state, text: string) => {
 *     state.items.push({ id: Date.now(), text, done: false });
 *   },
 *   toggle: (state, id: number) => {
 *     const item = state.items.find(t => t.id === id);
 *     if (item) item.done = !item.done;
 *   },
 * }));
 * ```
 */
export function actions<
  TMap extends ReducerMap<any>,
  TDomainAction extends Action = Action
>(
  map: TMap,
  onDomainAction?: Reducer<InferState<TMap>, TDomainAction>
): ActionsWithReducer<InferState<TMap>, TMap, TDomainAction> {
  type TState = InferState<TMap>;

  const actionCreators = createActionsFromMap<TState, TMap>(map as any);
  const mapReducer = createReducerFromMap<TState>(map as any);

  // Combined reducer: first try map handlers, then domain reducer
  const combinedReducer: Reducer<
    TState,
    MapActionsUnion<TState, TMap> | TDomainAction
  > = (state, action) => {
    // Check if it's a MapAction (has args property)
    if ("args" in action) {
      return mapReducer(state, action as MapAction);
    }

    // Otherwise, try domain reducer
    if (onDomainAction) {
      return onDomainAction(state, action as TDomainAction);
    }

    return state;
  };

  return Object.assign(actionCreators, {
    reducer: combinedReducer,
  }) as ActionsWithReducer<TState, TMap, TDomainAction>;
}
