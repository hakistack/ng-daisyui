import { v4 as uuid } from 'uuid';

/**
 * Generates a unique identifier (UUID).
 * Used internally by library components.
 * @returns A UUID string.
 */
export function generateUniqueId(): string {
  return uuid();
}
