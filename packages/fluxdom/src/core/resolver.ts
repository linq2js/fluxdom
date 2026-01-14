import { Domain, ModuleDef } from "../types";

export type Resolver = {
  /** Resolve a module instance (cached singleton) */
  get<TModule>(definition: ModuleDef<TModule>): TModule;

  /** Override a module implementation (must be called before first get) */
  override<TModule>(
    source: ModuleDef<TModule>,
    override: ModuleDef<TModule>
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
 */
export function createResolver(getRootDomain: () => Domain): Resolver {
  const moduleCache = new Map<ModuleDef<any>, any>();
  const moduleOverrides = new Map<ModuleDef<any>, ModuleDef<any>>();

  /**
   * Resolve a module.
   * Modules are singletons - `create()` receives the root domain.
   */
  const get = <TModule>(definition: ModuleDef<TModule>): TModule => {
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
    source: ModuleDef<TModule>,
    impl: ModuleDef<TModule>
  ): VoidFunction => {
    if (moduleCache.has(source)) {
      throw new Error(
        `Cannot override module: Instance already created for ${source.name}`
      );
    }
    moduleOverrides.set(source, impl);
    return () => {
      moduleOverrides.delete(source);
    };
  };

  return { get, override };
}
