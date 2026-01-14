import type { Domain, AnyAction, MutableStore } from "../types";
import { emitter } from "../emitter";
import type {
  DevToolsAPI,
  DevToolsState,
  DevToolsOptions,
  DomainInfo,
  StoreInfo,
  ModuleInfo,
  ActionLog,
  DomainNode,
} from "./types";

// =============================================================================
// DevTools Implementation
// =============================================================================

/**
 * Create a FluxDom DevTools instance.
 *
 * The DevTools API provides a headless interface for monitoring and debugging
 * FluxDom applications. It tracks domains, stores, modules, and action history.
 *
 * @example
 * ```ts
 * import { createDevTools } from "fluxdom/devtools";
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
 *
 * // Subscribe to changes
 * devtools.subscribe((state) => {
 *   console.log("DevTools state updated:", state);
 * });
 *
 * // Cleanup
 * disconnect();
 * ```
 */
export function createDevTools(options: DevToolsOptions = {}): DevToolsAPI {
  const { maxLogSize = 1000, recordActions = true } = options;

  // Internal state
  const state: DevToolsState = {
    domains: new Map(),
    stores: new Map(),
    modules: new Map(),
    actionLogs: [],
    isRecording: recordActions,
    maxLogSize,
  };

  // Connected domains and their cleanup functions
  const connections = new Map<Domain, () => void>();

  // Store references for dispatch
  const storeRefs = new Map<string, MutableStore<unknown, AnyAction>>();

  // Change emitter
  const changeEmitter = emitter<DevToolsState>();

  // Notify subscribers
  const notify = () => {
    changeEmitter.emit(state);
  };

  // Generate unique action ID
  let actionIdCounter = 0;
  const generateActionId = () => `action_${++actionIdCounter}_${Date.now()}`;

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  const parseDomainPath = (name: string): string[] => name.split(".");

  const registerDomain = (domain: Domain) => {
    const path = parseDomainPath(domain.name);
    const info: DomainInfo = {
      name: domain.name,
      path,
      meta: domain.meta as Record<string, unknown>,
      storeCount: 0,
      childCount: 0,
      createdAt: Date.now(),
    };
    state.domains.set(domain.name, info);
  };

  const registerStore = (
    store: MutableStore<unknown, AnyAction>,
    domainName: string
  ) => {
    const domainPath = parseDomainPath(domainName);
    const info: StoreInfo = {
      name: store.name,
      domainPath,
      meta: store.meta as Record<string, unknown>,
      currentState: store.getState(),
      dispatchCount: 0,
      lastDispatchAt: null,
      createdAt: Date.now(),
    };
    state.stores.set(store.name, info);
    storeRefs.set(store.name, store);

    // Update domain store count
    const domainInfo = state.domains.get(domainName);
    if (domainInfo) {
      domainInfo.storeCount++;
    }
  };

  const updateStoreState = (storeName: string, newState: unknown) => {
    const info = state.stores.get(storeName);
    if (info) {
      info.currentState = newState;
      info.dispatchCount++;
      info.lastDispatchAt = Date.now();
    }
  };

  const logAction = (
    action: AnyAction,
    source: string,
    stateBefore?: unknown,
    stateAfter?: unknown
  ) => {
    if (!state.isRecording) return;

    const log: ActionLog = {
      id: generateActionId(),
      type: action.type,
      payload: (action as { payload?: unknown }).payload,
      source,
      timestamp: Date.now(),
      stateBefore,
      stateAfter,
    };

    state.actionLogs.push(log);

    // Trim logs if exceeding max size
    if (state.actionLogs.length > state.maxLogSize) {
      state.actionLogs = state.actionLogs.slice(-state.maxLogSize);
    }
  };

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  const connect = (domain: Domain): (() => void) => {
    if (connections.has(domain)) {
      return connections.get(domain)!;
    }

    const cleanupFns: (() => void)[] = [];

    // Register the domain
    registerDomain(domain);

    // Track domain dispatches
    const unsubDispatch = domain.onAnyDispatch(({ action, source }) => {
      const store = storeRefs.get(source);
      if (store) {
        const stateBefore = state.stores.get(source)?.currentState;
        updateStoreState(source, store.getState());
        logAction(action as AnyAction, source, stateBefore, store.getState());
      } else {
        logAction(action as AnyAction, source);
      }
      notify();
    });
    cleanupFns.push(unsubDispatch);

    // Create plugin to track store/domain/module creation
    domain.plugin({
      store: {
        post: (store) => {
          const domainName = store.name.split(".").slice(0, -1).join(".");
          registerStore(store as MutableStore<unknown, AnyAction>, domainName);

          // Track state changes
          const unsubChange = store.onChange(() => {
            updateStoreState(store.name, store.getState());
            notify();
          });
          cleanupFns.push(unsubChange);

          notify();
        },
      },
      domain: {
        post: (childDomain) => {
          registerDomain(childDomain);

          // Update parent's child count
          const parentPath = childDomain.name.split(".").slice(0, -1).join(".");
          const parentInfo = state.domains.get(parentPath);
          if (parentInfo) {
            parentInfo.childCount++;
          }

          notify();
        },
      },
      module: {
        post: (instance, def) => {
          const info: ModuleInfo = {
            name: def.name,
            meta: def.meta as Record<string, unknown>,
            isInstantiated: true,
            instance,
            createdAt: Date.now(),
          };
          state.modules.set(def.name, info);
          notify();
        },
      },
    });

    // Cleanup function
    const cleanup = () => {
      cleanupFns.forEach((fn) => fn());
      connections.delete(domain);
    };

    connections.set(domain, cleanup);
    notify();

    return cleanup;
  };

  const disconnect = (domain: Domain) => {
    const cleanup = connections.get(domain);
    if (cleanup) {
      cleanup();
    }
  };

  const disconnectAll = () => {
    connections.forEach((cleanup) => cleanup());
    connections.clear();
  };

  // ==========================================================================
  // State Access
  // ==========================================================================

  const getState = (): DevToolsState => state;

  const getDomains = (): DomainInfo[] => Array.from(state.domains.values());

  const getStores = (): StoreInfo[] => Array.from(state.stores.values());

  const getModules = (): ModuleInfo[] => Array.from(state.modules.values());

  const getActionLogs = (): ActionLog[] => [...state.actionLogs];

  // ==========================================================================
  // Domain Hierarchy
  // ==========================================================================

  const getDomainHierarchy = (): DomainNode[] => {
    const domains = getDomains();
    const stores = getStores();

    // Build a map of domain name to node
    const nodeMap = new Map<string, DomainNode>();

    // Create nodes for all domains
    domains.forEach((info) => {
      nodeMap.set(info.name, {
        info,
        stores: [],
        children: [],
      });
    });

    // Assign stores to their domains
    stores.forEach((store) => {
      const domainName = store.domainPath.join(".");
      const node = nodeMap.get(domainName);
      if (node) {
        node.stores.push(store);
      }
    });

    // Build hierarchy
    const roots: DomainNode[] = [];

    domains.forEach((info) => {
      const node = nodeMap.get(info.name)!;

      if (info.path.length === 1) {
        // Root domain
        roots.push(node);
      } else {
        // Child domain - find parent
        const parentPath = info.path.slice(0, -1).join(".");
        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    });

    return roots;
  };

  const getDomainStores = (domainName: string): StoreInfo[] => {
    return getStores().filter(
      (store) => store.domainPath.join(".") === domainName
    );
  };

  // ==========================================================================
  // Store Operations
  // ==========================================================================

  const getStoreState = (storeName: string): unknown => {
    const store = storeRefs.get(storeName);
    return store?.getState();
  };

  const dispatchToStore = (storeName: string, action: AnyAction) => {
    const store = storeRefs.get(storeName);
    if (store) {
      store.dispatch(action);
    }
  };

  // ==========================================================================
  // Recording
  // ==========================================================================

  const startRecording = () => {
    state.isRecording = true;
    notify();
  };

  const stopRecording = () => {
    state.isRecording = false;
    notify();
  };

  const clearLogs = () => {
    state.actionLogs = [];
    notify();
  };

  // ==========================================================================
  // Events
  // ==========================================================================

  const subscribe = (listener: (state: DevToolsState) => void): (() => void) => {
    return changeEmitter.on(listener);
  };

  // ==========================================================================
  // Return API
  // ==========================================================================

  return {
    connect,
    disconnect,
    disconnectAll,
    getState,
    getDomains,
    getStores,
    getModules,
    getActionLogs,
    getDomainHierarchy,
    getDomainStores,
    getStoreState,
    dispatchToStore,
    startRecording,
    stopRecording,
    clearLogs,
    subscribe,
  };
}

// =============================================================================
// Global DevTools Instance
// =============================================================================

let globalDevTools: DevToolsAPI | null = null;

/**
 * Get or create the global DevTools instance.
 *
 * @example
 * ```ts
 * import { getDevTools } from "fluxdom/devtools";
 *
 * const devtools = getDevTools();
 * devtools.connect(myDomain);
 * ```
 */
export function getDevTools(options?: DevToolsOptions): DevToolsAPI {
  if (!globalDevTools) {
    globalDevTools = createDevTools(options);
  }
  return globalDevTools;
}

/**
 * Reset the global DevTools instance.
 * Useful for testing or when reinitializing the app.
 */
export function resetDevTools(): void {
  if (globalDevTools) {
    globalDevTools.disconnectAll();
    globalDevTools = null;
  }
}
