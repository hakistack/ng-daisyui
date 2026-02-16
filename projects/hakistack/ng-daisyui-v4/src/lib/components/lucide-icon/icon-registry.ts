import { InjectionToken } from '@angular/core';
import {
  type LucideIconData,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Braces,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  CircleX,
  Columns3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  Info,
  ListFilter,
  Lock,
  RotateCcw,
  Search,
  Sheet,
  TriangleAlert,
  X,
} from 'lucide-angular';

export type IconRegistry = Record<string, LucideIconData>;

/**
 * Internal icons required by library components (table, toast, tree, etc.).
 * These are always included so library features work out of the box.
 */
const HK_INTERNAL_ICONS: IconRegistry = {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Braces,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  CircleX,
  Columns3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  Info,
  ListFilter,
  Lock,
  RotateCcw,
  Search,
  Sheet,
  TriangleAlert,
  X,
};

/**
 * Injection token for the icon registry used by `hk-lucide-icon`.
 *
 * The factory default includes the 29 internal icons so library components
 * work without any consumer configuration. Consumers register additional
 * icons via `provideIcons()`.
 */
export const ICON_REGISTRY = new InjectionToken<IconRegistry>('HkIconRegistry', {
  factory: () => HK_INTERNAL_ICONS,
});

/**
 * Register additional Lucide icons for use with `hk-lucide-icon`.
 *
 * Library-internal icons are always included automatically.
 *
 * @example
 * ```typescript
 * import { provideIcons } from '@hakistack/ng-daisyui-v4';
 * import { Home, Settings, User } from 'lucide-angular';
 *
 * providers: [
 *   provideIcons({ Home, Settings, User }),
 * ]
 * ```
 */
export function provideIcons(icons: IconRegistry) {
  return { provide: ICON_REGISTRY, useValue: { ...HK_INTERNAL_ICONS, ...icons } };
}
