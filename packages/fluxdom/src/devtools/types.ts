import type { AnyAction, Domain } from "../types";

// =============================================================================
// DevTools State Types
// =============================================================================

export interface DomainInfo {
  name: string;
  path: string[];
  meta?: Record<string, unknown>;
  storeCount: number;
  childCount: number;
  createdAt: number;
}

export interface StoreInfo {
  name: string;
  domainPath: string[];
  meta?: Record<string, unknown>;
  currentState: unknown;
  dispatchCount: number;
  lastDispatchAt: number | null;
  createdAt: number;
}

export interface ModuleInfo {
  name: string;
  meta?: Record<string, unknown>;
  isInstantiated: boolean;
  instance: unknown | null;
  createdAt: number | null;
}

export interface ActionLog {
  id: string;
  type: string;
  payload?: unknown;
  source: string;
  timestamp: number;
  stateBefore?: unknown;
  stateAfter?: unknown;
}

// =============================================================================
// DevTools API Types
// =============================================================================

export interface DevToolsState {
  domains: Map<string, DomainInfo>;
  stores: Map<string, StoreInfo>;
  modules: Map<string, ModuleInfo>;
  actionLogs: ActionLog[];
  isRecording: boolean;
  maxLogSize: number;
}

export interface DevToolsOptions {
  maxLogSize?: number;
  recordActions?: boolean;
}

export interface DevToolsAPI {
  // Connection
  connect(domain: Domain): () => void;
  disconnect(domain: Domain): void;
  disconnectAll(): void;

  // State access
  getState(): DevToolsState;
  getDomains(): DomainInfo[];
  getStores(): StoreInfo[];
  getModules(): ModuleInfo[];
  getActionLogs(): ActionLog[];

  // Domain hierarchy
  getDomainHierarchy(): DomainNode[];
  getDomainStores(domainName: string): StoreInfo[];

  // Store operations
  getStoreState(storeName: string): unknown;
  dispatchToStore(storeName: string, action: AnyAction): void;

  // Recording
  startRecording(): void;
  stopRecording(): void;
  clearLogs(): void;

  // Events
  subscribe(listener: (state: DevToolsState) => void): () => void;
}

export interface DomainNode {
  info: DomainInfo;
  stores: StoreInfo[];
  children: DomainNode[];
}

// =============================================================================
// Panel Types
// =============================================================================

export type TabId = "domains" | "modules";

export interface PanelState {
  activeTab: TabId;
  searchQuery: string;
  expandedDomains: Set<string>;
  selectedStore: string | null;
  selectedModule: string | null;
}

export interface FilterOptions {
  showEmpty?: boolean;
  sortBy?: "name" | "created" | "updated";
  sortOrder?: "asc" | "desc";
}
