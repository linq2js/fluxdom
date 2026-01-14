import {
  Action,
  AnyAction,
  Domain,
  DomainContext,
  DomainConfig,
  DomainMeta,
  DomainPluginConfig,
  MutableStore,
  Thunk,
  ResolveModule,
  DispatchArgs,
  OnDispatch,
  DerivedStore,
  Store,
  Equality,
  ModuleDef,
  ModelActionContext,
  ModelActionMap,
  ModelEffectsMap,
  ModelEffectsContext,
  ModelWithMethods,
  MapActionsUnion,
  StoreConfig,
} from "../types";
import { buildModel } from "./model";

import { withUse } from "../withUse";
import { emitter } from "../emitter";
import { derived as derivedBase } from "./derived";
import { createStore } from "./store";
import { createResolver, Resolver } from "./resolver";

// --- Domain Implementation ---

function createDomain(
  name: string,
  notifyParent?: OnDispatch,
  resolver?: Resolver,
  root?: Domain,
  meta?: DomainMeta,
  inheritedPlugins?: DomainPluginConfig[]
): Domain {
  // Root domain placeholder - set after domainObject is created
  let domainObjectRef: Domain | null = null;

  // Plugin registry - inherited from parent
  const plugins: DomainPluginConfig[] = inheritedPlugins
    ? [...inheritedPlugins]
    : [];

  // Create resolver for root domain (subdomains receive it from parent)
  const resolverInstance =
    resolver ?? createResolver(() => domainObjectRef!.root);

  // Closure State
  const stores = new Set<Store<any>>();
  const subdomains = new Set<Domain>();
  // Emitter accepts AnyAction since dispatch accepts any action
  const dispatchEmitter = emitter<DispatchArgs<AnyAction, DomainContext>>();
  const descendantEmitter = emitter<DispatchArgs<any, any>>();

  // Root reference (lazy initialized if not passed)
  // We can't access 'domainObject' before it's created, but we need it for 'root'.
  // However, 'this.root = this' pattern in class works because 'this' exists.
  // Here we will use a workaround or post-assignment.
  // Actually, we can just define the object and assign root inside.

  // Let's create the object first with a placeholder for root

  // --- Context ---
  const getContext = (): DomainContext => ({
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
    listener: (args: DispatchArgs<AnyAction, DomainContext>) => void
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

  // Domain dispatch accepts any action - type safety comes from action creators
  const dispatch = (actionOrThunk: AnyAction | Thunk<any>) => {
    if (typeof actionOrThunk === "function") {
      return actionOrThunk(getContext());
    }

    const action = actionOrThunk;
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
  const _receiveDomainAction = (action: AnyAction) => {
    const context = getContext();

    // 1. Notify Domain Listeners (Local)
    dispatchEmitter.emit({ action, source: name, context });

    // 2. Broadcast Downstream
    stores.forEach((store) => (store as any)._receiveDomainAction(action));
    subdomains.forEach((sub) => (sub as any)._receiveDomainAction(action));

    // DO NOT bubble up to parent (prevents loops)
  };

  // --- Module System ---
  const get: ResolveModule = (moduleDef) => {
    // Run pre hooks (in order)
    let effectiveDef = moduleDef;
    for (const plugin of plugins) {
      const hooks = plugin.module;
      if (!hooks) continue;
      if (hooks.filter && !hooks.filter(effectiveDef)) continue;
      if (hooks.pre) {
        const result = hooks.pre(effectiveDef);
        if (result) effectiveDef = result;
      }
    }

    const instance = resolverInstance.get(effectiveDef);

    // Run post hooks (in order)
    for (const plugin of plugins) {
      const hooks = plugin.module;
      if (!hooks) continue;
      if (hooks.filter && !hooks.filter(effectiveDef)) continue;
      hooks.post?.(instance, effectiveDef);
    }

    return instance;
  };

  const override = <TModule>(
    source: ModuleDef<TModule>,
    mock: ModuleDef<TModule>
  ): VoidFunction => {
    return resolverInstance.override(source, mock);
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

  function store<TState, TStoreActions extends Action>(
    config: StoreConfig<TState, TStoreActions>
  ): MutableStore<TState, TStoreActions> {
    // Run pre hooks (in order)
    let effectiveConfig = config;
    for (const plugin of plugins) {
      const hooks = plugin.store;
      if (!hooks) continue;
      if (hooks.filter && !hooks.filter(effectiveConfig)) continue;
      if (hooks.pre) {
        const result = hooks.pre(effectiveConfig);
        if (result)
          effectiveConfig = result as StoreConfig<TState, TStoreActions>;
      }
    }

    const { name: childName, initial, reducer, equals, meta } = effectiveConfig;
    const fullName = `${name}.${childName}`;

    const newStore = createStore<TState, TStoreActions>(
      fullName,
      initial,
      reducer,
      getContext() as any,
      handleChildDispatch,
      equals,
      meta
    );
    stores.add(newStore);

    // Run post hooks (in order)
    for (const plugin of plugins) {
      const hooks = plugin.store;
      if (!hooks) continue;
      if (hooks.filter && !hooks.filter(effectiveConfig)) continue;
      hooks.post?.(newStore, effectiveConfig);
    }

    return newStore;
  }

  const createSubDomain = (
    childName: string,
    childMeta?: DomainMeta
  ): Domain => {
    // Run pre hooks (in order)
    let domainConfig: DomainConfig = { name: childName, meta: childMeta };
    for (const plugin of plugins) {
      const hooks = plugin.domain;
      if (!hooks) continue;
      if (hooks.filter && !hooks.filter(domainConfig)) continue;
      if (hooks.pre) {
        const result = hooks.pre(domainConfig);
        if (result) domainConfig = result;
      }
    }

    const fullName = `${name}.${domainConfig.name}`;
    const sub = createDomain(
      fullName,
      handleChildDispatch,
      resolverInstance,
      domainObject.root,
      domainConfig.meta,
      plugins // Pass plugins to child for inheritance
    );
    subdomains.add(sub);

    // Run post hooks (in order)
    for (const plugin of plugins) {
      const hooks = plugin.domain;
      if (!hooks) continue;
      if (hooks.filter && !hooks.filter(domainConfig)) continue;
      hooks.post?.(sub, domainConfig);
    }

    return sub;
  };

  // --- Model Factory ---
  const model = <
    TState,
    TActionMap extends ModelActionMap<TState>,
    TEffectsMap extends ModelEffectsMap<
      TState,
      MapActionsUnion<TState, TActionMap>
    > = Record<string, never>
  >(config: {
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
  }): ModelWithMethods<TState, TActionMap, TEffectsMap> => {
    return buildModel<TState, TActionMap, TEffectsMap>({
      ...config,
      domain: domainObject,
    });
  };

  // --- Plugin Method ---
  const plugin = (config: DomainPluginConfig): Domain => {
    plugins.push(config);
    return domainObject;
  };

  // Construct the object
  const domainObject = withUse({
    name,
    meta,
    root: null as any, // Placeholder, set below
    dispatch,
    get,
    override,
    onDispatch,
    onAnyDispatch,
    store,
    derived,
    domain: createSubDomain,
    model,
    plugin,
    _receiveDomainAction,
  }) as Domain;

  // Set root reference (for root domain, it's self; for subdomain, it's passed in)
  (domainObject as any).root = root ?? domainObject;

  // Set the reference for the resolver's getRootDomain getter
  domainObjectRef = domainObject;

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
 * const appDomain = domain("app");
 * const counterStore = appDomain.store("counter", 0, counterReducer);
 * ```
 *
 * @param name - Identifier for the domain (used for debugging)
 * @returns A new Domain instance
 */
export function domain(name: string): Domain {
  return createDomain(name);
}
