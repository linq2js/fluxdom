import { Action, Domain, ModuleDef, ResolveModule } from "../types";

export type Resolver = {
  get<TModule, TAction extends Action>(
    definition: ModuleDef<TModule, TAction>,
    domain: Domain<TAction>
  ): TModule;

  override<TModule, TAction extends Action>(
    source: ModuleDef<TModule, TAction>,
    override: ModuleDef<TModule, TAction>
  ): VoidFunction;
};

/**
 * Handles dependency injection and module caching.
 * Can be shared across multiple domains to create a shared scope.
 */
export function createResolver(): Resolver {
  const moduleCache = new Map<ModuleDef<any, any>, any>();
  const moduleOverrides = new Map<ModuleDef<any, any>, ModuleDef<any, any>>();

  /**
   * Resolve a module.
   *
   * @param definition - The module definition
   * @param domain - The domain requesting the module (used for instantiation if not cached)
   */
  const get = <TModule, TAction extends Action>(
    definition: ModuleDef<TModule, TAction>,
    domain: Domain<TAction>
  ): TModule => {
    // 1. Check Overrides
    const effectiveDefinition = moduleOverrides.get(definition) || definition;

    // 2. Check Cache
    if (moduleCache.has(effectiveDefinition)) {
      return moduleCache.get(effectiveDefinition);
    }

    // 3. Instantiate
    const instance = effectiveDefinition.create(domain);
    moduleCache.set(effectiveDefinition, instance);

    return instance;
  };

  /**
   * Override a module implementation.
   */
  const override = <TModule, TAction extends Action>(
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
