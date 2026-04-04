import { MaskChar, MaskDefinition, MaskSlot } from './input-mask.types';

// ── Mask Character Tests ─────────────────────────────────────────────────

export const MASK_TESTS: Record<MaskChar, (c: string) => boolean> = {
  '9': (c) => /^[0-9]$/.test(c),
  a: (c) => /^[a-zA-Z]$/.test(c),
  '*': (c) => /^[a-zA-Z0-9]$/.test(c),
};

const MASK_CHARS = new Set<string>(['9', 'a', '*']);

// ── Parse Mask ───────────────────────────────────────────────────────────

export function parseMask(mask: string): MaskDefinition {
  const slots: MaskSlot[] = [];
  let optional = false;
  let firstEditableIndex = -1;
  let lastRequiredEditableIndex = -1;
  let optionalStartIndex = -1;

  for (let i = 0; i < mask.length; i++) {
    const char = mask[i];

    if (char === '?') {
      optional = true;
      optionalStartIndex = slots.length;
      continue;
    }

    const editable = MASK_CHARS.has(char);
    const slot: MaskSlot = {
      index: slots.length,
      editable,
      maskChar: editable ? (char as MaskChar) : undefined,
      literal: editable ? undefined : char,
      optional,
    };

    if (editable && firstEditableIndex === -1) {
      firstEditableIndex = slot.index;
    }
    if (editable && !optional) {
      lastRequiredEditableIndex = slot.index;
    }

    slots.push(slot);
  }

  return {
    slots,
    firstEditableIndex: firstEditableIndex === -1 ? 0 : firstEditableIndex,
    lastRequiredEditableIndex,
    optionalStartIndex: optionalStartIndex === -1 ? slots.length : optionalStartIndex,
  };
}

// ── Build Display Value ──────────────────────────────────────────────────

export function buildDisplayValue(slots: MaskSlot[], rawChars: string[], slotChar: string): string {
  let result = '';
  let rawIndex = 0;

  for (const slot of slots) {
    if (slot.editable) {
      result += rawIndex < rawChars.length && rawChars[rawIndex] ? rawChars[rawIndex] : slotChar;
      rawIndex++;
    } else {
      result += slot.literal!;
    }
  }

  return result;
}

// ── Extract Raw Value ────────────────────────────────────────────────────

export function extractRawValue(slots: MaskSlot[], displayValue: string, slotChar: string): string[] {
  const rawChars: string[] = [];
  let charIndex = 0;

  for (const slot of slots) {
    if (charIndex >= displayValue.length) break;

    if (slot.editable) {
      const c = displayValue[charIndex];
      if (c !== slotChar && slot.maskChar && MASK_TESTS[slot.maskChar](c)) {
        rawChars.push(c);
      }
      charIndex++;
    } else {
      // Skip literal characters
      charIndex++;
    }
  }

  return rawChars;
}

// ── Apply Character ──────────────────────────────────────────────────────

export function applyCharAtPosition(
  slots: MaskSlot[],
  rawChars: string[],
  char: string,
  cursorPos: number,
): { newRawChars: string[]; newCursorPos: number } | null {
  // Find the next editable slot at or after cursorPos
  const slotIndex = getNextEditableSlotIndex(slots, cursorPos);
  if (slotIndex === -1) return null;

  const slot = slots[slotIndex];
  if (!slot.maskChar || !MASK_TESTS[slot.maskChar](char)) return null;

  // Compute which raw character index this slot corresponds to
  const rawIndex = getEditableCount(slots, slotIndex);
  const newRawChars = [...rawChars];

  // Ensure array is large enough
  while (newRawChars.length <= rawIndex) {
    newRawChars.push('');
  }

  newRawChars[rawIndex] = char;

  // Move cursor past the inserted slot and any subsequent literals
  const newCursorPos = getNextEditablePosition(slots, slotIndex + 1);

  return { newRawChars, newCursorPos };
}

// ── Delete Character ─────────────────────────────────────────────────────

export function deleteCharAtPosition(
  slots: MaskSlot[],
  rawChars: string[],
  cursorPos: number,
  direction: 'backward' | 'forward',
): { newRawChars: string[]; newCursorPos: number } {
  let slotIndex: number;

  if (direction === 'backward') {
    slotIndex = getPrevEditableSlotIndex(slots, cursorPos - 1);
  } else {
    slotIndex = getNextEditableSlotIndex(slots, cursorPos);
  }

  if (slotIndex === -1) {
    return { newRawChars: [...rawChars], newCursorPos: cursorPos };
  }

  const rawIndex = getEditableCount(slots, slotIndex);
  const newRawChars = [...rawChars];

  if (rawIndex < newRawChars.length) {
    newRawChars.splice(rawIndex, 1);
  }

  const newCursorPos = direction === 'backward' ? slotIndex : cursorPos;

  return { newRawChars, newCursorPos };
}

// ── Handle Selection Delete ──────────────────────────────────────────────

export function deleteSelectionRange(
  slots: MaskSlot[],
  rawChars: string[],
  selStart: number,
  selEnd: number,
): { newRawChars: string[]; newCursorPos: number } {
  const indicesToRemove: number[] = [];

  for (let i = selStart; i < selEnd && i < slots.length; i++) {
    if (slots[i].editable) {
      indicesToRemove.push(getEditableCount(slots, i));
    }
  }

  const newRawChars = rawChars.filter((_, idx) => !indicesToRemove.includes(idx));

  return { newRawChars, newCursorPos: selStart };
}

// ── Handle Paste ─────────────────────────────────────────────────────────

export function handlePaste(
  slots: MaskSlot[],
  rawChars: string[],
  pastedText: string,
  cursorPos: number,
): { newRawChars: string[]; newCursorPos: number } {
  let currentRawChars = [...rawChars];
  let currentCursorPos = cursorPos;

  for (const char of pastedText) {
    const result = applyCharAtPosition(slots, currentRawChars, char, currentCursorPos);
    if (result) {
      currentRawChars = result.newRawChars;
      currentCursorPos = result.newCursorPos;
    }
  }

  return { newRawChars: currentRawChars, newCursorPos: currentCursorPos };
}

// ── Completeness Check ───────────────────────────────────────────────────

export function isComplete(slots: MaskSlot[], rawChars: string[]): boolean {
  let rawIndex = 0;
  for (const slot of slots) {
    if (slot.editable) {
      if (!slot.optional) {
        if (rawIndex >= rawChars.length || !rawChars[rawIndex]) {
          return false;
        }
      }
      rawIndex++;
    }
  }
  return true;
}

// ── Cursor Helpers ───────────────────────────────────────────────────────

/** Get the display position of the next editable slot at or after `from` */
export function getNextEditablePosition(slots: MaskSlot[], from: number): number {
  for (let i = from; i < slots.length; i++) {
    if (slots[i].editable) return i;
  }
  // If no more editable slots, return position after the last slot
  return slots.length;
}

/** Get the display position of the first unfilled editable slot */
export function getFirstUnfilledPosition(slots: MaskSlot[], rawChars: string[]): number {
  let rawIndex = 0;
  for (const slot of slots) {
    if (slot.editable) {
      if (rawIndex >= rawChars.length || !rawChars[rawIndex]) {
        return slot.index;
      }
      rawIndex++;
    }
  }
  return slots.length;
}

// ── Internal Helpers ─────────────────────────────────────────────────────

/** Find the index of the next editable slot at or after the display position */
function getNextEditableSlotIndex(slots: MaskSlot[], from: number): number {
  for (let i = from; i < slots.length; i++) {
    if (slots[i].editable) return i;
  }
  return -1;
}

/** Find the index of the previous editable slot at or before the display position */
function getPrevEditableSlotIndex(slots: MaskSlot[], from: number): number {
  for (let i = Math.min(from, slots.length - 1); i >= 0; i--) {
    if (slots[i].editable) return i;
  }
  return -1;
}

/** Count how many editable slots come before (not including) the given slot index */
function getEditableCount(slots: MaskSlot[], upToIndex: number): number {
  let count = 0;
  for (let i = 0; i < upToIndex; i++) {
    if (slots[i].editable) count++;
  }
  return count;
}
