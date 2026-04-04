/** Characters that define mask slot types: 9=digit, a=alpha, *=alphanumeric */
export type MaskChar = '9' | 'a' | '*';

export interface MaskSlot {
  readonly index: number;
  readonly editable: boolean;
  readonly maskChar?: MaskChar;
  readonly literal?: string;
  readonly optional: boolean;
}

export interface MaskDefinition {
  readonly slots: MaskSlot[];
  readonly firstEditableIndex: number;
  readonly lastRequiredEditableIndex: number;
  readonly optionalStartIndex: number;
}
