/**
 * FluxDom React DevTools
 *
 * Provides a React UI component for the FluxDom DevTools.
 *
 * @example
 * ```tsx
 * import { DevToolsPanel } from "fluxdom/react-devtools";
 * import { getDevTools } from "fluxdom/devtools";
 *
 * const devtools = getDevTools();
 *
 * function App() {
 *   return (
 *     <div style={{ display: "flex", height: "100vh" }}>
 *       <main style={{ flex: 1 }}>
 *         {/* Your app content *\/}
 *       </main>
 *       <aside style={{ width: 400 }}>
 *         <DevToolsPanel devtools={devtools} />
 *       </aside>
 *     </div>
 *   );
 * }
 * ```
 *
 * @module fluxdom/react-devtools
 */

// Components
export { DevToolsPanel } from "./components";
export type { DevToolsPanelProps } from "./components";

// Hooks (for custom UIs)
export {
  useDevToolsState,
  useDomainHierarchy,
  useFilteredStores,
  useFilteredModules,
  usePanelState,
} from "./hooks";
export type { UsePanelStateReturn } from "./hooks";

// Styles (for customization)
export { styles, cn } from "./styles";

// Re-export types from devtools
export type {
  DevToolsAPI,
  DevToolsState,
  DomainInfo,
  StoreInfo,
  ModuleInfo,
  ActionLog,
  DomainNode,
  TabId,
  PanelState,
  FilterOptions,
} from "../devtools/types";
