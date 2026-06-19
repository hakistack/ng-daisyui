import { Signal, computed, signal } from '@angular/core';

/**
 * A single reversible edit.
 *
 * `do()` applies the change, `undo()` reverts it. The pair must be exact
 * inverses: running `do` then `undo` must leave the document byte-identical to
 * before. Keep both synchronous — the stack runs them inside `execute`/`undo`/
 * `redo` and reads the resulting state immediately.
 */
export interface EditorCommand {
  /** Optional human label, surfaced in undo/redo tooltips (e.g. "Type", "Delete row"). */
  readonly label?: string;
  /** Apply the change. */
  do(): void;
  /** Revert the change applied by `do()`. */
  undo(): void;
}

/**
 * Generic undo/redo stack shared by every document editor.
 *
 * This is the format-agnostic history that the roadmap's §2.3 calls for: the
 * text editor, the spreadsheet grid, and the PDF annotation layer all push
 * `EditorCommand`s here so the shell's single Undo/Redo pair controls them all.
 * TipTap keeps its own internal history and is later adapted as one composite
 * command on this stack rather than duplicating it.
 *
 * The model is the classic two-stack history collapsed into one array plus a
 * cursor: everything below `cursor` is undoable, everything at/above is
 * redoable. `execute` truncates the redo branch — once you make a new edit,
 * the formerly-undone future is gone, matching every editor users know.
 *
 * State is exposed as signals so the shell toolbar can bind `canUndo()` /
 * `canRedo()` directly with OnPush change detection.
 */
export class CommandStack {
  private readonly commands = signal<EditorCommand[]>([]);
  /** Index where the next executed command lands; everything before it is undoable. */
  private readonly cursor = signal(0);

  /** Number of commands currently on the undo side of the cursor. */
  readonly depth: Signal<number> = computed(() => this.cursor());
  readonly canUndo: Signal<boolean> = computed(() => this.cursor() > 0);
  readonly canRedo: Signal<boolean> = computed(() => this.cursor() < this.commands().length);

  /**
   * Run a command and record it. Discards any redo branch — a fresh edit
   * always becomes the new tip of history.
   */
  execute(command: EditorCommand): void {
    command.do();
    const kept = this.commands().slice(0, this.cursor());
    kept.push(command);
    this.commands.set(kept);
    this.cursor.set(kept.length);
  }

  /** Revert the most recent command. No-op when there is nothing to undo. */
  undo(): void {
    if (!this.canUndo()) return;
    const next = this.cursor() - 1;
    this.commands()[next].undo();
    this.cursor.set(next);
  }

  /** Re-apply the most recently undone command. No-op when there is nothing to redo. */
  redo(): void {
    if (!this.canRedo()) return;
    const current = this.cursor();
    this.commands()[current].do();
    this.cursor.set(current + 1);
  }

  /** Drop all history. Used on reset / source swap. */
  clear(): void {
    this.commands.set([]);
    this.cursor.set(0);
  }
}
