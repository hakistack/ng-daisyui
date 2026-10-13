import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * Text of `<hk-document-workspace>`'s chrome. Override app-wide with
 * `provideHkDocumentWorkspaceLabels({...})`; omitted fields keep the English
 * default. (PDFs open in `hk-pdf-workspace`, labelled by `provideHkPdfLabels`.)
 */
export interface DocumentWorkspaceLabels {
  /** Default: "Sections" — Accessible name of the rail. */
  rail?: string;
  /** Default: "Details" */
  inspector?: string;
  /** Default: "Show side panel" */
  showRail?: string;
  /** Default: "Hide side panel" */
  hideRail?: string;
  /** Default: "Show details" */
  showInspector?: string;
  /** Default: "Hide details" */
  hideInspector?: string;
  /** Default: "Skip to sections" */
  skipToRail?: string;
  /** Default: "{count} sections" */
  sectionCount?: string;
  /** Default: "Section navigation" */
  pagerAria?: string;
  /** Default: "Previous section" */
  previous?: string;
  /** Default: "Next section" */
  next?: string;
  /** Default: "Go to section" */
  goTo?: string;
  /** Default: "Zoom" */
  zoomAria?: string;
  /** Default: "Zoom in" */
  zoomIn?: string;
  /** Default: "Zoom out" */
  zoomOut?: string;
  /** Default: "Reset zoom ({value})" */
  zoomReset?: string;
  /** Default: "Edit" */
  edit?: string;
  /** Default: "Editing" — Toolbar badge while editing. */
  editing?: string;
  /** Default: "File" — Inspector section. */
  fileSection?: string;
  /** Default: "Properties" — Inspector section with the format's own properties. */
  propertiesSection?: string;
  /** Default: "Actions" */
  actionsSection?: string;
  /** Default: "Name" */
  fileName?: string;
  /** Default: "Format" */
  format?: string;
  /** Default: "Type" — The MIME type. */
  mimeType?: string;
  /** Default: "Size" */
  size?: string;
  /** Default: "Download" */
  download?: string;
  /** Default: "Document" — Accessible name of the document area. */
  documentAria?: string;
}

export type ResolvedDocumentWorkspaceLabels = Required<DocumentWorkspaceLabels>;

export const DEFAULT_DOCUMENT_WORKSPACE_LABELS: ResolvedDocumentWorkspaceLabels = {
  rail: 'Sections',
  inspector: 'Details',
  showRail: 'Show side panel',
  hideRail: 'Hide side panel',
  showInspector: 'Show details',
  hideInspector: 'Hide details',
  skipToRail: 'Skip to sections',
  sectionCount: '{count} sections',
  pagerAria: 'Section navigation',
  previous: 'Previous section',
  next: 'Next section',
  goTo: 'Go to section',
  zoomAria: 'Zoom',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomReset: 'Reset zoom ({value})',
  edit: 'Edit',
  editing: 'Editing',
  fileSection: 'File',
  propertiesSection: 'Properties',
  actionsSection: 'Actions',
  fileName: 'Name',
  format: 'Format',
  mimeType: 'Type',
  size: 'Size',
  download: 'Download',
  documentAria: 'Document',
};

export const HK_DOCUMENT_WORKSPACE_LABELS = new InjectionToken<DocumentWorkspaceLabels>('HK_DOCUMENT_WORKSPACE_LABELS');

/** Register app-wide text for `<hk-document-workspace>`. */
export function provideHkDocumentWorkspaceLabels(labels: DocumentWorkspaceLabels): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HK_DOCUMENT_WORKSPACE_LABELS, useValue: labels }]);
}
