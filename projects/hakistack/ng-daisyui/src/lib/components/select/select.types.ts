/**
 * Represents an option in the select dropdown
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SelectOption<T = any> {
  /** Display text shown in the dropdown */
  label: string;
  /** The value associated with this option */
  value: T;
  /** Whether this option is disabled and cannot be selected */
  disabled?: boolean;
}
