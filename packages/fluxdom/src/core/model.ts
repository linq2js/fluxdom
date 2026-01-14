import {
  Action,
  AnyAction,
  MutableStore,
  ModelActionContext,
  ModelActionMap,
  ModelEffectsMap,
  ModelWithMethods,
  MapActionsUnion,
  Equality,
  ModelEffectsContext,
  ModelActionCreators,
  Domain,
  StoreContext,
  Dispatch,
  TaskHelper,
  TaskOptions,
  ActionMatcher,
} from "../types";
import { isPromiseLike } from "../utils";
import { withUse } from "../withUse";

/**
 * Internal type for a registered fallback handler.
 */
interface FallbackEntry<TState> {
  matchers: ActionMatcher<Action>[] | null; // null = catch-all
  handler: (state: TState, action: Action) => TState;
}

/**
 * Create action creators and reducer from an action map.
 * Internal helper used by model().
 */
function createModelActions<TState, TActionMap extends ModelActionMap<TState>>(
  actionMap: TActionMap,
  fallbackEntries: FallbackEntry<TState>[]
) {
  // Create action creators
  const actionCreators: Record<string, (...args: any[]) => any> = {};

  for (const key of Object.keys(actionMap)) {
    actionCreators[key] = (...args: any[]) => ({
      type: key,
      args,
    });
  }

  // Create reducer that handles both action map and fallbacks
  const reducer = (
    state: TState,
    action: MapActionsUnion<TState, TActionMap> | AnyAction
  ): TState => {
    // First, try action map handlers
    const handler = actionMap[action.type];
    if (handler) {
      return handler(state, ...(action as any).args);
    }

    // Then, run ALL matched fallback handlers in sequence
    let currentState = state;
    for (const entry of fallbackEntries) {
      // null matchers = catch-all
      if (entry.matchers === null) {
        currentState = entry.handler(currentState, action as Action);
      } else {
        // Check if any matcher matches
        const matches = entry.matchers.some((m) => m.match(action as Action));
        if (matches) {
          currentState = entry.handler(currentState, action as Action);
        }
      }
    }
    return currentState;
  };

  return { actionCreators, reducer };
}

/**
 * Create a model from a store, action map, and optional effects map.
 * Model IS the store with bound action/effect methods attached.
 * This means models can be used anywhere a store is expected (useSelector, derived, etc.)
 */
export function createModel<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TEffectsMap extends ModelEffectsMap<
    TState,
    MapActionsUnion<TState, TActionMap>
  >
>(
  store: MutableStore<TState, MapActionsUnion<TState, TActionMap>>,
  actionCreators: Record<string, (...args: any[]) => any>,
  effectsMap: TEffectsMap = {} as TEffectsMap
): ModelWithMethods<TState, TActionMap, TEffectsMap> {
  // Bind actions to store.dispatch
  const boundActions: Record<string, (...args: any[]) => void> = {};
  for (const [key, creator] of Object.entries(actionCreators)) {
    boundActions[key] = (...args: any[]) => {
      store.dispatch(creator(...args));
    };
  }

  // Effects are already bound (context captured in closure)
  // Just attach them directly to the model

  // Model IS the store with bound methods attached
  // Spread store properties + bound actions + effects
  const model = withUse({
    ...store,
    ...boundActions,
    ...effectsMap,
  });

  return model as ModelWithMethods<TState, TActionMap, TEffectsMap>;
}

/**
 * Create the action builder context with helpers and fallback entry collection.
 */
export function createActionContext<TState>(initial: TState): {
  ctx: ModelActionContext<TState>;
  entries: FallbackEntry<TState>[];
} {
  const entries: FallbackEntry<TState>[] = [];

  const ctx: ModelActionContext<TState> = {
    reducers: {
      reset: () => initial,
      set: (_, value: TState) => value,
    },

    on: (
      actionOrHandler:
        | ActionMatcher<Action>
        | ActionMatcher<Action>[]
        | ((state: TState, action: AnyAction) => TState),
      handler?: (state: TState, action: Action) => TState
    ): void => {
      // Overload 1: catch-all handler (single function argument)
      if (typeof actionOrHandler === "function" && !handler) {
        entries.push({
          matchers: null,
          handler: actionOrHandler as (state: TState, action: Action) => TState,
        });
        return;
      }

      // Overload 2 & 3: action matcher(s) + handler
      const matchers = Array.isArray(actionOrHandler)
        ? actionOrHandler
        : [actionOrHandler as ActionMatcher<Action>];

      entries.push({
        matchers,
        handler: handler!,
      });
    },
  };

  return { ctx, entries };
}

/**
 * Create a task helper that wraps async operations with lifecycle dispatching.
 * Callbacks can return Action (auto-dispatched) or void (listener only).
 * Accepts any PromiseLike (native Promises, Bluebird, jQuery Deferreds, etc.)
 */
function createTaskHelper(dispatch: (action: Action) => void): TaskHelper {
  // Helper to dispatch only if callback returns an action
  const maybeDispatch = (action: Action | void) => {
    if (action) dispatch(action);
  };

  return (<TArgs extends any[], TResult>(
    promiseOrFn:
      | PromiseLike<TResult>
      | ((...args: TArgs) => PromiseLike<TResult>),
    options: TaskOptions<TResult>
  ): any => {
    const { start, done, fail, end } = options;

    // If it's a thenable, wrap it directly
    if (isPromiseLike<TResult>(promiseOrFn)) {
      if (start) maybeDispatch(start());

      return Promise.resolve(promiseOrFn)
        .then((result) => {
          if (done) maybeDispatch(done(result));
          if (end) maybeDispatch(end(undefined, result));
          return result;
        })
        .catch((error) => {
          if (fail) maybeDispatch(fail(error));
          if (end) maybeDispatch(end(error, undefined));
          throw error; // Re-throw
        });
    }

    // If it's a function, return wrapped function with same signature
    return (...args: TArgs): Promise<TResult> => {
      if (start) maybeDispatch(start());

      return Promise.resolve(promiseOrFn(...args))
        .then((result) => {
          if (done) maybeDispatch(done(result));
          if (end) maybeDispatch(end(undefined, result));
          return result;
        })
        .catch((error) => {
          if (fail) maybeDispatch(fail(error));
          if (end) maybeDispatch(end(error, undefined));
          throw error; // Re-throw
        });
    };
  }) as TaskHelper;
}

/**
 * Configuration for buildModel.
 */
export interface BuildModelConfig<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TEffectsMap
> {
  name: string;
  initial: TState;
  actions: (ctx: ModelActionContext<TState>) => TActionMap;
  effects?: (
    ctx: ModelEffectsContext<
      TState,
      TActionMap,
      MapActionsUnion<TState, TActionMap>
    >
  ) => TEffectsMap;
  equals?: Equality<TState>;
  /** Parent domain - passed internally by domain.model() */
  domain: Domain;
}

/**
 * Build a model from the domain.model() call.
 * This is the main entry point called from domain.ts.
 */
export function buildModel<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TEffectsMap extends ModelEffectsMap<
    TState,
    MapActionsUnion<TState, TActionMap>
  >
>(
  config: BuildModelConfig<TState, TActionMap, TEffectsMap>
): ModelWithMethods<TState, TActionMap, TEffectsMap> {
  const {
    name,
    initial,
    actions: actionBuilder,
    effects: effectsBuilder,
    equals,
    domain,
  } = config;

  const createStore = (
    reducer: (state: TState, action: any) => TState
  ): MutableStore<TState, any> =>
    domain.store({ name, initial, reducer, equals });

  // 1. Create action context with helpers (also collects fallback entries via ctx.on())
  const { ctx: actionCtx, entries: fallbackEntries } =
    createActionContext<TState>(initial);

  // 2. Build action map from builder (ctx.on() calls populate fallbackEntries)
  const actionMap = actionBuilder(actionCtx);

  // 3. Create action creators and reducer (with fallback entries)
  const { actionCreators, reducer } = createModelActions<TState, TActionMap>(
    actionMap,
    fallbackEntries
  );

  // 6. Create the store with optional equality
  const store = createStore(reducer);

  // 7. Create task helper with dispatch
  const task = createTaskHelper(store.dispatch);

  // 8. Create effects context with full context for closure capture
  const effectsContext: ModelEffectsContext<
    TState,
    TActionMap,
    MapActionsUnion<TState, TActionMap>
  > = {
    task,
    actions: actionCreators as ModelActionCreators<TActionMap>,
    initial,
    dispatch: store.dispatch as Dispatch<
      StoreContext<TState, MapActionsUnion<TState, TActionMap>>,
      MapActionsUnion<TState, TActionMap>
    >,
    getState: store.getState,
    domain,
  };

  // 9. Get effects map if provided (effects capture context in closure)
  const effectsMap = effectsBuilder?.(effectsContext) ?? ({} as TEffectsMap);

  // 10. Create and return the model
  return createModel<TState, TActionMap, TEffectsMap>(
    store,
    actionCreators,
    effectsMap
  );
}
