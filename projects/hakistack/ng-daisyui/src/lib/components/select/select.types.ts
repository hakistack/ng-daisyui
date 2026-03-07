// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SelectOption<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
  group?: string;
}
