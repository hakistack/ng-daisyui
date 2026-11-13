import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideCaseSensitive, LucideChevronLeft, LucideChevronRight, LucideSearch, LucideWholeWord, LucideX } from '@lucide/angular';
import { PdfFindService } from '../services/pdf-find.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';
import { PDF_CHROME } from './pdf-chrome';

/** In-document find bar: query input, match-case / whole-word toggles, counter, prev/next, close. */
@Component({
  selector: 'hk-pdf-find-bar',
  imports: [LucideSearch, LucideCaseSensitive, LucideWholeWord, LucideChevronLeft, LucideChevronRight, LucideX],
  templateUrl: './pdf-find-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfFindBarComponent {
  protected readonly ui = inject(PDF_CHROME);
  protected readonly store = inject(PdfViewerStore);
  protected readonly find = inject(PdfFindService);
}
