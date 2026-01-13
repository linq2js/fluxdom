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

  // Bind thunks to store.dispatch
  const boundThunks: Record<string, (...args: any[]) => any> = {};
  for (const [key, thunkCreator] of Object.entries(thunkMap)) {
    boundThunks[key] = (...args: any[]) => {
      return store.dispatch(thunkCreator(...args));
    };
  }

  // Model IS the store with bound methods attached
  // Spread store properties + bound actions + bound thunks
  const model = withUse({
    ...store,
    ...boundActions,
    ...boundThunks,
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

  // 5. Create thunk context with action creators, initial state, and thunk helper
  const thunkContext: ModelThunkContext<
    TState,
    TActionMap,
    MapActionsUnion<TState, TActionMap>,
    TDomainAction
  > = {
    actions: actionCreators as ModelActionCreators<TActionMap>,
    initial,
    // Identity function that provides proper type inference for thunk creators
    thunk: (creator) => creator,
  };

  // 6. Get thunk map if provided (pass thunk context)
  const thunkMap = thunkBuilder?.(thunkContext) ?? ({} as TThunkMap);

  // 7. Create and return the model
  return createModel<TState, TActionMap, TThunkMap, TDomainAction>(
    store,
    actionCreators,
    thunkMap
  );
}
