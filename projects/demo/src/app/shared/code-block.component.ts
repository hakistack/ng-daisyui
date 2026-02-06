import { Component, effect, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { highlightCode } from './syntax-highlighter';

@Component({
  selector: 'app-code-block',
  template: `
    <div class="code-block relative rounded-xl overflow-hidden">
      <div class="code-header flex items-center justify-between px-4 py-2">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-error/60"></span>
          <span class="w-3 h-3 rounded-full bg-warning/60"></span>
          <span class="w-3 h-3 rounded-full bg-success/60"></span>
        </div>
        <button
          class="copy-btn text-xs px-2.5 py-1 rounded-md transition-all"
          (click)="copyCode()"
        >
          @if (copied()) {
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </span>
          } @else {
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </span>
          }
        </button>
      </div>
      <div class="code-body overflow-x-auto" [innerHTML]="highlightedHtml()"></div>
    </div>
  `,
  styles: `
    .code-block {
      background: oklch(0.2 0.015 260);
      border: 1px solid oklch(0.3 0.01 260);
    }
    .code-header {
      background: oklch(0.22 0.015 260);
      border-bottom: 1px solid oklch(0.28 0.01 260);
    }
    .copy-btn {
      color: oklch(0.65 0.01 260);
      background: oklch(0.25 0.01 260);
      border: 1px solid oklch(0.32 0.01 260);
    }
    .copy-btn:hover {
      color: oklch(0.85 0.01 260);
      background: oklch(0.3 0.015 260);
    }
    :host ::ng-deep .shiki {
      margin: 0;
      padding: 1rem 1.25rem;
      background: transparent !important;
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Consolas', ui-monospace, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    :host ::ng-deep .shiki code {
      font-family: inherit;
    }
  `,
})
export class CodeBlockComponent {
  code = input.required<string>();
  lang = input<'typescript' | 'angular-html'>('typescript');
  copied = signal(false);
  highlightedHtml = signal<SafeHtml>('');

  constructor(private sanitizer: DomSanitizer) {
    effect(() => {
      const code = this.code();
      const lang = this.lang();
      highlightCode(code, lang).then((html) => {
        this.highlightedHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
      });
    });
  }

  copyCode() {
    navigator.clipboard.writeText(this.code()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
