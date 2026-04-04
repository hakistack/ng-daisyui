export type EditorOutputFormat = 'html' | 'delta';

export type EditorToolbarPreset = 'full' | 'basic' | 'minimal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EditorToolbarItem = string | Record<string, any>;
export type EditorToolbarGroup = EditorToolbarItem[];
export type EditorToolbarConfig = EditorToolbarPreset | EditorToolbarGroup[];

export interface EditorTextChangeEvent {
  readonly htmlValue: string;
  readonly textValue: string;
  readonly delta: unknown;
  readonly source: 'user' | 'api' | 'silent';
}

export interface EditorSelectionChangeEvent {
  readonly range: { index: number; length: number } | null;
  readonly oldRange: { index: number; length: number } | null;
  readonly source: 'user' | 'api' | 'silent';
}

export interface EditorModules {
  readonly toolbar?: EditorToolbarConfig;
  readonly [key: string]: unknown;
}

export const TOOLBAR_PRESETS: Record<EditorToolbarPreset, EditorToolbarGroup[]> = {
  minimal: [['bold', 'italic', 'underline'], ['link']],
  basic: [['bold', 'italic', 'underline', 'strike'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']],
  full: [
    [{ header: 1 }, { header: 2 }, { header: 3 }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean'],
  ],
};
