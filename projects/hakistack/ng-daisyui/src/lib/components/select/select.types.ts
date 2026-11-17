/**
 * An option for `hk-select` (and anything listing choices the same way). `T` is the value type; the
 * component itself works with string values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SelectOption<T = any> {
  label: string;
  value: T;
  /** Stable DOM id for the option (defaults to one derived from the value). */
  id?: string;
  disabled?: boolean;
  /** Group heading the option is listed under. */
  group?: string;
}
