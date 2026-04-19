/**
 * Represents a tab item configuration
 */
export interface TabItem {
  /** Unique identifier for this tab */
  value: string;
  /** Display text for the tab header */
  label: string;
  /** Optional icon to display alongside the label (reserved for future custom icon support) */
  icon?: string;
  /** Whether this tab is disabled and cannot be selected */
  disabled?: boolean;
}

/** How tab selection is applied: 'follow' activates on focus, 'explicit' requires click/enter */
export type TabSelectionMode = 'follow' | 'explicit';

/** Layout orientation of the tab group */
export type TabOrientation = 'horizontal' | 'vertical';
