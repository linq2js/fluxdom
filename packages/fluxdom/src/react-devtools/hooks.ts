import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  DevToolsAPI,
  DevToolsState,
  DomainNode,
  StoreInfo,
  ModuleInfo,
  TabId,
  FilterOptions,
} from "../devtools/types";

// =============================================================================
// DevTools State Hook
// =============================================================================

export function useDevToolsState(devtools: DevToolsAPI): DevToolsState {
  const [state, setState] = useState<DevToolsState>(devtools.getState());

  useEffect(() => {
    return devtools.subscribe(setState);
  }, [devtools]);

  return state;
}

// =============================================================================
// Domain Hierarchy Hook
// =============================================================================

export function useDomainHierarchy(devtools: DevToolsAPI): DomainNode[] {
  const [hierarchy, setHierarchy] = useState<DomainNode[]>([]);

  useEffect(() => {
    const update = () => setHierarchy(devtools.getDomainHierarchy());
    update();
    return devtools.subscribe(update);
  }, [devtools]);

  return hierarchy;
}

// =============================================================================
// Filtered Data Hooks
// =============================================================================

export function useFilteredStores(
  stores: StoreInfo[],
  searchQuery: string,
  options: FilterOptions = {}
): StoreInfo[] {
  const { sortBy = "name", sortOrder = "asc" } = options;

  return useMemo(() => {
    let filtered = stores;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (store) =>
          store.name.toLowerCase().includes(query) ||
          JSON.stringify(store.currentState).toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison = a.createdAt - b.createdAt;
          break;
        case "updated":
          comparison = (a.lastDispatchAt || 0) - (b.lastDispatchAt || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [stores, searchQuery, sortBy, sortOrder]);
}

export function useFilteredModules(
  modules: ModuleInfo[],
  searchQuery: string,
  options: FilterOptions = {}
): ModuleInfo[] {
  const { sortBy = "name", sortOrder = "asc", showEmpty = true } = options;

  return useMemo(() => {
    let filtered = modules;

    // Filter out non-instantiated if showEmpty is false
    if (!showEmpty) {
      filtered = filtered.filter((m) => m.isInstantiated);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((module) =>
        module.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [modules, searchQuery, sortBy, sortOrder, showEmpty]);
}

// =============================================================================
// Panel State Hook
// =============================================================================

export interface UsePanelStateReturn {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  expandedDomains: Set<string>;
  toggleDomain: (domainName: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectedStore: string | null;
  setSelectedStore: (name: string | null) => void;
  selectedModule: string | null;
  setSelectedModule: (name: string | null) => void;
  filterOptions: FilterOptions;
  setFilterOptions: (options: FilterOptions) => void;
}

export function usePanelState(
  devtools: DevToolsAPI,
  initialTab: TabId = "domains"
): UsePanelStateReturn {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set()
  );
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sortBy: "name",
    sortOrder: "asc",
    showEmpty: true,
  });

  const toggleDomain = useCallback((domainName: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainName)) {
        next.delete(domainName);
      } else {
        next.add(domainName);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const domains = devtools.getDomains();
    setExpandedDomains(new Set(domains.map((d) => d.name)));
  }, [devtools]);

  const collapseAll = useCallback(() => {
    setExpandedDomains(new Set());
  }, []);

  // Clear search when switching tabs
  useEffect(() => {
    setSearchQuery("");
  }, [activeTab]);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    expandedDomains,
    toggleDomain,
    expandAll,
    collapseAll,
    selectedStore,
    setSelectedStore,
    selectedModule,
    setSelectedModule,
    filterOptions,
    setFilterOptions,
  };
}
