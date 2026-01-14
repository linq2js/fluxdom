import { Action, Domain, DomainPlugin, DomainPluginConfig } from "../types";

/**
 * Create a domain plugin that hooks into domain, store, and module creation.
 *
 * @example
 * ```ts
 * // Logging plugin
 * const logging = domainPlugin({
 *   store: {
 *     pre: (config) => console.log('[store:pre]', config.name),
 *     post: (store) => console.log('[store:post]', store.getState()),
 *   },
 * });
 *
 * // DevTools plugin
 * const devTools = domainPlugin({
 *   store: {
 *     post: (store) => connectReduxDevTools(store),
 *   },
 * });
 *
 * // Apply plugins
 * const app = domain("app").use(logging).use(devTools);
 * ```
 *
 * @param config - Plugin configuration with pre/post hooks
 * @returns A plugin function that can be applied via `.use()`
 */
export function domainPlugin(config: DomainPluginConfig): DomainPlugin {
  return <TAction extends Action>(domain: Domain<TAction>): Domain<TAction> => {
    // Register plugin hooks with the domain's internal plugin registry
    (domain as any)._registerPlugin(config);
    return domain;
  };
}
