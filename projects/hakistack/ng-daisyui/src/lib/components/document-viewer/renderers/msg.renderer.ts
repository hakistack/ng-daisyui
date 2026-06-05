import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

import { DocumentRendererInputs } from '../document-viewer.types';
import { loadSourceAsBytes } from '../document-viewer.helpers';
import { ParsedEmail } from './eml.renderer';

/**
 * Renderer for `.msg` (Outlook MSG / OLE Compound File) messages.
 *
 * Lazy-imports the optional `@kenjiuno/msgreader` peer dep. .msg
 * files use Microsoft's OLE Compound Document format wrapped around
 * proprietary property streams — much harder to parse than RFC 822,
 * which is why we need a specialized lib here vs the postal-mime path
 * the `.eml` renderer uses.
 *
 * Output shape matches [`ParsedEmail`] from `eml.renderer.ts` so the
 * presentation logic (header card + sandboxed iframe body + attachment
 * list) is identical. We duplicate the template here rather than
 * extract a base class because the parsing logic is the only thing
 * different — and two parallel renderers are easier to reason about
 * than an inheritance chain.
 */
@Component({
  selector: 'hk-document-msg-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Parsing Outlook message…</div>
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
export class DocumentMsgRenderer {
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
      this.parsed.set(await parseMsgBytes(bytes));
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to parse Outlook message.');
    } finally {
      this.loading.set(false);
    }
  }
}

/**
 * Parse Outlook .msg bytes via msgreader. The lib exposes a
 * `MsgReader` constructor that takes the bytes and exposes
 * `getFileData()` for a JSON-ish summary.
 */
async function parseMsgBytes(bytes: Uint8Array): Promise<ParsedEmail> {
  let msgReader: typeof import('@kenjiuno/msgreader');
  try {
    msgReader = await import('@kenjiuno/msgreader');
  } catch (e) {
    throw new Error(
      'MSG rendering requires the optional peer dependency `@kenjiuno/msgreader`.\n' +
        'Install it:  npm install @kenjiuno/msgreader\n\n' +
        `Underlying error: ${(e as Error).message ?? e}`,
    );
  }

  // msgreader's default export is the MsgReader class.
  const MsgReaderCtor = msgReader.default;
  const reader = new MsgReaderCtor(bytes.buffer as ArrayBuffer);
  const data = reader.getFileData() as MsgFileData;

  if (data.error) {
    throw new Error(`msgreader: ${data.error}`);
  }

  return {
    from: data.senderName && data.senderEmail ? `${data.senderName} <${data.senderEmail}>` : (data.senderEmail ?? data.senderName ?? ''),
    to: formatRecipients(data.recipients),
    subject: data.subject ?? '',
    date: data.messageDeliveryTime ?? data.clientSubmitTime ?? null,
    bodyHtml: data.bodyHtml ?? null,
    bodyText: data.body ?? '',
    attachments: (data.attachments ?? []).map((a) => ({
      filename: a.fileName ?? a.fileNameShort ?? '(unnamed)',
      size: a.contentLength ?? 0,
      mimeType: a.mimeType ?? 'application/octet-stream',
    })),
  };
}

/** Minimal shape of msgreader's `getFileData()` output that we touch. */
interface MsgFileData {
  error?: string;
  subject?: string;
  body?: string;
  bodyHtml?: string;
  senderName?: string;
  senderEmail?: string;
  messageDeliveryTime?: string;
  clientSubmitTime?: string;
  recipients?: ReadonlyArray<{ name?: string; email?: string }>;
  attachments?: ReadonlyArray<{
    fileName?: string;
    fileNameShort?: string;
    contentLength?: number;
    mimeType?: string;
  }>;
}

function formatRecipients(recipients: MsgFileData['recipients']): string {
  if (!recipients) return '';
  return recipients
    .map((r) => (r.name && r.email ? `${r.name} <${r.email}>` : (r.email ?? r.name ?? '')))
    .filter((s) => s)
    .join(', ');
}
