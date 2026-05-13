import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * App-wide default text for every `<hk-pdf-viewer>` toolbar / aria-label / state.
 * Override globally via `provideHkPdfLabels({...})`. Per-instance overrides
 * aren't supported (a viewer is rarely localized differently from its siblings).
 */
export interface PdfViewerLabels {
  // Toolbar buttons
  /** Default: "Previous page" */
  previousPage?: string;
  /** Default: "Next page" */
  nextPage?: string;
  /** Default: "First page" */
  firstPage?: string;
  /** Default: "Last page" */
  lastPage?: string;
  /** Default: "Zoom in" */
  zoomIn?: string;
  /** Default: "Zoom out" */
  zoomOut?: string;
  /** Default: "Fit page" */
  fitPage?: string;
  /** Default: "Fit width" */
  fitWidth?: string;
  /** Default: "Print" */
  print?: string;
  /** Default: "Download" */
  download?: string;
  /** Default: "Toggle sidebar" */
  toggleSidebar?: string;
  /** Default: "Fullscreen" */
  fullscreen?: string;
  /** Default: "Exit fullscreen" */
  exitFullscreen?: string;

  // Sidebar
  /** Default: "Thumbnails" */
  thumbnailsTab?: string;
  /** Default: "Bookmarks" */
  bookmarksTab?: string;
  /** Default: "Attachments" */
  attachmentsTab?: string;
  /** Default: "Annotations" */
  annotationsTab?: string;
  /** Default: "No bookmarks in this document" */
  noBookmarks?: string;
  /** Default: "No attachments in this document" */
  noAttachments?: string;
  /** Default: "No annotations in this document" */
  noAnnotations?: string;
  /** Default: "Page {page} thumbnail" — `{page}` token is replaced with the page number. */
  thumbnailAriaLabel?: string;

  // Search
  /** Default: "Search the document" */
  searchPlaceholder?: string;
  /** Default: "Find in document" */
  searchAriaLabel?: string;
  /** Default: "Previous match" */
  previousMatch?: string;
  /** Default: "Next match" */
  nextMatch?: string;
  /** Default: "Clear search" */
  clearSearch?: string;
  /** Default: "Find" — tooltip for the toolbar find button. */
  find?: string;
  /** Default: "Match case" — tooltip for the case-sensitivity toggle. */
  findCaseSensitive?: string;
  /** Default: "Match whole word" — tooltip for the whole-word toggle. */
  findWholeWord?: string;
  /** Default: "More options" — tooltip on the toolbar overflow menu. */
  moreOptions?: string;
  /**
   * Default: "{current} of {total}" — both tokens replaced with numbers.
   * Shown as a counter next to the search input.
   */
  matchCounter?: string;
  /** Default: "No matches" */
  noMatches?: string;

  // Page indicator
  /** Default: "Page {current} of {total}" — both tokens replaced. */
  pageIndicator?: string;
  /** Default: "Go to page" — aria-label for the page-input. */
  pageInputAriaLabel?: string;

  // Loading / error states
  /** Default: "Loading PDF…" */
  loading?: string;
  /** Default: "Failed to load the PDF." */
  errorGeneric?: string;
  /** Default: "This file isn't a valid PDF." */
  errorInvalidPdf?: string;
  /** Default: "Password is required to open this PDF." */
  errorPasswordRequired?: string;
  /** Default: "The password you entered is incorrect." */
  errorPasswordWrong?: string;
  /** Default: "Retry" */
  retry?: string;

  // Password prompt
  /** Default: "Enter password" */
  passwordPromptTitle?: string;
  /** Default: "This PDF is password-protected." */
  passwordPromptDescription?: string;
  /** Default: "Password" */
  passwordInputLabel?: string;
  /** Default: "Submit" */
  passwordSubmit?: string;
  /** Default: "Cancel" */
  passwordCancel?: string;
}

/** Resolved labels — every field guaranteed to be a string after defaults are applied. */
export type ResolvedPdfViewerLabels = Required<PdfViewerLabels>;

/** Default English label set. */
export const DEFAULT_PDF_VIEWER_LABELS: ResolvedPdfViewerLabels = {
  previousPage: 'Previous page',
  nextPage: 'Next page',
  firstPage: 'First page',
  lastPage: 'Last page',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fitPage: 'Fit page',
  fitWidth: 'Fit width',
  print: 'Print',
  download: 'Download',
  toggleSidebar: 'Toggle sidebar',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  thumbnailsTab: 'Thumbnails',
  bookmarksTab: 'Bookmarks',
  attachmentsTab: 'Attachments',
  annotationsTab: 'Annotations',
  noBookmarks: 'No bookmarks in this document',
  noAttachments: 'No attachments in this document',
  noAnnotations: 'No annotations in this document',
  thumbnailAriaLabel: 'Page {page} thumbnail',
  searchPlaceholder: 'Search the document',
  searchAriaLabel: 'Find in document',
  previousMatch: 'Previous match',
  nextMatch: 'Next match',
  clearSearch: 'Clear search',
  find: 'Find',
  findCaseSensitive: 'Match case',
  findWholeWord: 'Match whole word',
  moreOptions: 'More options',
  matchCounter: '{current} of {total}',
  noMatches: 'No matches',
  pageIndicator: 'Page {current} of {total}',
  pageInputAriaLabel: 'Go to page',
  loading: 'Loading PDF…',
  errorGeneric: 'Failed to load the PDF.',
  errorInvalidPdf: "This file isn't a valid PDF.",
  errorPasswordRequired: 'Password is required to open this PDF.',
  errorPasswordWrong: 'The password you entered is incorrect.',
  retry: 'Retry',
  passwordPromptTitle: 'Enter password',
  passwordPromptDescription: 'This PDF is password-protected.',
  passwordInputLabel: 'Password',
  passwordSubmit: 'Submit',
  passwordCancel: 'Cancel',
};

export const HK_PDF_LABELS = new InjectionToken<PdfViewerLabels>('HK_PDF_LABELS');

/**
 * Register app-wide text defaults for `<hk-pdf-viewer>`. Any field omitted
 * falls back to the English default in `DEFAULT_PDF_VIEWER_LABELS`.
 *
 * @example
 * providers: [
 *   provideHkPdfLabels({
 *     previousPage: 'Anterior',
 *     nextPage: 'Siguiente',
 *     loading: 'Cargando PDF…',
 *     pageIndicator: 'Página {current} de {total}',
 *   }),
 * ]
 */
export function provideHkPdfLabels(labels: PdfViewerLabels): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HK_PDF_LABELS, useValue: labels }]);
}
