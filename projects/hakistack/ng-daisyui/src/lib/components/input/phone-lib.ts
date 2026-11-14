/**
 * The libphonenumber-js surface used by the phone variant. Imported ONLY through
 * `loadPhoneLib()` (dynamic `import()`), so apps that use `hk-input` without
 * `variant="phone"` don't ship the ~150 KB of phone metadata.
 */
export { AsYouType, getExampleNumber, parsePhoneNumberWithError } from 'libphonenumber-js';
export { default as examples } from 'libphonenumber-js/mobile/examples';
