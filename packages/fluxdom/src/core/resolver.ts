import { Action, Domain, ModuleDef } from "../types";

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
 * @param rootDomain - The root domain (set after domain object is created)
 */
export function createResolver<TAction extends Action = Action>(
  getRootDomain: () => Domain<TAction>
): Resolver<TAction> {
  const moduleCache = new Map<ModuleDef<any, any>, any>();
  const moduleOverrides = new Map<ModuleDef<any, any>, ModuleDef<any, any>>();

  /**
   * Resolve a module.
   * Modules are singletons - `create()` receives the root domain.
   */
  const get = <TModule>(definition: ModuleDef<TModule, TAction>): TModule => {
    // 1. Check Overrides
    const effectiveDefinition = moduleOverrides.get(definition) || definition;

    // 2. Check Cache
    if (moduleCache.has(effectiveDefinition)) {
      return moduleCache.get(effectiveDefinition);
    }

    // 3. Instantiate with root domain
    const instance = effectiveDefinition.create(getRootDomain());
    moduleCache.set(effectiveDefinition, instance);

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
