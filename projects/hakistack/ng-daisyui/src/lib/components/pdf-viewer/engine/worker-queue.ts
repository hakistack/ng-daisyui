/**
 * Task priority inside the worker. Lower runs first.
 * - `high`: what the user is looking at (visible pages).
 * - `normal`: prefetch, overlays, one-off reads.
 * - `low`: background work (thumbnails, search indexing).
 */
export type PdfTaskPriority = 'high' | 'normal' | 'low';

const RANK: Record<PdfTaskPriority, number> = { high: 0, normal: 1, low: 2 };

export interface QueuedTask {
  readonly id: number;
  readonly priority: PdfTaskPriority;
  /**
   * A barrier (any document mutation, open, close or save) keeps its place in
   * the stream: everything enqueued before it runs first, everything after
   * waits for it. Priority only reorders tasks between two barriers, so a
   * high-priority render can never overtake an edit it should reflect, and a
   * read queued before a page deletion still sees the old page indices.
   */
  readonly barrier: boolean;
  readonly run: () => unknown;
}

/**
 * The worker's task queue: one task at a time, highest priority first (FIFO
 * within a priority), barriers kept in order, queued tasks cancellable.
 *
 * Between tasks it yields through `schedule`, so incoming messages (new
 * requests, cancellations) are handled before the next task is picked. That
 * is what makes cancelling a render that has scrolled out of view effective:
 * a cancel that arrives while other work runs removes the render before it
 * starts.
 */
export class WorkerTaskQueue {
  /** Runs of tasks separated by barriers; a barrier sits alone in its segment. */
  private readonly segments: QueuedTask[][] = [[]];
  private running = false;
  private scheduled = false;

  constructor(private readonly schedule: (fn: () => void) => void) {}

  get size(): number {
    return this.segments.reduce((n, s) => n + s.length, 0);
  }

  enqueue(task: QueuedTask): void {
    if (task.barrier) {
      if (this.tail().length > 0) this.segments.push([]);
      this.tail().push(task);
      this.segments.push([]);
    } else {
      this.tail().push(task);
    }
    this.kick();
  }

  /** Remove a queued task. Returns false if it already started (or never existed). */
  cancel(id: number): boolean {
    for (const segment of this.segments) {
      const i = segment.findIndex((t) => t.id === id);
      if (i >= 0) {
        segment.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  private tail(): QueuedTask[] {
    return this.segments[this.segments.length - 1];
  }

  private kick(): void {
    if (this.running || this.scheduled || this.size === 0) return;
    this.scheduled = true;
    this.schedule(() => {
      this.scheduled = false;
      void this.drainOne();
    });
  }

  private async drainOne(): Promise<void> {
    const task = this.next();
    if (!task) return;
    this.running = true;
    try {
      await task.run();
    } catch {
      // Tasks report their own errors; a throw here must not stall the queue.
    } finally {
      this.running = false;
      this.kick();
    }
  }

  private next(): QueuedTask | undefined {
    while (this.segments.length > 1 && this.segments[0].length === 0) this.segments.shift();
    const segment = this.segments[0];
    if (segment.length === 0) return undefined;
    let best = 0;
    for (let i = 1; i < segment.length; i++) {
      if (RANK[segment[i].priority] < RANK[segment[best].priority]) best = i;
    }
    return segment.splice(best, 1)[0];
  }
}

/**
 * Zero-delay scheduler for workers. `setTimeout(0)` is clamped to ~4 ms after a
 * few nested calls, which adds up across hundreds of tasks; a MessageChannel
 * round-trip yields to the event loop without the clamp.
 */
export function createMessageChannelScheduler(): (fn: () => void) => void {
  if (typeof MessageChannel === 'undefined') return (fn) => setTimeout(fn, 0);
  const channel = new MessageChannel();
  const queue: (() => void)[] = [];
  channel.port1.onmessage = () => queue.shift()?.();
  return (fn) => {
    queue.push(fn);
    channel.port2.postMessage(null);
  };
}
