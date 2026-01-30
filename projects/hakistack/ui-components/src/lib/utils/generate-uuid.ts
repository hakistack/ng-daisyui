import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';

/**
 * Generates a unique identifier (UUID).
 * @returns {string} A UUID string.
 */
export function generateUniqueId(): string {
  return uuid();
}

/**
 * Generates a session identifier using ULID.
 * @returns {string} A ULID string.
 */
export function generateSessionId(): string {
  return ulid();
}
