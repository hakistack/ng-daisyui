import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';

/**
 * Parsed email — the minimum surface our template needs. Both `.eml`
 * (RFC 822 via postal-mime) and `.msg` (Outlook via msgreader) get
 * normalized to this shape so the two renderers can share the
 * "headers + body + attachments" presentation pattern.
 *
 * Re-exported by `msg.renderer.ts` because the msg renderer's parser
 * produces the same shape — keeping one type means the demo and any
 * consumer downstream sees a uniform model.
 */
export interface ParsedEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly date: string | null;
  /** HTML body if available, sanitized via a sandboxed iframe at render time. */
  readonly bodyHtml: string | null;
  /** Plain-text body, used as a fallback when `bodyHtml` is null. */
  readonly bodyText: string;
  /** Attachment metadata (we don't expose content — just names/sizes). */
  readonly attachments: ReadonlyArray<{ filename: string; size: number; mimeType: string }>;
}

/**
 * Renderer for `.eml` (RFC 822) messages.
 *
 * Lazy-imports the optional `postal-mime` peer dep — a ~50 KB MIME
 * parser used in production by ProtonMail and others. Cleaner ESM
 * shape than node `mailparser` and works directly in browsers.
 *
 * Layout: header card (from/to/subject/date) above a sandboxed
 * iframe body. The iframe pattern matches the HTML renderer — same
 * security posture (no JS, no navigation, no storage).
 */
@Component({
  selector: 'hk-document-eml-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Parsing email…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error whitespace-pre-line">{{ e }}</div>
    } @else if (parsed(); as msg) {
      <div class="flex flex-col gap-3">
        <div class="bg-base-100 border border-base-content/10 rounded p-3 text-sm space-y-1">
          @if (msg.subject) {
            <div class="font-semibold text-base">{{ msg.subject }}</div>
          }
          @if (msg.from) {
            <div><span class="text-base-content/60">From:</span> {{ msg.from }}</div>
          }
          @if (msg.to) {
            <div><span class="text-base-content/60">To:</span> {{ msg.to }}</div>
          }
          @if (msg.date) {
            <div class="text-base-content/60">{{ msg.date }}</div>
          }
        </div>

        @if (msg.attachments.length > 0) {
          <div class="text-xs text-base-content/60">
            <span class="font-semibold">{{ msg.attachments.length }} attachment(s):</span>
            @for (att of msg.attachments; track att.filename; let last = $last) {
              <span
                >{{ att.filename }}
                @if (!last) {
                  <span>,&nbsp;</span>
                }
              </span>
            }
          </div>
        }

        @if (msg.bodyHtml) {
          <iframe
            [attr.srcdoc]="msg.bodyHtml"
            sandbox=""
            title="Email body"
            class="w-full min-h-[40vh] border border-base-content/10 rounded bg-base-100"
            loading="lazy"
            referrerpolicy="no-referrer"
          ></iframe>
        } @else {
          <pre class="bg-base-100 border border-base-content/10 rounded p-4 whitespace-pre-wrap text-sm font-mono">{{ msg.bodyText }}</pre>
        }
      </div>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentEmlRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly parsed = signal<ParsedEmail | null>(null);

  constructor() {
    effect(() => {
      const src = this.source();
      void this.parse(src);
    });
  }

  private async parse(src: DocumentRendererInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.parsed.set(null);
    try {
      const bytes = await loadSourceAsBytes(src);
      this.parsed.set(await parseEmlBytes(bytes));
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to parse email.');
    } finally {
      this.loading.set(false);
    }
  }
}

/**
 * Parse RFC 822 bytes via postal-mime. We feed bytes directly to
 * `PostalMime.parse(buffer)` — its `.parse()` accepts ArrayBuffer /
 * Uint8Array / string and handles base64 / quoted-printable / charset
 * conversion internally.
 */
async function parseEmlBytes(bytes: Uint8Array): Promise<ParsedEmail> {
  let postalMime: typeof import('postal-mime');
  try {
    postalMime = await import('postal-mime');
  } catch (e) {
    throw new Error(
      'EML rendering requires the optional peer dependency `postal-mime`.\n' +
        'Install it:  npm install postal-mime\n\n' +
        `Underlying error: ${(e as Error).message ?? e}`,
    );
  }

  // postal-mime exports `PostalMime` (a class) as the default export.
  // The static `.parse(buffer)` method handles everything in one call.
  const PostalMimeCtor = (postalMime.default ??
    (postalMime as unknown as { PostalMime: typeof postalMime.default }).PostalMime) as typeof postalMime.default;
  const result = await PostalMimeCtor.parse(bytes);

  return {
    from: result.from ? formatAddress(result.from) : '',
    to: (result.to ?? []).map(formatAddress).join(', '),
    subject: result.subject ?? '',
    date: result.date ?? null,
    bodyHtml: result.html ?? null,
    bodyText: result.text ?? '',
    attachments: (result.attachments ?? []).map((a) => ({
      filename: a.filename ?? '(unnamed)',
      size: (a.content as Uint8Array | undefined)?.byteLength ?? 0,
      mimeType: a.mimeType ?? 'application/octet-stream',
    })),
  };
}

interface PostalAddress {
  name?: string;
  address?: string;
}

function formatAddress(a: PostalAddress): string {
  if (a.name && a.address) return `${a.name} <${a.address}>`;
  return a.address ?? a.name ?? '';
}
