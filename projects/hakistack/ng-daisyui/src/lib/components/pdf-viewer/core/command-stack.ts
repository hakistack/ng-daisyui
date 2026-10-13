/**
 * A reversible edit. `apply` performs it, `revert` undoes it. Both may be
 * async (most edits cross the worker boundary). Commands are plain data plus
 * behaviour so a later phase can serialize them (collaboration, persistence).
 */
export interface PdfCommand {
  /** Short human label ("Add highlight", "Rotate page 3"), for UI and debugging. */
  readonly label: string;
  /** What the command edits (`'pages'` for page structure), for callers that treat some edits differently. */
  readonly kind?: string;
  apply(): void | Promise<void>;
  revert(): void | Promise<void>;
  /**
   * Fold a newer command into this one instead of pushing it (e.g. successive
   * colour tweaks on one annotation). Return the merged command, or `null` to
   * push `next` separately.
   */
  merge?(next: PdfCommand): PdfCommand | null;
}

/** Snapshot of the stack for UI binding. */
export interface PdfCommandStackState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** True when the current position differs from the last {@link CommandStack.markSaved} point. */
  readonly dirty: boolean;
  readonly undoLabel: string | null;
  readonly redoLabel: string | null;
}

/**
 * Linear undo/redo history.
 *
 * - `execute` applies a command and records it; any redo tail is discarded.
 * - Transactions group several commands into one undo step (e.g. a drag).
 * - `markSaved` records the clean point that `dirty` is measured against; the
 *   clean point survives undo/redo across it (undoing past a save is dirty again).
 * - `limit` caps history length; the oldest entries drop first. A dropped
 *   clean point can never be reached again, so the stack stays dirty.
 *
 * Operations are serialized: a call made while another is in flight waits for
 * it, so async commands never interleave.
 */
export class CommandStack {
  private readonly done: PdfCommand[] = [];
  private readonly undone: PdfCommand[] = [];
  /** Position (`done.length`) at the last save; `-1` = unreachable. */
  private savedAt = 0;
  private transaction: PdfCommand[] | null = null;
  private transactionLabel = '';
  private queue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<(state: PdfCommandStackState) => void>();

  constructor(private readonly limit = 200) {}

  get state(): PdfCommandStackState {
    return {
      canUndo: this.done.length > 0,
      canRedo: this.undone.length > 0,
      dirty: this.savedAt !== this.done.length,
      undoLabel: this.done.at(-1)?.label ?? null,
      redoLabel: this.undone.at(-1)?.label ?? null,
    };
  }

  /** The command `undo` would revert next. */
  peekUndo(): PdfCommand | undefined {
    return this.done.at(-1);
  }

  /** The command `redo` would apply next. */
  peekRedo(): PdfCommand | undefined {
    return this.undone.at(-1);
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: PdfCommandStackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Apply `command` and record it (or add it to the open transaction). */
  execute(command: PdfCommand): Promise<void> {
    return this.enqueue(async () => {
      await command.apply();
      if (this.transaction) {
        this.transaction.push(command);
        return;
      }
      this.record(command);
    });
  }

  /** Start grouping subsequent `execute` calls into a single undo step. */
  beginTransaction(label: string): void {
    if (this.transaction) throw new Error('CommandStack: a transaction is already open');
    this.transaction = [];
    this.transactionLabel = label;
  }

  /** Close the open transaction and record its commands as one step. */
  commitTransaction(): Promise<void> {
    return this.enqueue(async () => {
      const steps = this.transaction;
      if (!steps) throw new Error('CommandStack: no open transaction');
      this.transaction = null;
      if (steps.length === 0) return;
      this.record(steps.length === 1 ? steps[0] : composite(this.transactionLabel, steps));
    });
  }

  /** Revert everything applied inside the open transaction and discard it. */
  rollbackTransaction(): Promise<void> {
    return this.enqueue(async () => {
      const steps = this.transaction;
      if (!steps) throw new Error('CommandStack: no open transaction');
      this.transaction = null;
      for (let i = steps.length - 1; i >= 0; i--) await steps[i].revert();
    });
  }

  undo(): Promise<boolean> {
    return this.enqueue(async () => {
      const command = this.done.pop();
      if (!command) return false;
      await command.revert();
      this.undone.push(command);
      this.emit();
      return true;
    });
  }

  redo(): Promise<boolean> {
    return this.enqueue(async () => {
      const command = this.undone.pop();
      if (!command) return false;
      await command.apply();
      this.done.push(command);
      this.emit();
      return true;
    });
  }

  /** Record the current position as saved (`dirty` becomes false). */
  markSaved(): void {
    this.savedAt = this.done.length;
    this.emit();
  }

  /** Forget all history (e.g. a new document was loaded). */
  clear(): void {
    this.done.length = 0;
    this.undone.length = 0;
    this.savedAt = 0;
    this.transaction = null;
    this.emit();
  }

  private record(command: PdfCommand): void {
    const last = this.done.at(-1);
    const merged = last && this.savedAt !== this.done.length ? (last.merge?.(command) ?? null) : null;
    if (merged) {
      this.done[this.done.length - 1] = merged;
    } else {
      this.done.push(command);
    }
    this.undone.length = 0;
    if (this.savedAt > this.done.length) this.savedAt = -1; // clean point was in the discarded redo tail
    while (this.done.length > this.limit) {
      this.done.shift();
      this.savedAt = this.savedAt > 0 ? this.savedAt - 1 : -1;
    }
    this.emit();
  }

  private emit(): void {
    const state = this.state;
    for (const l of this.listeners) l(state);
  }

  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const run = this.queue.then(op);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

/** One undo step made of several commands: applied in order, reverted in reverse. */
function composite(label: string, steps: readonly PdfCommand[]): PdfCommand {
  return {
    label,
    async apply() {
      for (const s of steps) await s.apply();
    },
    async revert() {
      for (let i = steps.length - 1; i >= 0; i--) await steps[i].revert();
    },
  };
}
