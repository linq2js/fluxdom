import { Action, Reducer } from "../types";

// --- Types ---

/** Unified action creator type */
export interface ActionCreator<
  TType extends string,
  TArgs extends any[] = [],
  TPayload = void
> {
  (...args: TArgs): { type: TType; payload: TPayload };
  type: TType;
  match: (action: Action) => action is { type: TType; payload: TPayload };
}

/** Any action creator */
export type AnyActionCreator = ActionCreator<any, any, any>;

/** Map of action definitions */
export type ActionDefinitionMap = {
  [key: string]:
    | true // no payload, type = key
    | string // no payload, custom type
    | ((...args: any[]) => any) // with prepare function
    | { type: string; prepare: (...args: any[]) => any }; // full config
};

/** Helper to build prefixed type */
type PrefixedType<
  TPrefix extends string,
  TType extends string
> = TPrefix extends "" ? TType : `${TPrefix}/${TType}`;

/** Infer action creator type from a single definition with optional prefix */
type InferActionCreator<
  TKey extends string,
  TDef,
  TPrefix extends string = ""
> = TDef extends true
  ? ActionCreator<PrefixedType<TPrefix, TKey>>
  : TDef extends string
  ? ActionCreator<TDef> // Custom type is used as-is (no prefix)
  : TDef extends (...args: infer TArgs) => infer TPayload
  ? ActionCreator<PrefixedType<TPrefix, TKey>, TArgs, TPayload>
  : TDef extends {
      type: infer TType;
      prepare: (...args: infer TArgs) => infer TPayload;
    }
  ? TType extends string
    ? ActionCreator<TType, TArgs, TPayload> // Explicit type is used as-is (no prefix)
    : never
  : never;

/** Infer action creators map from definitions */
export type InferActionCreators<
  TMap extends ActionDefinitionMap,
  TPrefix extends string = ""
> = {
  [K in keyof TMap]: K extends string
    ? InferActionCreator<K, TMap[K], TPrefix>
    : never;
};

/** Infer action from action creator */
export type InferAction<T> = T extends ActionCreator<
  infer TType,
  any,
  infer TPayload
>
  ? { type: TType; payload: TPayload }
  : never;

/** Infer action union from action creator map */
export type InferActionsFromMap<TMap> = TMap extends Record<
  string,
  AnyActionCreator
>
  ? InferAction<TMap[keyof TMap]>
  : never;

/** Input types for actions.reducer */
export type ActionsInput =
  | Record<string, AnyActionCreator>
  | AnyActionCreator
  | readonly (Record<string, AnyActionCreator> | AnyActionCreator)[];

/** Infer action union from ActionsInput */
type InferActionsFromInput<T> = T extends readonly (infer U)[]
  ? U extends Record<string, AnyActionCreator>
    ? InferActionsFromMap<U>
    : U extends AnyActionCreator
    ? InferAction<U>
    : never
  : T extends Record<string, AnyActionCreator>
  ? InferActionsFromMap<T>
  : T extends AnyActionCreator
  ? InferAction<T>
  : never;

// --- Implementation ---

/**
 * Create an action creator.
 */
function createActionCreator<
  TType extends string,
  TArgs extends any[] = [],
  TPayload = void
>(
  type: TType,
  prepare?: (...args: TArgs) => TPayload
): ActionCreator<TType, TArgs, TPayload> {
  const creator = ((...args: TArgs) => ({
    type,
    payload: prepare ? prepare(...args) : undefined,
  })) as ActionCreator<TType, TArgs, TPayload>;

  (creator as any).type = type;
  (creator as any).match = (
    action: Action
  ): action is { type: TType; payload: TPayload } => action.type === type;

  return creator;
}

/**
 * Create action creators from a definition map.
 *
 * @example
 * ```ts
 * // Basic usage (no prefix)
 * const counterActions = actions({
 *   increment: true,                              // { type: "increment", payload: void }
 *   decrement: "COUNTER_DECREMENT" as const,      // { type: "COUNTER_DECREMENT", payload: void }
 *   incrementBy: (n: number) => n,                // { type: "incrementBy", payload: n }
 *   set: { type: "SET", prepare: (v: number) => ({ value: v }) }
 * });
 *
 * counterActions.increment();      // { type: "increment", payload: undefined }
 * counterActions.decrement();      // { type: "COUNTER_DECREMENT", payload: undefined }
 * counterActions.incrementBy(5);   // { type: "incrementBy", payload: 5 }
 * counterActions.set(10);          // { type: "SET", payload: { value: 10 } }
 * ```
 *
 * @example
 * ```ts
 * // With prefix for namespacing (like RTK slices)
 * const todoActions = actions("todos", {
 *   add: (title: string) => ({ title }),
 *   remove: (id: number) => ({ id }),
 *   toggle: (id: number) => id,
 * });
 *
 * todoActions.add("Buy milk");     // { type: "todos/add", payload: { title: "Buy milk" } }
 * todoActions.remove(1);           // { type: "todos/remove", payload: { id: 1 } }
 * todoActions.toggle(1);           // { type: "todos/toggle", payload: 1 }
 *
 * // Custom string types are NOT prefixed (used as-is)
 * const appActions = actions("app", {
 *   reset: "GLOBAL_RESET" as const,  // { type: "GLOBAL_RESET" } - no prefix
 * });
 * ```
 *
 * @note When using custom string types, add `as const` for proper type inference:
 * ```ts
 * // ❌ Without `as const` - type is inferred as `string`
 * const bad = actions({ reset: "RESET" });
 * // action.type is `string`, not `"RESET"`
 *
 * // ✅ With `as const` - type is inferred as literal `"RESET"`
 * const good = actions({ reset: "RESET" as const });
 * // action.type is `"RESET"`
 * ```
 */
// Overload 1: Without prefix
export function actions<TMap extends ActionDefinitionMap>(
  definitions: TMap
): InferActionCreators<TMap, "">;

// Overload 2: With prefix
export function actions<
  TPrefix extends string,
  TMap extends ActionDefinitionMap
>(prefix: TPrefix, definitions: TMap): InferActionCreators<TMap, TPrefix>;

// Implementation
export function actions<
  TPrefix extends string,
  TMap extends ActionDefinitionMap
>(
  prefixOrDefinitions: TPrefix | TMap,
  maybeDefinitions?: TMap
): InferActionCreators<TMap, TPrefix> | InferActionCreators<TMap, ""> {
  // Determine if first arg is prefix or definitions
  const hasPrefix = typeof prefixOrDefinitions === "string";
  const prefix = hasPrefix ? (prefixOrDefinitions as TPrefix) : "";
  const definitions = hasPrefix
    ? (maybeDefinitions as TMap)
    : (prefixOrDefinitions as TMap);

  const result: Record<string, AnyActionCreator> = {};

  for (const key in definitions) {
    if (Object.prototype.hasOwnProperty.call(definitions, key)) {
      const def = definitions[key];
      // Build prefixed type: "prefix/key" or just "key" if no prefix
      const prefixedType = prefix ? `${prefix}/${key}` : key;

      if (def === true) {
        // No payload, type = prefixed key
        result[key] = createActionCreator(prefixedType);
      } else if (typeof def === "string") {
        // No payload, custom type (NOT prefixed - used as-is)
        result[key] = createActionCreator(def);
      } else if (typeof def === "function") {
        // With prepare function, type = prefixed key
        result[key] = createActionCreator(prefixedType, def);
      } else if (typeof def === "object" && def !== null) {
        // Full config with type and prepare (NOT prefixed - explicit type used as-is)
        result[key] = createActionCreator(def.type, def.prepare);
      }
    }
  }

  return result as InferActionCreators<TMap, TPrefix>;
}

/**
 * Create a reducer that handles actions from the given action creators.
 *
 * @param actionsInput - Action creators (map, array, or single)
 * @param reducer - Reducer function with auto-inferred action type
 * @returns Reducer function
 *
 * @example
 * ```ts
 * const counterActions = actions({
 *   increment: true,
 *   incrementBy: (n: number) => n,
 * });
 *
 * const appActions = actions({
 *   resetAll: "RESET_ALL",
 * });
 *
 * // Combine multiple action sources
 * const reducer = actions.reducer(
 *   [counterActions, appActions],
 *   (state: number, action) => {
 *     switch (action.type) {
 *       case "increment": return state + 1;
 *       case "incrementBy": return state + action.payload;
 *       case "RESET_ALL": return 0;
 *       default: return state;
 *     }
 *   }
 * );
 *
 * const store = app.store("counter", 0, reducer);
 * ```
 */
actions.reducer = function reducer<TInput extends ActionsInput, TState>(
  _actionsInput: TInput,
  reducerFn: (state: TState, action: InferActionsFromInput<TInput>) => TState
): Reducer<TState, InferActionsFromInput<TInput>> {
  // The actionsInput is only used for type inference, not at runtime
  return reducerFn as Reducer<TState, InferActionsFromInput<TInput>>;
};
