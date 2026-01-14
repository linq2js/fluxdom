/**
 * FluxDom DevTools - Headless API
 *
 * Provides monitoring and debugging capabilities for FluxDom applications.
 *
 * @example
 * ```ts
 * import { createDevTools, getDevTools } from "fluxdom/devtools";
 * import { domain } from "fluxdom";
 *
 * const devtools = createDevTools();
 * const app = domain("app");
 *
 * // Connect to track the domain
 * const disconnect = devtools.connect(app);
 *
 * // Access state
 * const domains = devtools.getDomains();
 * const stores = devtools.getStores();
 * const hierarchy = devtools.getDomainHierarchy();
 *
 * // Subscribe to changes
 * devtools.subscribe((state) => {
 *   console.log("DevTools state updated:", state);
 * });
 * ```
 *
 * @module fluxdom/devtools
 */

export { createDevTools, getDevTools, resetDevTools } from "./devtools";

export type {
  DevToolsAPI,
  DevToolsState,
  DevToolsOptions,
  DomainInfo,
  StoreInfo,
  ModuleInfo,
  ActionLog,
  DomainNode,
  TabId,
  PanelState,
  FilterOptions,
} from "./types";
