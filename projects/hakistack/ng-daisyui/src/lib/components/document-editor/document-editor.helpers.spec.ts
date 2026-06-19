import { describe, expect, it } from 'vitest';

import { createDocumentEditor } from './document-editor.helpers';
import { DocumentEditorInternalApi } from './document-editor.types';
import { ResolvedFormat } from '../document-viewer/document-viewer.types';

const TEXT_FORMAT: ResolvedFormat = { format: 'text', mimeType: 'text/plain', extension: '.txt' };

/** Reach the hidden controller↔component channel the way the shell/editor would. */
function internal(controller: ReturnType<typeof createDocumentEditor>): DocumentEditorInternalApi {
  const api = controller.config()._internal;
  if (!api) throw new Error('expected _internal on config');
  return api;
}

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe('createDocumentEditor', () => {
  it('starts clean with no content and empty history', () => {
    const editor = createDocumentEditor();
    expect(editor.isDirty()).toBe(false);
    expect(editor.canUndo()).toBe(false);
    expect(editor.canRedo()).toBe(false);
    expect(editor.content()).toBeNull();
  });

  it('setInitial seeds a clean baseline (not dirty)', () => {
    const editor = createDocumentEditor();
    const api = internal(editor);
    api.setFormat(TEXT_FORMAT);
    api.setInitial('hello');
    expect(editor.content()).toBe('hello');
    expect(editor.isDirty()).toBe(false);
  });

  it('setContent marks dirty and fires callbacks', () => {
    const changes: unknown[] = [];
    const dirtyFlips: boolean[] = [];
    const editor = createDocumentEditor({ onContentChange: (c) => changes.push(c), onDirtyChange: (d) => dirtyFlips.push(d) });
    internal(editor).setContent('edited');
    expect(editor.content()).toBe('edited');
    expect(editor.isDirty()).toBe(true);
    expect(changes).toEqual(['edited']);
    expect(dirtyFlips).toEqual([true]);
  });

  it('save round-trips the current model through the built-in text serializer', async () => {
    const saved: Uint8Array[] = [];
    const editor = createDocumentEditor({ onSave: (b) => saved.push(b) });
    const api = internal(editor);
    api.setFormat(TEXT_FORMAT);
    api.setInitial('start');
    api.setContent('start edited');

    const bytes = await editor.save();
    expect(decode(bytes)).toBe('start edited');
    expect(saved.length).toBe(1);
    // Saving clears the dirty flag.
    expect(editor.isDirty()).toBe(false);
  });

  it('save rejects when no format has been resolved', async () => {
    const editor = createDocumentEditor();
    await expect(editor.save()).rejects.toThrow(/no source loaded/i);
  });

  it('save rejects for a format with no registered serializer', async () => {
    const editor = createDocumentEditor();
    internal(editor).setFormat({ format: 'docx', mimeType: null, extension: '.docx' });
    await expect(editor.save()).rejects.toThrow(/no serializer/i);
  });

  it('exportAs("original") yields a Blob of the serialized bytes', async () => {
    const editor = createDocumentEditor();
    const api = internal(editor);
    api.setFormat(TEXT_FORMAT);
    api.setInitial('blob me');
    const blob = await editor.exportAs('original');
    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('blob me');
  });

  it('exportAs("pdf") is not supported yet', async () => {
    const editor = createDocumentEditor();
    internal(editor).setFormat(TEXT_FORMAT);
    await expect(editor.exportAs('pdf')).rejects.toThrow(/not supported/i);
  });

  it('undo/redo flow through the shared command stack', () => {
    const editor = createDocumentEditor();
    const api = internal(editor);
    api.setFormat(TEXT_FORMAT);
    api.setInitial('v0');

    // Simulate an editor pushing a snapshot edit command.
    api.stack.execute({
      do: () => api.setContent('v1'),
      undo: () => api.setContent('v0'),
    });
    expect(editor.content()).toBe('v1');
    expect(editor.canUndo()).toBe(true);

    editor.undo();
    expect(editor.content()).toBe('v0');
    expect(editor.canRedo()).toBe(true);

    editor.redo();
    expect(editor.content()).toBe('v1');
  });

  it('reset restores the baseline, clears history, and notifies the editor', () => {
    const resets: unknown[] = [];
    const editor = createDocumentEditor();
    const api = internal(editor);
    api.bind({ reset: (c) => resets.push(c) });
    api.setFormat(TEXT_FORMAT);
    api.setInitial('original');
    api.setContent('changed');
    expect(editor.isDirty()).toBe(true);

    editor.reset();
    expect(editor.content()).toBe('original');
    expect(editor.isDirty()).toBe(false);
    expect(editor.canUndo()).toBe(false);
    expect(resets).toEqual(['original']);
  });
});
