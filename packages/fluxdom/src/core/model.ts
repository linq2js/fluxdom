import {
  Action,
  MutableStore,
  ModelActionContext,
  ModelActionMap,
  ModelThunkMap,
  ModelWithMethods,
  MapActionsUnion,
  Equality,
  ModelFallbackHandler,
  ModelThunkContext,
  ModelActionCreators,
  Domain,
  StoreContext,
  Dispatch,
} from "../types";
import { withUse } from "../withUse";

/**
 * Create action creators and reducer from an action map.
 * Internal helper used by model().
 */
function createModelActions<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TDomainAction extends Action
>(
  actionMap: TActionMap,
  fallbackHandlers: ModelFallbackHandler<TState, TDomainAction>[]
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
    action: MapActionsUnion<TState, TActionMap> | TDomainAction
  ): TState => {
    // First, try action map handlers
    const handler = actionMap[action.type];
    if (handler) {
      return handler(state, ...(action as any).args);
    }

    // Then, run through fallback handlers in order
    let currentState = state;
    for (const fallback of fallbackHandlers) {
      currentState = fallback(currentState, action as TDomainAction);
    }
    return currentState;
  };

  return { actionCreators, reducer };
}

/**
 * Create a model from a store, action map, and optional thunk map.
 * Model IS the store with bound action/thunk methods attached.
 * This means models can be used anywhere a store is expected (useSelector, derived, etc.)
 */
export function createModel<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TThunkMap extends ModelThunkMap<
    TState,
    MapActionsUnion<TState, TActionMap>,
    TDomainAction
  >,
  TDomainAction extends Action
>(
  store: MutableStore<
    TState,
    MapActionsUnion<TState, TActionMap>,
    TDomainAction
  >,
  actionCreators: Record<string, (...args: any[]) => any>,
  thunkMap: TThunkMap = {} as TThunkMap
): ModelWithMethods<TState, TActionMap, TThunkMap, TDomainAction> {
  // Bind actions to store.dispatch
  const boundActions: Record<string, (...args: any[]) => void> = {};
  for (const [key, creator] of Object.entries(actionCreators)) {
    boundActions[key] = (...args: any[]) => {
      store.dispatch(creator(...args));
    };
  }

  // Thunks are already bound (context captured in closure)
  // Just attach them directly to the model

  // Model IS the store with bound methods attached
  // Spread store properties + bound actions + thunks
  const model = withUse({
    ...store,
    ...boundActions,
    ...thunkMap,
  });

  return model as ModelWithMethods<
    TState,
    TActionMap,
    TThunkMap,
    TDomainAction
  >;
}

/**
 * Result of creating action context - includes the context and collected fallbacks.
 */
interface ActionContextResult<TState, TDomainAction extends Action> {
  ctx: ModelActionContext<TState, TDomainAction>;
  fallbackHandlers: ModelFallbackHandler<TState, TDomainAction>[];
}

/**
 * Create the action builder context with helpers.
 */
export function createActionContext<TState, TDomainAction extends Action>(
  initial: TState
): ActionContextResult<TState, TDomainAction> {
  const fallbackHandlers: ModelFallbackHandler<TState, TDomainAction>[] = [];

  const ctx: ModelActionContext<TState, TDomainAction> = {
    reducers: {
      reset: () => initial,
      set: (_, value: TState) => value,
    },
    fallback: (handler: ModelFallbackHandler<TState, TDomainAction>) => {
      fallbackHandlers.push(handler);
    },
  };

  return { ctx, fallbackHandlers };
}

/**
 * Configuration for buildModel.
 */
export interface BuildModelConfig<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TThunkMap,
  TDomainAction extends Action = Action
> {
  name: string;
  initial: TState;
  actions: (ctx: ModelActionContext<TState, TDomainAction>) => TActionMap;
  thunks?: (
    ctx: ModelThunkContext<
      TState,
      TActionMap,
      MapActionsUnion<TState, TActionMap>,
      TDomainAction
    >
  ) => TThunkMap;
  equals?: Equality<TState>;
  /** Parent domain - passed internally by domain.model() */
  domain: Domain<TDomainAction>;
}

/**
 * Build a model from the domain.model() call.
 * This is the main entry point called from domain.ts.
 */
export function buildModel<
  TState,
  TActionMap extends ModelActionMap<TState>,
  TThunkMap extends ModelThunkMap<
    TState,
    MapActionsUnion<TState, TActionMap>,
    TDomainAction
  >,
  TDomainAction extends Action
>(
  createStore: (
    name: string,
    initial: TState,
    reducer: (state: TState, action: any) => TState,
    equals?: Equality<TState>
  ) => MutableStore<TState, any, TDomainAction>,
  config: BuildModelConfig<TState, TActionMap, TThunkMap, TDomainAction>
): ModelWithMethods<TState, TActionMap, TThunkMap, TDomainAction> {
  const {
    name,
    initial,
    actions: actionBuilder,
    thunks: thunkBuilder,
    equals,
    domain,
  } = config;

  // 1. Create action context with helpers (collects fallback handlers)
  const { ctx, fallbackHandlers } = createActionContext<TState, TDomainAction>(
    initial
  );

  // 2. Build action map from builder
  const actionMap = actionBuilder(ctx);

  // 3. Create action creators and reducer (with fallback handlers)
  const { actionCreators, reducer } = createModelActions<
    TState,
    TActionMap,
    TDomainAction
  >(actionMap, fallbackHandlers);

  // 4. Create the store with optional equality
  const store = createStore(name, initial, reducer, equals);

  // 5. Create thunk context with full context for closure capture
  const thunkContext: ModelThunkContext<
    TState,
    TActionMap,
    MapActionsUnion<TState, TActionMap>,
    TDomainAction
  > = {
    actions: actionCreators as ModelActionCreators<TActionMap>,
    initial,
    dispatch: store.dispatch as Dispatch<
      StoreContext<TState, MapActionsUnion<TState, TActionMap>, TDomainAction>,
      MapActionsUnion<TState, TActionMap>
    >,
    getState: store.getState,
    domain,
  };

  // 6. Get thunk map if provided (thunks capture context in closure)
  const thunkMap = thunkBuilder?.(thunkContext) ?? ({} as TThunkMap);

  // 7. Create and return the model
  return createModel<TState, TActionMap, TThunkMap, TDomainAction>(
    store,
    actionCreators,
    thunkMap
  );
}
