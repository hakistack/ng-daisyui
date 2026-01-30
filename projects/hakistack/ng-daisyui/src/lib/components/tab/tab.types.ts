import { IconName } from '../lucide-icon/lucide-icon.component';

export interface TabItem {
  value: string;
  label: string;
  icon?: IconName;
  disabled?: boolean;
}

export type TabSelectionMode = 'follow' | 'explicit';
export type TabOrientation = 'horizontal' | 'vertical';
