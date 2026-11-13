import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PdfWorkspaceState } from './pdf-workspace.state';

/**
 * The workspace rail: the document list, at full height (the workspace's own
 * list, or the host's — see `PdfWorkspaceRailExtra`). The open document's
 * pages are in the strip under the pages; its outline and attachments, in the
 * inspector.
 */
@Component({
  selector: 'hk-pdf-workspace-rail',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    @if (ws.extraRail(); as extra) {
      <h2 class="border-base-300 truncate border-b px-3 py-2 text-sm font-semibold">{{ extra.title ?? extra.label }}</h2>
      <ng-container [ngTemplateOutlet]="extra.template" />
    }
  `,
})
export class PdfWorkspaceRailComponent {
  protected readonly ws = inject(PdfWorkspaceState);
}
