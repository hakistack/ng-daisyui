import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a RFC 4122 v4 UUID. Wraps `uuid`'s `v4()` so all internal
 * callers (DOM ids, toast keys, notification keys, datepicker cell ids,
 * dynamic-form field ids) share a single point of indirection.
 *
 * Works in both secure and insecure contexts — `uuid` v9+ uses
 * `crypto.getRandomValues()` for randomness, which is available in every
 * modern browser regardless of the `crypto.randomUUID()` secure-context
 * restriction.
 */
export function generateUniqueId(): string {
  return uuidv4();
}
