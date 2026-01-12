import {
  Action,
  Domain,
  DomainContext,
  MutableStore,
  Reducer,
  Thunk,
  ResolveModule,
  DispatchArgs,
  OnDispatch,
  DerivedStore,
  Store,
  Equality,
  ModuleDef,
  ReducerMap,
  StoreWithActions,
  MapAction,
} from "../types";

import { withUse } from "../withUse";
import { emitter } from "../emitter";
import { derived as derivedBase } from "./derived";
import { createStore } from "./store";
import { createResolver, Resolver } from "./resolver";
import {
  isReducerMap,
  createReducerFromMap,
  createActionsFromMap,
} from "./reducerMap";

// --- Domain Implementation ---

function createDomain<TAction extends Action>(
  name: string,
  notifyParent?: OnDispatch,
  resolver: Resolver = createResolver(),
  root?: Domain<any>
): Domain<TAction> {
  // Closure State
  const stores = new Set<Store<any>>();
  const subdomains = new Set<Domain<any>>();
  const dispatchEmitter =
    emitter<DispatchArgs<TAction, DomainContext<TAction>>>();
  const descendantEmitter = emitter<DispatchArgs<any, any>>();

  // Root reference (lazy initialized if not passed)
  // We can't access 'domainObject' before it's created, but we need it for 'root'.
  // However, 'this.root = this' pattern in class works because 'this' exists.
  // Here we will use a workaround or post-assignment.
  // Actually, we can just define the object and assign root inside.

  // Let's create the object first with a placeholder for root

  // --- Context ---
  const getContext = (): DomainContext<TAction> => ({
    dispatch,
    get,
  });

  // --- Child Dispatch Handling ---
  const handleChildDispatch = (args: DispatchArgs<any, any>) => {
    // 1. Notify our listeners (descendants only)
    descendantEmitter.emit(args);

    // 2. Bubble up to parent
    notifyParent?.(args);
  };

  // --- Dispatch System ---
  const onDispatch = (
    listener: (args: DispatchArgs<TAction, DomainContext<TAction>>) => void
  ) => {
    return dispatchEmitter.on(listener);
  };

  const onAnyDispatch = (listener: OnDispatch) => {
    const unsub1 = dispatchEmitter.on(listener as any); // Listen to direct dispatches
    const unsub2 = descendantEmitter.on(listener); // Listen to descendant dispatches
    return () => {
      unsub1();
      unsub2();
    };
  };

  const dispatch = (actionOrThunk: TAction | Thunk<any>) => {
    if (typeof actionOrThunk === "function") {
      return actionOrThunk(getContext());
    }

    const action = actionOrThunk as TAction;
    const context = getContext();

    // 1. Notify Domain Listeners
    dispatchEmitter.emit({ action, source: name, context });

    // 2. Broadcast Downstream
    // To Stores
    stores.forEach((store) => (store as any)._receiveDomainAction(action));
    // To SubDomains
    subdomains.forEach((sub) => (sub as any)._receiveDomainAction(action));

    notifyParent?.({ action, source: name, context });
  };

  // Internal: Called by Parent Domain to inject global actions
  // @internal
  const _receiveDomainAction = (action: TAction) => {
    const context = getContext();

    // 1. Notify Domain Listeners (Local)
    dispatchEmitter.emit({ action, source: name, context });

    // 2. Broadcast Downstream
    stores.forEach((store) => (store as any)._receiveDomainAction(action));
    subdomains.forEach((sub) => (sub as any)._receiveDomainAction(action));

    // DO NOT bubble up to parent (prevents loops)
  };

  // --- Module System ---
  const get: ResolveModule<TAction> = (factory) => {
    return resolver.get(factory, domainObject);
  };

  const override = <TModule>(
    source: ModuleDef<TModule, TAction>,
    mock: ModuleDef<TModule, TAction>
  ): VoidFunction => {
    return resolver.override(source, mock);
  };

  // --- Factory Methods ---
  const derived = <TState, const TStores extends readonly Store<any>[]>(
    childName: string,
    dependencies: TStores,
    selector: (
      ...args: {
        [K in keyof TStores]: TStores[K] extends Store<infer T> ? T : never;
      }
    ) => TState,
    equals?: Equality<TState>
  ): DerivedStore<TState> => {
    const fullName = `${name}.${childName}`;
    return derivedBase(fullName, dependencies, selector, equals);
  };

  // Overloaded store function that supports both reducer functions and reducer maps
  function store<TState, TStoreActions extends Action = TAction>(
    childName: string,
    initial: TState,
    reducer: Reducer<TState, TStoreActions>
  ): MutableStore<TState, TStoreActions, TAction>;

  function store<TState, TMap extends ReducerMap<TState>>(
    childName: string,
    initial: TState,
    reducerMap: TMap
  ): StoreWithActions<TState, TMap, TAction>;

  function store<TState, TStoreActions extends Action = TAction>(
    childName: string,
    initial: TState,
    reducerOrMap: Reducer<TState, TStoreActions> | ReducerMap<TState>
  ):
    | MutableStore<TState, TStoreActions, TAction>
    | StoreWithActions<TState, ReducerMap<TState>, TAction> {
    const fullName = `${name}.${childName}`;

    // Check if it's a reducer map (object) or reducer function
    if (isReducerMap(reducerOrMap)) {
      // Reducer map: convert to reducer and create actions
      const map = reducerOrMap as ReducerMap<TState>;
      const reducer = createReducerFromMap<TState>(map);
      const actions = createActionsFromMap<TState, typeof map>(map);

      const newStore = createStore<TState, MapAction, TAction>(
        fullName,
        initial,
        reducer,
        getContext() as any,
        handleChildDispatch
      );
      stores.add(newStore);

      return [newStore, actions] as any;
    }

    // Traditional reducer function
    const newStore = createStore<TState, TStoreActions, TAction>(
      fullName,
      initial,
      reducerOrMap as Reducer<TState, TStoreActions>,
      getContext() as any,
      handleChildDispatch
    );
    stores.add(newStore);
    return newStore;
  }

  const createSubDomain = <SubAction extends Action = never>(
    childName: string
  ): Domain<SubAction | TAction> => {
    const fullName = `${name}.${childName}`;
    const sub = createDomain<SubAction | TAction>(
      fullName,
      handleChildDispatch,
      resolver,
      domainObject.root
    );
    subdomains.add(sub);
    return sub;
  };

  // Construct the object
  const domainObject: Domain<TAction> = withUse({
    name,
    root: null as any, // Placeholder, set below
    dispatch,
    get,
    override,
    onDispatch,
    onAnyDispatch,
    store,
    derived,
    domain: createSubDomain,
    _receiveDomainAction,
  });

  // Verify root logic
  // If root passed, use it. If not, this is root.
  // We have to cast to Mutable to assign readonly property
  (domainObject as any).root = root ?? domainObject;

  return domainObject;
}

// --- Public Factory ---

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
export function domain<TAction extends Action = Action>(
  name: string
): Domain<TAction> {
  return createDomain<TAction>(name);
}
