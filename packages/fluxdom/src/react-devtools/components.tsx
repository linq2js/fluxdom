import React, { useState } from "react";
import type {
  DevToolsAPI,
  DomainNode,
  StoreInfo,
  ModuleInfo,
  TabId,
  FilterOptions,
} from "../devtools/types";
import {
  useDevToolsState,
  useDomainHierarchy,
  useFilteredModules,
  usePanelState,
} from "./hooks";
import { styles, cn } from "./styles";

// =============================================================================
// Layout Components
// =============================================================================

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "domains", label: "Domains & Stores" },
    { id: "modules", label: "Modules" },
  ];

  return (
    <div style={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          style={cn(styles.tab, activeTab === tab.id && styles.tabActive)}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <div style={styles.searchBar}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.searchInput}
      />
      {value && (
        <button style={styles.clearButton} onClick={() => onChange("")}>
          ×
        </button>
      )}
    </div>
  );
}

interface FilterBarProps {
  options: FilterOptions;
  onOptionsChange: (options: FilterOptions) => void;
  actions?: React.ReactNode;
}

export function FilterBar({ options, onOptionsChange, actions }: FilterBarProps) {
  return (
    <div style={styles.filterBar}>
      <div style={styles.filterGroup}>
        <label style={styles.filterLabel}>Sort by:</label>
        <select
          value={options.sortBy}
          onChange={(e) =>
            onOptionsChange({
              ...options,
              sortBy: e.target.value as FilterOptions["sortBy"],
            })
          }
          style={styles.select}
        >
          <option value="name">Name</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
        </select>
        <button
          style={styles.sortButton}
          onClick={() =>
            onOptionsChange({
              ...options,
              sortOrder: options.sortOrder === "asc" ? "desc" : "asc",
            })
          }
        >
          {options.sortOrder === "asc" ? "↑" : "↓"}
        </button>
      </div>
      {actions && <div style={styles.filterActions}>{actions}</div>}
    </div>
  );
}

// =============================================================================
// Domain & Store Components
// =============================================================================

interface DomainNodeViewProps {
  node: DomainNode;
  isExpanded: boolean;
  onToggle: () => void;
  onStoreSelect: (name: string) => void;
  selectedStore: string | null;
  depth?: number;
}

export function DomainNodeView({
  node,
  isExpanded,
  onToggle,
  onStoreSelect,
  selectedStore,
  depth = 0,
}: DomainNodeViewProps) {
  const hasContent = node.stores.length > 0 || node.children.length > 0;
  const shortName = node.info.path[node.info.path.length - 1];

  return (
    <div style={{ ...styles.domainNode, marginLeft: depth * 16 }}>
      <div style={styles.domainHeader} onClick={onToggle}>
        <span style={styles.expandIcon}>
          {hasContent ? (isExpanded ? "▼" : "▶") : "○"}
        </span>
        <span style={styles.domainName}>{shortName}</span>
        <span style={styles.domainBadge}>
          {node.stores.length} stores
          {node.children.length > 0 && `, ${node.children.length} children`}
        </span>
      </div>

      {isExpanded && (
        <div style={styles.domainContent}>
          {node.info.meta && Object.keys(node.info.meta).length > 0 && (
            <div style={styles.metaSection}>
              <span style={styles.metaLabel}>Meta:</span>
              <code style={styles.metaValue}>
                {JSON.stringify(node.info.meta)}
              </code>
            </div>
          )}

          {node.stores.length > 0 && (
            <div style={styles.storeList}>
              {node.stores.map((store) => (
                <StoreItem
                  key={store.name}
                  store={store}
                  isSelected={selectedStore === store.name}
                  onSelect={() => onStoreSelect(store.name)}
                />
              ))}
            </div>
          )}

          {node.children.map((child) => (
            <DomainNodeView
              key={child.info.name}
              node={child}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onStoreSelect={onStoreSelect}
              selectedStore={selectedStore}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StoreItemProps {
  store: StoreInfo;
  isSelected: boolean;
  onSelect: () => void;
}

export function StoreItem({
  store,
  isSelected,
  onSelect,
}: StoreItemProps) {
  const [isStateExpanded, setIsStateExpanded] = useState(false);
  const shortName = store.name.split(".").pop() || store.name;

  return (
    <div
      style={cn(styles.storeItem, isSelected && styles.storeItemSelected)}
      onClick={onSelect}
    >
      <div style={styles.storeHeader}>
        <span style={styles.storeName}>{shortName}</span>
        <span style={styles.storeStats}>
          {store.dispatchCount} dispatches
        </span>
      </div>

      <div style={styles.storePreview}>
        <button
          style={styles.expandStateButton}
          onClick={(e) => {
            e.stopPropagation();
            setIsStateExpanded(!isStateExpanded);
          }}
        >
          {isStateExpanded ? "▼" : "▶"} State
        </button>
        {isStateExpanded ? (
          <pre style={styles.stateExpanded}>
            {JSON.stringify(store.currentState, null, 2)}
          </pre>
        ) : (
          <code style={styles.statePreview}>
            {JSON.stringify(store.currentState).slice(0, 100)}
            {JSON.stringify(store.currentState).length > 100 && "..."}
          </code>
        )}
      </div>

      {store.meta && Object.keys(store.meta).length > 0 && (
        <div style={styles.storeMeta}>
          <span style={styles.metaLabel}>Meta:</span>
          <code style={styles.metaValue}>{JSON.stringify(store.meta)}</code>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Module Components
// =============================================================================

interface ModuleItemProps {
  module: ModuleInfo;
  isSelected: boolean;
  onSelect: () => void;
}

export function ModuleItem({ module, isSelected, onSelect }: ModuleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      style={cn(styles.moduleItem, isSelected && styles.moduleItemSelected)}
      onClick={onSelect}
    >
      <div style={styles.moduleHeader}>
        <span style={styles.moduleName}>{module.name}</span>
        <span
          style={cn(
            styles.moduleStatus,
            module.isInstantiated
              ? styles.moduleStatusActive
              : styles.moduleStatusInactive
          )}
        >
          {module.isInstantiated ? "Active" : "Not instantiated"}
        </span>
      </div>

      {module.meta && Object.keys(module.meta).length > 0 && (
        <div style={styles.moduleMeta}>
          <span style={styles.metaLabel}>Meta:</span>
          <code style={styles.metaValue}>{JSON.stringify(module.meta)}</code>
        </div>
      )}

      {module.isInstantiated && module.instance !== null && (
        <div style={styles.moduleInstance}>
          <button
            style={styles.expandStateButton}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? "▼" : "▶"} Instance
          </button>
          {isExpanded && (
            <pre style={styles.stateExpanded}>
              {JSON.stringify(
                module.instance,
                (key, value) =>
                  typeof value === "function" ? `[Function: ${key}]` : value,
                2
              ) ?? "null"}
            </pre>
          )}
        </div>
      )}

      {module.createdAt && (
        <div style={styles.moduleCreatedAt}>
          Created: {new Date(module.createdAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Tab Content Components
// =============================================================================

interface DomainsTabProps {
  devtools: DevToolsAPI;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterOptions: FilterOptions;
  onFilterChange: (options: FilterOptions) => void;
  expandedDomains: Set<string>;
  onToggleDomain: (name: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  selectedStore: string | null;
  onStoreSelect: (name: string | null) => void;
}

export function DomainsTab({
  devtools,
  searchQuery,
  onSearchChange,
  filterOptions,
  onFilterChange,
  expandedDomains,
  onToggleDomain,
  onExpandAll,
  onCollapseAll,
  selectedStore,
  onStoreSelect,
}: DomainsTabProps) {
  const hierarchy = useDomainHierarchy(devtools);

  return (
    <div style={styles.tabContent}>
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search domains and stores..."
      />
      <FilterBar
        options={filterOptions}
        onOptionsChange={onFilterChange}
        actions={
          <>
            <button style={styles.actionButton} onClick={onExpandAll}>
              Expand All
            </button>
            <button style={styles.actionButton} onClick={onCollapseAll}>
              Collapse All
            </button>
          </>
        }
      />
      <div style={styles.content}>
        {hierarchy.length === 0 ? (
          <div style={styles.emptyState}>
            No domains connected. Call <code>devtools.connect(domain)</code> to
            start tracking.
          </div>
        ) : (
          hierarchy.map((node) => (
            <DomainNodeView
              key={node.info.name}
              node={node}
              isExpanded={expandedDomains.has(node.info.name)}
              onToggle={() => onToggleDomain(node.info.name)}
              onStoreSelect={onStoreSelect}
              selectedStore={selectedStore}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ModulesTabProps {
  devtools: DevToolsAPI;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterOptions: FilterOptions;
  onFilterChange: (options: FilterOptions) => void;
  selectedModule: string | null;
  onModuleSelect: (name: string | null) => void;
}

export function ModulesTab({
  devtools,
  searchQuery,
  onSearchChange,
  filterOptions,
  onFilterChange,
  selectedModule,
  onModuleSelect,
}: ModulesTabProps) {
  const state = useDevToolsState(devtools);
  const modules = useFilteredModules(
    Array.from(state.modules.values()),
    searchQuery,
    filterOptions
  );

  return (
    <div style={styles.tabContent}>
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search modules..."
      />
      <FilterBar
        options={filterOptions}
        onOptionsChange={onFilterChange}
        actions={
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={filterOptions.showEmpty !== false}
              onChange={(e) =>
                onFilterChange({ ...filterOptions, showEmpty: e.target.checked })
              }
            />
            Show uninstantiated
          </label>
        }
      />
      <div style={styles.content}>
        {modules.length === 0 ? (
          <div style={styles.emptyState}>
            {searchQuery
              ? "No modules match your search."
              : "No modules instantiated yet."}
          </div>
        ) : (
          <div style={styles.moduleList}>
            {modules.map((module) => (
              <ModuleItem
                key={module.name}
                module={module}
                isSelected={selectedModule === module.name}
                onSelect={() =>
                  onModuleSelect(
                    selectedModule === module.name ? null : module.name
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Panel Component
// =============================================================================

export interface DevToolsPanelProps {
  devtools: DevToolsAPI;
  className?: string;
  style?: React.CSSProperties;
}

export function DevToolsPanel({
  devtools,
  className,
  style: customStyle,
}: DevToolsPanelProps) {
  const panelState = usePanelState(devtools);
  const state = useDevToolsState(devtools);

  return (
    <div style={{ ...styles.panel, ...customStyle }} className={className}>
      <TabBar
        activeTab={panelState.activeTab}
        onTabChange={panelState.setActiveTab}
      />

      {panelState.activeTab === "domains" && (
        <DomainsTab
          devtools={devtools}
          searchQuery={panelState.searchQuery}
          onSearchChange={panelState.setSearchQuery}
          filterOptions={panelState.filterOptions}
          onFilterChange={panelState.setFilterOptions}
          expandedDomains={panelState.expandedDomains}
          onToggleDomain={panelState.toggleDomain}
          onExpandAll={panelState.expandAll}
          onCollapseAll={panelState.collapseAll}
          selectedStore={panelState.selectedStore}
          onStoreSelect={panelState.setSelectedStore}
        />
      )}

      {panelState.activeTab === "modules" && (
        <ModulesTab
          devtools={devtools}
          searchQuery={panelState.searchQuery}
          onSearchChange={panelState.setSearchQuery}
          filterOptions={panelState.filterOptions}
          onFilterChange={panelState.setFilterOptions}
          selectedModule={panelState.selectedModule}
          onModuleSelect={panelState.setSelectedModule}
        />
      )}

      <div style={styles.statusBar}>
        <span>
          {state.domains.size} domains, {state.stores.size} stores,{" "}
          {state.modules.size} modules
        </span>
        <span>
          {state.isRecording ? "🔴 Recording" : "⏸ Paused"} (
          {state.actionLogs.length} actions)
        </span>
      </div>
    </div>
  );
}
