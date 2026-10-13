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
  /** Default: "Continuous scroll" — display-mode button. */
  continuousMode?: string;
  /** Default: "Single page" — display-mode button. */
  singlePageMode?: string;
  /** Default: "Two pages" — display-mode button (side-by-side spreads). */
  twoPageMode?: string;
  /** Default: "Searching…" — shown while a search is still scanning pages. */
  searching?: string;
  /** Default: "Dismiss" — closes the non-fatal operation-error alert. */
  dismiss?: string;
  /** Default: "Go to page {page}" — aria-label for an internal (same-document) link. */
  linkToPage?: string;

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

  // Annotations
  /** Default: "Annotate" */
  annotate?: string;
  /** Default: "Annotation tools" */
  annotationToolbar?: string;
  /** Default: "Close annotation tools" */
  closeAnnotationToolbar?: string;
  /** Default: "Select" */
  selectTool?: string;
  /** Default: "Highlight" */
  highlight?: string;
  /** Default: "Underline" */
  underline?: string;
  /** Default: "Strikethrough" */
  strikeout?: string;
  /** Default: "Squiggly underline" */
  squiggly?: string;
  /** Default: "Rectangle" */
  rectangle?: string;
  /** Default: "Ellipse" */
  ellipse?: string;
  /** Default: "Line" */
  line?: string;
  /** Default: "Arrow" */
  arrow?: string;
  /** Default: "Polygon" */
  polygon?: string;
  /** Default: "Polyline" */
  polyline?: string;
  /** Default: "Cloud" */
  cloud?: string;
  /** Default: "Freehand" */
  ink?: string;
  /** Default: "Eraser" */
  eraser?: string;
  /** Default: "Text box" */
  textBox?: string;
  /** Default: "Sticky note" */
  stickyNote?: string;
  /** Default: "Undo" */
  undo?: string;
  /** Default: "Redo" */
  redo?: string;
  /** Default: "Annotation properties" */
  annotationProperties?: string;
  /** Default: "Colour" */
  color?: string;
  /** Default: "Fill" */
  fillColor?: string;
  /** Default: "No fill" */
  noFill?: string;
  /** Default: "Opacity" */
  opacity?: string;
  /** Default: "Thickness" */
  strokeWidth?: string;
  /** Default: "Line style" */
  lineStyle?: string;
  /** Default: "Solid" */
  solid?: string;
  /** Default: "Dashed" */
  dashed?: string;
  /** Default: "Start" */
  lineStart?: string;
  /** Default: "End" */
  lineEnd?: string;
  /** Default: "Cloudy border" */
  cloudyBorder?: string;
  /** Default: "Font" */
  font?: string;
  /** Default: "Size" */
  fontSize?: string;
  /** Default: "Text colour" */
  textColor?: string;
  /** Default: "Align left" */
  alignLeft?: string;
  /** Default: "Align centre" */
  alignCenter?: string;
  /** Default: "Align right" */
  alignRight?: string;
  /** Default: "Icon" */
  noteIcon?: string;
  /** Default: "Lock" */
  lock?: string;
  /** Default: "Unlock" */
  unlock?: string;
  /** Default: "Delete" */
  deleteAnnotation?: string;
  /** Default: "Comments" */
  openComments?: string;
  /** Default: "Type" */
  filterType?: string;
  /** Default: "Author" */
  filterAuthor?: string;
  /** Default: "Status" */
  filterStatus?: string;
  /** Default: "All" */
  all?: string;
  /** Default: "Reply" */
  reply?: string;
  /** Default: "Write a reply…" */
  replyPlaceholder?: string;
  /** Default: "Edit" */
  edit?: string;
  /** Default: "Save" */
  save?: string;
  /** Default: "Cancel" */
  cancel?: string;
  /** Default: "Delete reply" */
  deleteReply?: string;
  /** Default: "No status" */
  statusNone?: string;
  /** Default: "Accepted" */
  statusAccepted?: string;
  /** Default: "Rejected" */
  statusRejected?: string;
  /** Default: "Cancelled" */
  statusCancelled?: string;
  /** Default: "Completed" */
  statusCompleted?: string;
  /** Default: "Comment" */
  comment?: string;
  /** Default: "No comment" */
  noComment?: string;
  /** Default: "Page {page}" */
  pageGroup?: string;
  /** Default: "{type} by {author}" */
  annotationAriaLabel?: string;
  /** Default: "Annotations can't be added to this document (its permissions don't allow it, or it couldn't be read)." */
  annotationsReadOnly?: string;
  /** Default: "Guest" */
  defaultAuthor?: string;
  /** Default: "None" */
  endingNone?: string;
  /** Default: "Open arrow" */
  endingOpenArrow?: string;
  /** Default: "Closed arrow" */
  endingClosedArrow?: string;
  /** Default: "Circle" */
  endingCircle?: string;
  /** Default: "Square" */
  endingSquare?: string;
  /** Default: "Diamond" */
  endingDiamond?: string;
  /** Default: "Bar" */
  endingButt?: string;
  /** Default: "Slash" */
  endingSlash?: string;
  /** Default: "Double-click or press Enter to finish; Esc cancels." */
  finishShape?: string;
  /** Default: "Stamp" */
  stamp?: string;
  /** Default: "Standard" */
  standardStamps?: string;
  /** Default: "Dynamic" */
  dynamicStamps?: string;
  /** Default: "Sign here" */
  signHereStamps?: string;
  /** Default: "Custom stamp…" */
  customStamp?: string;
  /** Default: "Image stamp…" */
  imageStamp?: string;
  /** Default: "Custom stamp" */
  textStampTitle?: string;
  /** Default: "Text" */
  stampText?: string;
  /** Default: "Second line" */
  stampSubtext?: string;
  /** Default: "Shape" */
  stampShape?: string;
  /** Default: "Rounded" */
  shapeRounded?: string;
  /** Default: "Square corners" */
  shapeRect?: string;
  /** Default: "Arrow" */
  shapeArrow?: string;
  /** Default: "Add name and date" */
  includeAuthorDate?: string;
  /** Default: "{author} · {date}" */
  dynamicStampSubtext?: string;
  /** Default: "APPROVED" */
  stampApproved?: string;
  /** Default: "NOT APPROVED" */
  stampNotApproved?: string;
  /** Default: "DRAFT" */
  stampDraft?: string;
  /** Default: "FINAL" */
  stampFinal?: string;
  /** Default: "CONFIDENTIAL" */
  stampConfidential?: string;
  /** Default: "FOR COMMENT" */
  stampForComment?: string;
  /** Default: "FOR PUBLIC RELEASE" */
  stampForPublicRelease?: string;
  /** Default: "NOT FOR PUBLIC RELEASE" */
  stampNotForPublicRelease?: string;
  /** Default: "EXPERIMENTAL" */
  stampExperimental?: string;
  /** Default: "EXPIRED" */
  stampExpired?: string;
  /** Default: "AS IS" */
  stampAsIs?: string;
  /** Default: "DEPARTMENTAL" */
  stampDepartmental?: string;
  /** Default: "SOLD" */
  stampSold?: string;
  /** Default: "TOP SECRET" */
  stampTopSecret?: string;
  /** Default: "RECEIVED" */
  stampReceived?: string;
  /** Default: "REVIEWED" */
  stampReviewed?: string;
  /** Default: "REVISED" */
  stampRevised?: string;
  /** Default: "SIGN HERE" */
  stampSignHere?: string;
  /** Default: "WITNESS" */
  stampWitness?: string;
  /** Default: "INITIAL HERE" */
  stampInitialHere?: string;
  /** Default: "Link" */
  link?: string;
  /** Default: "Link to" */
  linkTarget?: string;
  /** Default: "Web address" */
  linkUrl?: string;
  /** Default: "Page" */
  linkPage?: string;
  /** Default: "Open link" */
  openLink?: string;
  /** Default: "Enter an http(s), mailto or tel address." */
  invalidUrl?: string;
  /** Default: "Measure" */
  measure?: string;
  /** Default: "Distance" */
  distance?: string;
  /** Default: "Perimeter" */
  perimeter?: string;
  /** Default: "Area" */
  area?: string;
  /** Default: "Radius" */
  radius?: string;
  /** Default: "Volume" */
  volume?: string;
  /** Default: "Calibrate scale…" */
  calibrate?: string;
  /** Default: "Measurement scale" */
  calibrateTitle?: string;
  /** Default: "On the page" */
  scaleOnPage?: string;
  /** Default: "In reality" */
  scaleInReality?: string;
  /** Default: "Depth" */
  depth?: string;
  /** Default: "Decimals" */
  precision?: string;
  /** Default: "Scale: {scale}" */
  currentScale?: string;
  /** Default: "Arrange" */
  arrange?: string;
  /** Default: "Bring to front" */
  bringToFront?: string;
  /** Default: "Bring forward" */
  bringForward?: string;
  /** Default: "Send backward" */
  sendBackward?: string;
  /** Default: "Send to back" */
  sendToBack?: string;
  /** Default: "Copy" */
  copy?: string;
  /** Default: "Cut" */
  cut?: string;
  /** Default: "Paste" */
  paste?: string;
  /** Default: "Duplicate" */
  duplicate?: string;
  /** Default: "Import annotations…" */
  importAnnotations?: string;
  /** Default: "Export XFDF" */
  exportXfdf?: string;
  /** Default: "Export JSON" */
  exportJson?: string;
  /** Default: "The file couldn't be imported." */
  importFailed?: string;
  /** Default: "Apply" */
  apply?: string;
  /** Default: "The value doesn't match the field's format." */
  formInvalidFormat?: string;
  /** Default: "Enter a value from {min} to {max}." */
  formOutOfRange?: string;
  /** Default: "Form" */
  form?: string;
  /** Default: "Reset form" */
  resetForm?: string;
  /** Default: "Export form data" */
  exportFormData?: string;
  /** Default: "Import form data…" */
  importFormData?: string;
  /** Default: "Prepare form" */
  prepareForm?: string;
  /** Default: "Form field tools" */
  formDesignToolbar?: string;
  /** Default: "Done" */
  finishDesign?: string;
  /** Default: "Text field" */
  fieldText?: string;
  /** Default: "Multi-line text" */
  fieldMultiline?: string;
  /** Default: "Password" */
  fieldPassword?: string;
  /** Default: "Number" */
  fieldNumber?: string;
  /** Default: "Date" */
  fieldDate?: string;
  /** Default: "Check box" */
  fieldCheckbox?: string;
  /** Default: "Radio button" */
  fieldRadio?: string;
  /** Default: "Dropdown" */
  fieldCombo?: string;
  /** Default: "List box" */
  fieldList?: string;
  /** Default: "Signature" */
  fieldSignature?: string;
  /** Default: "Initials" */
  fieldInitials?: string;
  /** Default: "Field properties" */
  fieldProperties?: string;
  /** Default: "Name" */
  fieldName?: string;
  /** Default: "Tooltip" */
  fieldTooltip?: string;
  /** Default: "Required" */
  fieldRequired?: string;
  /** Default: "Read-only" */
  fieldReadOnly?: string;
  /** Default: "Max length" */
  fieldMaxLength?: string;
  /** Default: "Comb of characters" */
  fieldComb?: string;
  /** Default: "Format" */
  fieldFormat?: string;
  /** Default: "None" */
  formatNone?: string;
  /** Default: "Number" */
  formatNumber?: string;
  /** Default: "Percent" */
  formatPercent?: string;
  /** Default: "Date" */
  formatDate?: string;
  /** Default: "ZIP code" */
  formatZip?: string;
  /** Default: "Phone number" */
  formatPhone?: string;
  /** Default: "Social security number" */
  formatSsn?: string;
  /** Default: "Options (one per line: value|label)" */
  fieldOptions?: string;
  /** Default: "Allow typing" */
  fieldEditable?: string;
  /** Default: "Multiple selection" */
  fieldMultiSelect?: string;
  /** Default: "Export value" */
  fieldExportValue?: string;
  /** Default: "Border" */
  fieldBorder?: string;
  /** Default: "Background" */
  fieldBackground?: string;
  /** Default: "Another field already uses this name." */
  nameTaken?: string;
  /** Default: "Enter a name." */
  nameEmpty?: string;
  /** Default: "Delete field" */
  deleteField?: string;
  /** Default: "This document is certified: its form can't be changed." */
  formLocked?: string;
  /** Default: "Drag on the page to add a field; select a radio group to add options to it." */
  designHint?: string;
  /** Default: "Sign" */
  sign?: string;
  /** Default: "Sign: {field}" */
  signHere?: string;
  /** Default: "Add a signature" */
  signatureDialogTitle?: string;
  /** Default: "Signature" */
  signatureKind?: string;
  /** Default: "Initials" */
  initialsKind?: string;
  /** Default: "Draw" */
  drawTab?: string;
  /** Default: "Type" */
  typeTab?: string;
  /** Default: "Upload" */
  uploadTab?: string;
  /** Default: "Clear" */
  clear?: string;
  /** Default: "Type your name" */
  typeYourName?: string;
  /** Default: "Choose an image" */
  chooseImage?: string;
  /** Default: "Remove the white background" */
  removeBackground?: string;
  /** Default: "Save for later" */
  saveForLater?: string;
  /** Default: "Merge into the page when saving (it can't be moved or removed afterwards)" */
  flattenSignature?: string;
  /** Default: "Saved" */
  savedSignatures?: string;
  /** Default: "Delete saved signature" */
  deleteSaved?: string;
  /** Default: "Ink colour" */
  penColor?: string;
  /** Default: "Draw with a mouse, finger or pen." */
  drawHint?: string;
  /** Default: "Use" */
  useSignature?: string;
  /** Default: "Signatures" */
  signaturesTab?: string;
  /** Default: "No digital signatures in this document" */
  noSignatures?: string;
  /** Default: "Valid" */
  sigValid?: string;
  /** Default: "Invalid" */
  sigInvalid?: string;
  /** Default: "Changed after signing" */
  sigModified?: string;
  /** Default: "Can't be verified" */
  sigUnknown?: string;
  /** Default: "Signed by {name}" */
  sigSignedBy?: string;
  /** Default: "Reason" */
  sigReason?: string;
  /** Default: "Location" */
  sigLocation?: string;
  /** Default: "Signed on" */
  sigDate?: string;
  /** Default: "Covers the whole document" */
  sigCoversDocument?: string;
  /** Default: "The document was changed after this signature" */
  sigLaterChanges?: string;
  /** Default: "The signer's identity isn't verified (no trusted certificate)" */
  sigUntrusted?: string;
  /** Default: "Certificate" */
  sigCertificate?: string;
  /** Default: "Issued by" */
  sigIssuer?: string;
  /** Default: "Valid from {from} to {to}" */
  sigValidity?: string;
  /** Default: "Sign digitally" */
  signDigitally?: string;
  /** Default: "Certification signature" */
  sigCertified?: string;
  /** Default: "Unknown signer" */
  sigUnknownSigner?: string;
  /** Default: "Checking signatures…" */
  sigVerifying?: string;
  /** Default: "Show signature" */
  sigShow?: string;
  /** Default: "Timestamped" */
  sigTimestamped?: string;
  /** Default: "The certificate wasn't valid at the signing time" */
  sigExpiredAtSigning?: string;
  /** Default: "Self-signed certificate" */
  sigSelfSigned?: string;
  /** Default: "Trusted signer" */
  sigTrusted?: string;
  /** Default: "Download the signed version" */
  sigDownloadRevision?: string;
  /** Default: "Details" */
  sigDetails?: string;
  /** Default: "Signature field" */
  sigField?: string;
  /** Default: "Invisible (no signature box)" */
  sigInvisible?: string;
  /** Default: "Contact" */
  sigContact?: string;
  /** Default: "Certify the document" */
  certifyDocument?: string;
  /** Default: "Don't certify" */
  certifyNone?: string;
  /** Default: "No changes allowed" */
  certifyLevel1?: string;
  /** Default: "Allow form filling and signing" */
  certifyLevel2?: string;
  /** Default: "Allow form filling, signing and comments" */
  certifyLevel3?: string;
  /** Default: "Sign" */
  signNow?: string;
  /** Default: "Signing…" */
  signingNow?: string;
  /** Default: "Couldn't sign the document: {error}" */
  signFailed?: string;
  /** Default: "The document is signed as it is now, unsaved changes included. Later changes show as made after signing." */
  digitalSignHint?: string;

  // Page organizer
  /** Default: "Organize pages" */
  organizePages?: string;
  /** Default: "Drag pages to reorder them. Ctrl/⌘ or Shift selects several; Alt + arrow keys move the selection." */
  organizeHint?: string;
  /** Default: "Rotate left" */
  rotateLeft?: string;
  /** Default: "Rotate right" */
  rotateRight?: string;
  /** Default: "Duplicate" */
  duplicatePages?: string;
  /** Default: "Delete" */
  deletePages?: string;
  /** Default: "Insert blank page" */
  insertBlankPage?: string;
  /** Default: "Insert from PDF…" */
  importPdfPages?: string;
  /** Default: "Extract" */
  extractPages?: string;
  /** Default: "Select all" */
  selectAllPages?: string;
  /** Default: "Clear selection" */
  clearPageSelection?: string;
  /** Default: "{count} selected" — `{count}` is the number of selected pages. */
  pagesSelected?: string;
  /** Default: "Thumbnail size" */
  thumbnailSize?: string;
  /** Default: "Page {page}" — Label of a page in the organizer. */
  organizerPage?: string;
  /** Default: "Page {page}, rotated {degrees}°" */
  organizerPageRotated?: string;
  /** Default: "{count} pages" */
  organizerPageCount?: string;
  /** Default: "Moved to position {position}" — Announced when pages are moved with the keyboard. */
  pagesMoved?: string;
  /** Default: "This document's pages can't be edited." */
  pagesNotEditable?: string;
  /** Default: "The document is certified: its pages can't be changed." */
  pagesCertified?: string;
  /** Default: "Pages can't be reorganized while the form design has unsaved changes." */
  pagesDesignPending?: string;
  /** Default: "That PDF is password-protected." */
  importPasswordRequired?: string;
  /** Default: "That file couldn't be read as a PDF." */
  importUnreadable?: string;
  /** Default: "That PDF doesn't allow copying its pages." */
  importNotAllowed?: string;
  /** Default: "Importing…" */
  importingPages?: string;
  /** Default: "Pages can't be extracted from an encrypted document." */
  extractUnavailable?: string;
  /** Default: "Apply your changes before extracting." */
  applyBeforeExtract?: string;
  /** Default: "Rotate page {page}" */
  rotatePageAria?: string;
  /** Default: "Insert a blank page after page {page}" */
  insertAfterPageAria?: string;
  /** Default: "Delete page {page}" */
  deletePageAria?: string;
  /** Default: "Rotate pages" — Undo-history label. */
  rotatePagesCommand?: string;
  /** Default: "Delete pages" — Undo-history label. */
  deletePagesCommand?: string;
  /** Default: "Duplicate pages" — Undo-history label. */
  duplicatePagesCommand?: string;
  /** Default: "Move pages" — Undo-history label. */
  movePagesCommand?: string;
  /** Default: "Insert page" — Undo-history label. */
  insertPageCommand?: string;
  /** Default: "Insert pages from PDF" — Undo-history label. */
  importPagesCommand?: string;
  /** Default: "Organize pages" — Undo-history label. */
  organizePagesCommand?: string;

  // Accessible names
  /** Default: "PDF toolbar" */
  toolbarAria?: string;
  /** Default: "Display mode" */
  displayModeAria?: string;
  /** Default: "Zoom level" */
  zoomLevel?: string;
  /** Default: "Auto" — Zoom option that picks fit-width or 100%. */
  zoomAuto?: string;
  /** Default: "PDF document" — Accessible name of the page stack. */
  documentAria?: string;
  /** Default: "Page {page}" — Accessible name of a page. */
  pageAria?: string;
  /** Default: "(untitled)" — Bookmark without a title. */
  untitledBookmark?: string;
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
  dismiss: 'Dismiss',
  searching: 'Searching…',
  continuousMode: 'Continuous scroll',
  singlePageMode: 'Single page',
  twoPageMode: 'Two pages',
  linkToPage: 'Go to page {page}',
  passwordPromptTitle: 'Enter password',
  passwordPromptDescription: 'This PDF is password-protected.',
  passwordInputLabel: 'Password',
  passwordSubmit: 'Submit',
  passwordCancel: 'Cancel',
  annotate: 'Annotate',
  annotationToolbar: 'Annotation tools',
  closeAnnotationToolbar: 'Close annotation tools',
  selectTool: 'Select',
  highlight: 'Highlight',
  underline: 'Underline',
  strikeout: 'Strikethrough',
  squiggly: 'Squiggly underline',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  arrow: 'Arrow',
  polygon: 'Polygon',
  polyline: 'Polyline',
  cloud: 'Cloud',
  ink: 'Freehand',
  eraser: 'Eraser',
  textBox: 'Text box',
  stickyNote: 'Sticky note',
  undo: 'Undo',
  redo: 'Redo',
  annotationProperties: 'Annotation properties',
  color: 'Colour',
  fillColor: 'Fill',
  noFill: 'No fill',
  opacity: 'Opacity',
  strokeWidth: 'Thickness',
  lineStyle: 'Line style',
  solid: 'Solid',
  dashed: 'Dashed',
  lineStart: 'Start',
  lineEnd: 'End',
  cloudyBorder: 'Cloudy border',
  font: 'Font',
  fontSize: 'Size',
  textColor: 'Text colour',
  alignLeft: 'Align left',
  alignCenter: 'Align centre',
  alignRight: 'Align right',
  noteIcon: 'Icon',
  lock: 'Lock',
  unlock: 'Unlock',
  deleteAnnotation: 'Delete',
  openComments: 'Comments',
  filterType: 'Type',
  filterAuthor: 'Author',
  filterStatus: 'Status',
  all: 'All',
  reply: 'Reply',
  replyPlaceholder: 'Write a reply…',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  deleteReply: 'Delete reply',
  statusNone: 'No status',
  statusAccepted: 'Accepted',
  statusRejected: 'Rejected',
  statusCancelled: 'Cancelled',
  statusCompleted: 'Completed',
  comment: 'Comment',
  noComment: 'No comment',
  pageGroup: 'Page {page}',
  annotationAriaLabel: '{type} by {author}',
  annotationsReadOnly: "Annotations can't be added to this document (its permissions don't allow it, or it couldn't be read).",
  defaultAuthor: 'Guest',
  endingNone: 'None',
  endingOpenArrow: 'Open arrow',
  endingClosedArrow: 'Closed arrow',
  endingCircle: 'Circle',
  endingSquare: 'Square',
  endingDiamond: 'Diamond',
  endingButt: 'Bar',
  endingSlash: 'Slash',
  finishShape: 'Double-click or press Enter to finish; Esc cancels.',
  stamp: 'Stamp',
  standardStamps: 'Standard',
  dynamicStamps: 'Dynamic',
  signHereStamps: 'Sign here',
  customStamp: 'Custom stamp…',
  imageStamp: 'Image stamp…',
  textStampTitle: 'Custom stamp',
  stampText: 'Text',
  stampSubtext: 'Second line',
  stampShape: 'Shape',
  shapeRounded: 'Rounded',
  shapeRect: 'Square corners',
  shapeArrow: 'Arrow',
  includeAuthorDate: 'Add name and date',
  dynamicStampSubtext: '{author} · {date}',
  stampApproved: 'APPROVED',
  stampNotApproved: 'NOT APPROVED',
  stampDraft: 'DRAFT',
  stampFinal: 'FINAL',
  stampConfidential: 'CONFIDENTIAL',
  stampForComment: 'FOR COMMENT',
  stampForPublicRelease: 'FOR PUBLIC RELEASE',
  stampNotForPublicRelease: 'NOT FOR PUBLIC RELEASE',
  stampExperimental: 'EXPERIMENTAL',
  stampExpired: 'EXPIRED',
  stampAsIs: 'AS IS',
  stampDepartmental: 'DEPARTMENTAL',
  stampSold: 'SOLD',
  stampTopSecret: 'TOP SECRET',
  stampReceived: 'RECEIVED',
  stampReviewed: 'REVIEWED',
  stampRevised: 'REVISED',
  stampSignHere: 'SIGN HERE',
  stampWitness: 'WITNESS',
  stampInitialHere: 'INITIAL HERE',
  link: 'Link',
  linkTarget: 'Link to',
  linkUrl: 'Web address',
  linkPage: 'Page',
  openLink: 'Open link',
  invalidUrl: 'Enter an http(s), mailto or tel address.',
  measure: 'Measure',
  distance: 'Distance',
  perimeter: 'Perimeter',
  area: 'Area',
  radius: 'Radius',
  volume: 'Volume',
  calibrate: 'Calibrate scale…',
  calibrateTitle: 'Measurement scale',
  scaleOnPage: 'On the page',
  scaleInReality: 'In reality',
  depth: 'Depth',
  precision: 'Decimals',
  currentScale: 'Scale: {scale}',
  arrange: 'Arrange',
  bringToFront: 'Bring to front',
  bringForward: 'Bring forward',
  sendBackward: 'Send backward',
  sendToBack: 'Send to back',
  copy: 'Copy',
  cut: 'Cut',
  paste: 'Paste',
  duplicate: 'Duplicate',
  importAnnotations: 'Import annotations…',
  exportXfdf: 'Export XFDF',
  exportJson: 'Export JSON',
  importFailed: "The file couldn't be imported.",
  apply: 'Apply',
  formInvalidFormat: "The value doesn't match the field's format.",
  formOutOfRange: 'Enter a value from {min} to {max}.',
  form: 'Form',
  resetForm: 'Reset form',
  exportFormData: 'Export form data',
  importFormData: 'Import form data…',
  prepareForm: 'Prepare form',
  formDesignToolbar: 'Form field tools',
  finishDesign: 'Done',
  fieldText: 'Text field',
  fieldMultiline: 'Multi-line text',
  fieldPassword: 'Password',
  fieldNumber: 'Number',
  fieldDate: 'Date',
  fieldCheckbox: 'Check box',
  fieldRadio: 'Radio button',
  fieldCombo: 'Dropdown',
  fieldList: 'List box',
  fieldSignature: 'Signature',
  fieldInitials: 'Initials',
  fieldProperties: 'Field properties',
  fieldName: 'Name',
  fieldTooltip: 'Tooltip',
  fieldRequired: 'Required',
  fieldReadOnly: 'Read-only',
  fieldMaxLength: 'Max length',
  fieldComb: 'Comb of characters',
  fieldFormat: 'Format',
  formatNone: 'None',
  formatNumber: 'Number',
  formatPercent: 'Percent',
  formatDate: 'Date',
  formatZip: 'ZIP code',
  formatPhone: 'Phone number',
  formatSsn: 'Social security number',
  fieldOptions: 'Options (one per line: value|label)',
  fieldEditable: 'Allow typing',
  fieldMultiSelect: 'Multiple selection',
  fieldExportValue: 'Export value',
  fieldBorder: 'Border',
  fieldBackground: 'Background',
  nameTaken: 'Another field already uses this name.',
  nameEmpty: 'Enter a name.',
  deleteField: 'Delete field',
  formLocked: "This document is certified: its form can't be changed.",
  designHint: 'Drag on the page to add a field; select a radio group to add options to it.',
  sign: 'Sign',
  signHere: 'Sign: {field}',
  signatureDialogTitle: 'Add a signature',
  signatureKind: 'Signature',
  initialsKind: 'Initials',
  drawTab: 'Draw',
  typeTab: 'Type',
  uploadTab: 'Upload',
  clear: 'Clear',
  typeYourName: 'Type your name',
  chooseImage: 'Choose an image',
  removeBackground: 'Remove the white background',
  saveForLater: 'Save for later',
  flattenSignature: "Merge into the page when saving (it can't be moved or removed afterwards)",
  savedSignatures: 'Saved',
  deleteSaved: 'Delete saved signature',
  penColor: 'Ink colour',
  drawHint: 'Draw with a mouse, finger or pen.',
  useSignature: 'Use',
  signaturesTab: 'Signatures',
  noSignatures: 'No digital signatures in this document',
  sigValid: 'Valid',
  sigInvalid: 'Invalid',
  sigModified: 'Changed after signing',
  sigUnknown: "Can't be verified",
  sigSignedBy: 'Signed by {name}',
  sigReason: 'Reason',
  sigLocation: 'Location',
  sigDate: 'Signed on',
  sigCoversDocument: 'Covers the whole document',
  sigLaterChanges: 'The document was changed after this signature',
  sigUntrusted: "The signer's identity isn't verified (no trusted certificate)",
  sigCertificate: 'Certificate',
  sigIssuer: 'Issued by',
  sigValidity: 'Valid from {from} to {to}',
  signDigitally: 'Sign digitally',
  sigCertified: 'Certification signature',
  sigUnknownSigner: 'Unknown signer',
  sigVerifying: 'Checking signatures…',
  sigShow: 'Show signature',
  sigTimestamped: 'Timestamped',
  sigExpiredAtSigning: "The certificate wasn't valid at the signing time",
  sigSelfSigned: 'Self-signed certificate',
  sigTrusted: 'Trusted signer',
  sigDownloadRevision: 'Download the signed version',
  sigDetails: 'Details',
  sigField: 'Signature field',
  sigInvisible: 'Invisible (no signature box)',
  sigContact: 'Contact',
  certifyDocument: 'Certify the document',
  certifyNone: "Don't certify",
  certifyLevel1: 'No changes allowed',
  certifyLevel2: 'Allow form filling and signing',
  certifyLevel3: 'Allow form filling, signing and comments',
  signNow: 'Sign',
  signingNow: 'Signing…',
  signFailed: "Couldn't sign the document: {error}",
  digitalSignHint: 'The document is signed as it is now, unsaved changes included. Later changes show as made after signing.',
  organizePages: 'Organize pages',
  organizeHint: 'Drag pages to reorder them. Ctrl/⌘ or Shift selects several; Alt + arrow keys move the selection.',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  duplicatePages: 'Duplicate',
  deletePages: 'Delete',
  insertBlankPage: 'Insert blank page',
  importPdfPages: 'Insert from PDF…',
  extractPages: 'Extract',
  selectAllPages: 'Select all',
  clearPageSelection: 'Clear selection',
  pagesSelected: '{count} selected',
  thumbnailSize: 'Thumbnail size',
  organizerPage: 'Page {page}',
  organizerPageRotated: 'Page {page}, rotated {degrees}°',
  organizerPageCount: '{count} pages',
  pagesMoved: 'Moved to position {position}',
  pagesNotEditable: "This document's pages can't be edited.",
  pagesCertified: "The document is certified: its pages can't be changed.",
  pagesDesignPending: "Pages can't be reorganized while the form design has unsaved changes.",
  importPasswordRequired: 'That PDF is password-protected.',
  importUnreadable: "That file couldn't be read as a PDF.",
  importNotAllowed: "That PDF doesn't allow copying its pages.",
  importingPages: 'Importing…',
  extractUnavailable: "Pages can't be extracted from an encrypted document.",
  applyBeforeExtract: 'Apply your changes before extracting.',
  rotatePageAria: 'Rotate page {page}',
  insertAfterPageAria: 'Insert a blank page after page {page}',
  deletePageAria: 'Delete page {page}',
  rotatePagesCommand: 'Rotate pages',
  deletePagesCommand: 'Delete pages',
  duplicatePagesCommand: 'Duplicate pages',
  movePagesCommand: 'Move pages',
  insertPageCommand: 'Insert page',
  importPagesCommand: 'Insert pages from PDF',
  organizePagesCommand: 'Organize pages',
  toolbarAria: 'PDF toolbar',
  displayModeAria: 'Display mode',
  zoomLevel: 'Zoom level',
  zoomAuto: 'Auto',
  documentAria: 'PDF document',
  pageAria: 'Page {page}',
  untitledBookmark: '(untitled)',
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
