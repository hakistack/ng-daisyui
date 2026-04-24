import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import type { Editor } from '@tiptap/core';
import { EditorToolbarComponent } from './editor-toolbar.component';
import type { EditorImageUploader, EditorTextChangeEvent, EditorToolbarConfig, EditorToolbarItem } from './editor.types';

/**
 * Rich text editor — TipTap (ProseMirror) backed, DaisyUI-native.
 *
 * Architecture:
 *   - This component owns the editor lifecycle, CVA, validation, commands.
 *   - `<hk-editor-toolbar>` (separate component) renders the toolbar chrome.
 *   - `ViewEncapsulation.None` + `.hk-editor__*` BEM prefix: TipTap injects
 *     its `.ProseMirror` DOM dynamically, which Angular's emulated
 *     encapsulation never reaches. Unscoped styles under a unique prefix
 *     give us theming without leaking globally.
 *
 * Value contract: HTML string via `ControlValueAccessor`.
 * Engine lazy-loaded in `afterNextRender`.
 */
@Component({
  selector: 'hk-editor',
  imports: [EditorToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
  ],
})
export class EditorComponent implements ControlValueAccessor, Validator {
  readonly placeholder = input<string>('Write something…');
  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly toolbar = input<EditorToolbarConfig>('basic');
  readonly minLength = input<number | null>(null);
  readonly maxLength = input<number | null>(null);
  readonly editorHeight = input<string>('200px');
  readonly ariaLabel = input<string>('');
  /**
   * Extra class names applied to the editor's content root (TipTap's `.tiptap`
   * element) via the documented `editorProps.attributes.class` API. Handy for
   * adding typography utilities like `prose prose-sm` without overriding our
   * built-in styling. Read once at init — static by design.
   */
  readonly contentClass = input<string>('');
  /**
   * Async callback invoked when the Image toolbar button is clicked and the
   * user picks a file. Return the URL to insert. If not provided, the Image
   * button falls back to a URL prompt. Storage is consumer-owned.
   */
  readonly onImageUpload = input<EditorImageUploader | undefined>(undefined);

  readonly textChange = output<EditorTextChangeEvent>();
  readonly editorFocus = output<void>();
  readonly editorBlur = output<void>();
  readonly editorReady = output<void>();

  readonly ready = signal(false);
  /** Bumped on every ProseMirror transaction — toolbar closures read this reactively. */
  readonly tick = signal(0);

  // Text-prompt modal state — used by both the link URL and image alt/URL
  // flows. `openTextPrompt()` returns a Promise that resolves with the input
  // value on confirm, the skipValue on Skip, or null on Cancel / Escape.
  readonly textPromptOpen = signal(false);
  readonly textPromptValue = signal('');
  readonly textPromptTitle = signal('');
  readonly textPromptDescription = signal('');
  readonly textPromptPlaceholder = signal('');
  readonly textPromptConfirmLabel = signal('OK');
  readonly textPromptShowSkip = signal(false);
  readonly textPromptSkipLabel = signal('Skip');
  private textPromptResolver: ((value: string | null) => void) | null = null;
  private textPromptSkipValue = '';

  private readonly hostRef = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private instance: Editor | null = null;
  private pendingValue: string | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private cvaDisabled = false;

  readonly effectiveDisabled = computed(() => this.disabled() || this.readonly() || this.cvaDisabled);

  // Closures bound once so the toolbar's `input<()=>boolean>` gets a stable ref.
  readonly isActiveCheck = (item: EditorToolbarItem): boolean => {
    this.tick();
    return isActive(this.instance, item);
  };
  readonly canRunCheck = (item: EditorToolbarItem): boolean => {
    this.tick();
    return canRun(this.instance, item);
  };

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      void this.initialize();
    });

    effect(() => {
      if (this.instance) this.instance.setEditable(!this.effectiveDisabled());
    });

    this.destroyRef.onDestroy(() => {
      this.instance?.destroy();
      this.instance = null;
    });
  }

  private async initialize(): Promise<void> {
    const [{ Editor }, { default: StarterKit }, { default: Link }, { default: Placeholder }, { default: Image }, { FileHandler }] =
      await Promise.all([
        import('@tiptap/core'),
        import('@tiptap/starter-kit'),
        import('@tiptap/extension-link'),
        import('@tiptap/extension-placeholder'),
        import('@tiptap/extension-image'),
        import('@tiptap/extension-file-handler'),
      ]);

    const extraClass = this.contentClass().trim();
    this.instance = new Editor({
      element: this.hostRef().nativeElement,
      extensions: [
        // StarterKit 2.x bundles Link; disable it so our explicit Link config
        // (openOnClick: false, safe rel attrs) isn't shadowed / doesn't collide.
        StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow' } }),
        Placeholder.configure({ placeholder: this.placeholder() }),
        Image.configure({ inline: false, HTMLAttributes: { class: 'hk-editor__image' } }),
        // Drag-and-drop + paste for image files. Uses the same onImageUpload
        // callback as the toolbar button; skips the alt-text prompt to keep
        // the drop/paste UX frictionless (file name is used as alt).
        FileHandler.configure({
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
          onDrop: (editor, files, pos) => {
            for (const file of files) this.uploadAndInsertImage(editor, file, { pos, promptAlt: false });
          },
          onPaste: (editor, files) => {
            for (const file of files) this.uploadAndInsertImage(editor, file, { promptAlt: false });
          },
        }),
      ],
      content: this.pendingValue ?? '',
      editable: !this.effectiveDisabled(),
      // Pass consumer-supplied classes to the content root per TipTap docs:
      // https://tiptap.dev/docs/editor/getting-started/style-editor#editor
      ...(extraClass ? { editorProps: { attributes: { class: extraClass } } } : {}),
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        this.onChange(html);
        this.textChange.emit({ html, text: editor.getText() });
        this.tick.update((n) => n + 1);
      },
      onSelectionUpdate: () => this.tick.update((n) => n + 1),
      onTransaction: () => this.tick.update((n) => n + 1),
      onFocus: () => this.editorFocus.emit(),
      onBlur: () => {
        this.onTouched();
        this.editorBlur.emit();
      },
    });

    this.pendingValue = null;
    this.ready.set(true);
    this.editorReady.emit();
  }

  runCommand(item: EditorToolbarItem): void {
    if (item === 'image') {
      void this.insertImage();
      return;
    }
    if (item === 'link') {
      void this.insertLink();
      return;
    }
    runCommand(this.instance, item);
  }

  /**
   * Image insertion flow via the toolbar button. File path if onImageUpload
   * is provided (file picker → upload → alt-text modal → insert), URL path
   * otherwise (URL prompt → alt-text modal → insert).
   */
  private async insertImage(): Promise<void> {
    const editor = this.instance;
    if (!editor) return;

    const uploader = this.onImageUpload();
    if (uploader) {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.onchange = () => {
        const file = picker.files?.[0];
        if (file) void this.uploadAndInsertImage(editor, file, { promptAlt: true });
      };
      picker.click();
      return;
    }

    const url = await this.promptUrl('Image URL', '');
    if (!url) return;
    const alt = await this.promptAltText('');
    if (alt === null) return; // user cancelled
    editor.chain().focus().setImage({ src: url, alt }).run();
  }

  /** Link command — prompts for URL via the modal, then sets/unsets the link mark. */
  private async insertLink(): Promise<void> {
    const editor = this.instance;
    if (!editor) return;
    const prev = (editor.getAttributes('link')['href'] as string | undefined) ?? '';
    const url = await this.promptUrl('Link URL', prev);
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  /**
   * Shared upload-and-insert for toolbar button, drag-and-drop, and paste.
   * `promptAlt: true` asks the user for alt text (toolbar button use case);
   * `false` uses the file name silently (drop/paste for a frictionless UX).
   * `pos` places the image at a specific document offset (drop targets).
   */
  private async uploadAndInsertImage(editor: Editor, file: File, opts: { pos?: number; promptAlt?: boolean } = {}): Promise<void> {
    const uploader = this.onImageUpload();
    if (!uploader) return;
    try {
      const url = await uploader(file);
      if (!url) return;
      let alt: string;
      if (opts.promptAlt) {
        const result = await this.promptAltText(file.name);
        if (result === null) return; // user cancelled
        alt = result;
      } else {
        alt = file.name;
      }
      const chain = editor.chain().focus();
      if (opts.pos !== undefined) {
        chain.insertContentAt(opts.pos, { type: 'image', attrs: { src: url, alt } }).run();
      } else {
        chain.setImage({ src: url, alt }).run();
      }
    } catch {
      // Consumer's upload failed — swallow; their promise rejection surfaces it.
    }
  }

  /**
   * Generic text-prompt modal. Resolves with the trimmed input on confirm,
   * the (non-trimmed) `skipValue` on Skip, or `null` on Cancel / Escape.
   */
  private openTextPrompt(opts: {
    title: string;
    description?: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel?: string;
    showSkip?: boolean;
    skipLabel?: string;
    skipValue?: string;
  }): Promise<string | null> {
    this.textPromptTitle.set(opts.title);
    this.textPromptDescription.set(opts.description ?? '');
    this.textPromptPlaceholder.set(opts.placeholder ?? '');
    this.textPromptValue.set(opts.initialValue ?? '');
    this.textPromptConfirmLabel.set(opts.confirmLabel ?? 'OK');
    this.textPromptShowSkip.set(opts.showSkip ?? false);
    this.textPromptSkipLabel.set(opts.skipLabel ?? 'Skip');
    this.textPromptSkipValue = opts.skipValue ?? '';
    this.textPromptOpen.set(true);
    return new Promise((resolve) => {
      this.textPromptResolver = resolve;
    });
  }

  /** Alt-text-specific wrapper — includes the Skip (decorative) affordance. */
  private promptAltText(suggested: string): Promise<string | null> {
    return this.openTextPrompt({
      title: 'Image alt text',
      description: 'Describe the image for screen readers. Leave blank if the image is purely decorative.',
      placeholder: 'e.g. Team photo, 2026 offsite in Lisbon',
      initialValue: suggested,
      confirmLabel: 'Insert',
      showSkip: true,
      skipLabel: 'Skip (decorative)',
      skipValue: '',
    });
  }

  /** URL prompt wrapper — Cancel / Confirm only, no Skip. */
  private promptUrl(title: string, initial: string): Promise<string | null> {
    return this.openTextPrompt({
      title,
      placeholder: 'https://…',
      initialValue: initial,
      confirmLabel: 'OK',
      showSkip: false,
    });
  }

  /** Called from the modal template. */
  resolveTextPrompt(action: 'confirm' | 'skip' | 'cancel'): void {
    const resolver = this.textPromptResolver;
    this.textPromptResolver = null;
    this.textPromptOpen.set(false);
    if (!resolver) return;
    if (action === 'confirm') resolver(this.textPromptValue().trim());
    else if (action === 'skip') resolver(this.textPromptSkipValue);
    else resolver(null);
  }

  // --- ControlValueAccessor ----------------------------------------------

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (this.instance) {
      this.instance.commands.setContent(html, { emitUpdate: false });
    } else {
      this.pendingValue = html;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled = isDisabled;
    if (this.instance) this.instance.setEditable(!this.effectiveDisabled());
  }

  // --- Validator ----------------------------------------------------------

  validate(control: AbstractControl): ValidationErrors | null {
    const text = this.instance?.getText() ?? (typeof control.value === 'string' ? stripHtml(control.value) : '');
    const length = text.trim().length;
    const min = this.minLength();
    const max = this.maxLength();
    const errors: ValidationErrors = {};
    if (min !== null && length > 0 && length < min) errors['minlength'] = { requiredLength: min, actualLength: length };
    if (max !== null && length > max) errors['maxlength'] = { requiredLength: max, actualLength: length };
    return Object.keys(errors).length > 0 ? errors : null;
  }
}

// ---- Command dispatch helpers (pure, no Angular deps) ----------------------

function isActive(editor: Editor | null, item: EditorToolbarItem): boolean {
  if (!editor) return false;
  switch (item) {
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strike':
    case 'code':
    case 'link':
    case 'image':
    case 'bulletList':
    case 'orderedList':
    case 'blockquote':
    case 'codeBlock':
      return editor.isActive(item);
    case 'heading1':
      return editor.isActive('heading', { level: 1 });
    case 'heading2':
      return editor.isActive('heading', { level: 2 });
    case 'heading3':
      return editor.isActive('heading', { level: 3 });
    default:
      return false;
  }
}

function canRun(editor: Editor | null, item: EditorToolbarItem): boolean {
  if (!editor) return false;
  switch (item) {
    case 'undo':
      return editor.can().chain().focus().undo().run();
    case 'redo':
      return editor.can().chain().focus().redo().run();
    default:
      return true;
  }
}

function runCommand(editor: Editor | null, item: EditorToolbarItem): void {
  if (!editor) return;
  const c = editor.chain().focus();
  switch (item) {
    case 'bold':
      c.toggleBold().run();
      break;
    case 'italic':
      c.toggleItalic().run();
      break;
    case 'underline':
      editor.commands.toggleMark?.('underline');
      break;
    case 'strike':
      c.toggleStrike().run();
      break;
    case 'code':
      c.toggleCode().run();
      break;
    case 'link':
    case 'image':
      // Both handled by the component class — they need the modal-backed
      // prompt flows (and onImageUpload) which live on the instance.
      break;
    case 'heading1':
      c.toggleHeading({ level: 1 }).run();
      break;
    case 'heading2':
      c.toggleHeading({ level: 2 }).run();
      break;
    case 'heading3':
      c.toggleHeading({ level: 3 }).run();
      break;
    case 'bulletList':
      c.toggleBulletList().run();
      break;
    case 'orderedList':
      c.toggleOrderedList().run();
      break;
    case 'blockquote':
      c.toggleBlockquote().run();
      break;
    case 'codeBlock':
      c.toggleCodeBlock().run();
      break;
    case 'horizontalRule':
      c.setHorizontalRule().run();
      break;
    case 'undo':
      c.undo().run();
      break;
    case 'redo':
      c.redo().run();
      break;
  }
}

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent ?? '';
}
