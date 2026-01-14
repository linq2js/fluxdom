import { Action, Domain, DomainPluginConfig, ModuleDef } from "../types";

export type Resolver<TAction extends Action = Action> = {
  /** Resolve a module instance (cached singleton) */
  get<TModule>(definition: ModuleDef<TModule, TAction>): TModule;

  /** Override a module implementation (must be called before first get) */
  override<TModule>(
    source: ModuleDef<TModule, TAction>,
    override: ModuleDef<TModule, TAction>
  ): VoidFunction;
};

/**
 * Handles dependency injection and module caching.
 *
 * The resolver is created with a reference to the root domain.
 * All modules receive this root domain in their `create()` function,
 * ensuring consistent behavior across the domain hierarchy.
 *
 * @param getRootDomain - Getter for the root domain (set after domain object is created)
 * @param plugins - Array of plugin configs for module hooks
 */
export function createResolver<TAction extends Action = Action>(
  getRootDomain: () => Domain<TAction>,
  plugins: DomainPluginConfig[] = []
): Resolver<TAction> {
  const moduleCache = new Map<ModuleDef<any, any>, any>();
  const moduleOverrides = new Map<ModuleDef<any, any>, ModuleDef<any, any>>();

  /**
   * Resolve a module.
   * Modules are singletons - `create()` receives the root domain.
   */
  const get = <TModule>(definition: ModuleDef<TModule, TAction>): TModule => {
    // 1. Check Overrides
    let effectiveDefinition = moduleOverrides.get(definition) || definition;

    // 2. Run pre hooks - allow definition transformation (respecting filter)
    for (const plugin of plugins) {
      if (plugin.module?.filter && !plugin.module.filter(effectiveDefinition)) continue;
      if (plugin.module?.pre) {
        const result = plugin.module.pre(effectiveDefinition);
        if (result) effectiveDefinition = result;
      }
    }

    // 3. Check Cache (after pre hooks, in case definition changed)
    if (moduleCache.has(effectiveDefinition)) {
      return moduleCache.get(effectiveDefinition);
    }

    // 4. Instantiate with root domain
    const instance = effectiveDefinition.create(getRootDomain());
    moduleCache.set(effectiveDefinition, instance);

    // 5. Run post hooks - side effects only (respecting filter)
    for (const plugin of plugins) {
      if (plugin.module?.filter && !plugin.module.filter(effectiveDefinition)) continue;
      plugin.module?.post?.(instance, effectiveDefinition);
    }

    return instance;
  };

  /**
   * Override a module implementation.
   * Must be called before the module is first resolved.
   */
  const override = <TModule>(
    source: ModuleDef<TModule, TAction>,
    mock: ModuleDef<TModule, TAction>
  ): VoidFunction => {
    if (moduleCache.has(source)) {
      throw new Error(
        `Cannot override module: Instance already created for ${source.name}`
      );
    }
    moduleOverrides.set(source, mock);
    return () => {
      moduleOverrides.delete(source);
    };
  };

  return { get, override };
}
