import {
  ActionCreator,
  ActionsFromMap,
  MapAction,
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
  const creator = (...args: TArgs) => ({ type, args }) as { type: TKey; args: TArgs };
  (creator as ActionCreator<TKey, TArgs>).type = type;
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
