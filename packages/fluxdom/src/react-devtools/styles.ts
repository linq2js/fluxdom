import type { CSSProperties } from "react";

// =============================================================================
// Style Utilities
// =============================================================================

export function cn(
  ...styles: (CSSProperties | false | undefined | null)[]
): CSSProperties {
  return styles.reduce<CSSProperties>((acc, style) => {
    if (style) {
      return { ...acc, ...style };
    }
    return acc;
  }, {});
}

// =============================================================================
// Color Palette
// =============================================================================

const colors = {
  // Background
  bgPrimary: "#1e1e2e",
  bgSecondary: "#181825",
  bgTertiary: "#11111b",
  bgHover: "#313244",
  bgSelected: "#45475a",

  // Text
  textPrimary: "#cdd6f4",
  textSecondary: "#a6adc8",
  textMuted: "#6c7086",

  // Accent
  accentBlue: "#89b4fa",
  accentGreen: "#a6e3a1",
  accentYellow: "#f9e2af",
  accentRed: "#f38ba8",
  accentPurple: "#cba6f7",
  accentTeal: "#94e2d5",

  // Border
  border: "#313244",
  borderLight: "#45475a",
};

// =============================================================================
// Styles
// =============================================================================

export const styles: Record<string, CSSProperties> = {
  // Panel
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: colors.bgPrimary,
    color: colors.textPrimary,
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "13px",
    lineHeight: 1.5,
  },

  // Tab Bar
  tabBar: {
    display: "flex",
    backgroundColor: colors.bgSecondary,
    borderBottom: `1px solid ${colors.border}`,
    padding: "0 8px",
  },
  tab: {
    padding: "10px 16px",
    border: "none",
    background: "none",
    color: colors.textSecondary,
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "inherit",
    borderBottom: "2px solid transparent",
    transition: "all 0.15s ease",
  },
  tabActive: {
    color: colors.accentBlue,
    borderBottomColor: colors.accentBlue,
  },

  // Search Bar
  searchBar: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: colors.bgSecondary,
    borderBottom: `1px solid ${colors.border}`,
  },
  searchInput: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: colors.bgTertiary,
    border: `1px solid ${colors.border}`,
    borderRadius: "6px",
    color: colors.textPrimary,
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
  },
  clearButton: {
    marginLeft: "8px",
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "none",
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: "16px",
  },

  // Filter Bar
  filterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: colors.bgSecondary,
    borderBottom: `1px solid ${colors.border}`,
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: "12px",
  },
  select: {
    padding: "4px 8px",
    backgroundColor: colors.bgTertiary,
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    color: colors.textPrimary,
    fontSize: "12px",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  sortButton: {
    padding: "4px 8px",
    backgroundColor: colors.bgTertiary,
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    color: colors.textPrimary,
    cursor: "pointer",
    fontSize: "12px",
  },
  filterActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  actionButton: {
    padding: "4px 12px",
    backgroundColor: colors.bgTertiary,
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    color: colors.textSecondary,
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "inherit",
    transition: "all 0.15s ease",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: colors.textSecondary,
    fontSize: "12px",
    cursor: "pointer",
  },

  // Tab Content
  tabContent: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "12px",
  },

  // Domain Node
  domainNode: {
    marginBottom: "4px",
  },
  domainHeader: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: colors.bgSecondary,
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  expandIcon: {
    width: "16px",
    marginRight: "8px",
    color: colors.textMuted,
    fontSize: "10px",
  },
  domainName: {
    fontWeight: 600,
    color: colors.accentPurple,
  },
  domainBadge: {
    marginLeft: "auto",
    padding: "2px 8px",
    backgroundColor: colors.bgTertiary,
    borderRadius: "10px",
    color: colors.textMuted,
    fontSize: "11px",
  },
  domainContent: {
    marginLeft: "24px",
    marginTop: "4px",
    paddingLeft: "12px",
    borderLeft: `2px solid ${colors.border}`,
  },

  // Meta Section
  metaSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 0",
    color: colors.textMuted,
    fontSize: "12px",
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: "11px",
  },
  metaValue: {
    padding: "2px 6px",
    backgroundColor: colors.bgTertiary,
    borderRadius: "4px",
    color: colors.textSecondary,
    fontSize: "11px",
  },

  // Store List
  storeList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "4px",
  },
  storeItem: {
    padding: "10px 12px",
    backgroundColor: colors.bgTertiary,
    borderRadius: "6px",
    border: `1px solid transparent`,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  storeItemSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.bgHover,
  },
  storeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  storeName: {
    fontWeight: 500,
    color: colors.accentTeal,
  },
  storeStats: {
    color: colors.textMuted,
    fontSize: "11px",
  },
  storePreview: {
    marginTop: "6px",
  },
  expandStateButton: {
    padding: "2px 6px",
    backgroundColor: "transparent",
    border: "none",
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: "11px",
    fontFamily: "inherit",
  },
  statePreview: {
    display: "block",
    marginTop: "4px",
    padding: "6px 8px",
    backgroundColor: colors.bgSecondary,
    borderRadius: "4px",
    color: colors.textSecondary,
    fontSize: "11px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  stateExpanded: {
    marginTop: "4px",
    padding: "8px",
    backgroundColor: colors.bgSecondary,
    borderRadius: "4px",
    color: colors.textSecondary,
    fontSize: "11px",
    overflow: "auto",
    maxHeight: "200px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  storeMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "6px",
    paddingTop: "6px",
    borderTop: `1px solid ${colors.border}`,
  },

  // Module List
  moduleList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  moduleItem: {
    padding: "12px",
    backgroundColor: colors.bgSecondary,
    borderRadius: "6px",
    border: `1px solid transparent`,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  moduleItemSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.bgHover,
  },
  moduleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  moduleName: {
    fontWeight: 500,
    color: colors.accentYellow,
  },
  moduleStatus: {
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
  },
  moduleStatusActive: {
    backgroundColor: "rgba(166, 227, 161, 0.2)",
    color: colors.accentGreen,
  },
  moduleStatusInactive: {
    backgroundColor: "rgba(108, 112, 134, 0.2)",
    color: colors.textMuted,
  },
  moduleMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
  },
  moduleInstance: {
    marginTop: "8px",
  },
  moduleCreatedAt: {
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: `1px solid ${colors.border}`,
    color: colors.textMuted,
    fontSize: "11px",
  },

  // Empty State
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "200px",
    color: colors.textMuted,
    textAlign: "center",
  },

  // Status Bar
  statusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: colors.bgSecondary,
    borderTop: `1px solid ${colors.border}`,
    color: colors.textMuted,
    fontSize: "11px",
  },
};
