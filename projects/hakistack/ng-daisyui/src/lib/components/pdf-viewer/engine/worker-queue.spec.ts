import { PdfTaskPriority, QueuedTask, WorkerTaskQueue } from './worker-queue';

/** A scheduler the test drives by hand, so we can enqueue and cancel between steps. */
function manualScheduler() {
  const pending: (() => void)[] = [];
  return {
    schedule: (fn: () => void) => void pending.push(fn),
    /** Run scheduled callbacks (and the microtasks of the tasks they start) until idle. */
    async flush() {
      while (pending.length) {
        pending.shift()!();
        await Promise.resolve();
        await Promise.resolve();
      }
    },
  };
}

describe('WorkerTaskQueue', () => {
  let order: string[];
  let sched: ReturnType<typeof manualScheduler>;
  let queue: WorkerTaskQueue;
  let nextId: number;

  const task = (label: string, priority: PdfTaskPriority = 'normal', barrier = false): QueuedTask => ({
    id: nextId++,
    priority,
    barrier,
    run: () => void order.push(label),
  });

  beforeEach(() => {
    order = [];
    nextId = 1;
    sched = manualScheduler();
    queue = new WorkerTaskQueue(sched.schedule);
  });

  it('runs higher priority first, FIFO within a priority', async () => {
    queue.enqueue(task('low', 'low'));
    queue.enqueue(task('n1'));
    queue.enqueue(task('high', 'high'));
    queue.enqueue(task('n2'));
    await sched.flush();
    expect(order).toEqual(['high', 'n1', 'n2', 'low']);
  });

  it('never reorders tasks across a barrier', async () => {
    queue.enqueue(task('read-before', 'low'));
    queue.enqueue(task('edit', 'normal', true));
    queue.enqueue(task('render-after', 'high'));
    await sched.flush();
    expect(order).toEqual(['read-before', 'edit', 'render-after']);
  });

  it('keeps consecutive barriers in order', async () => {
    queue.enqueue(task('a', 'low', true));
    queue.enqueue(task('b', 'high', true));
    queue.enqueue(task('c', 'high'));
    await sched.flush();
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('cancels a queued task', async () => {
    const t = task('cancelled', 'high');
    queue.enqueue(task('keep'));
    queue.enqueue(t);
    expect(queue.cancel(t.id)).toBe(true);
    await sched.flush();
    expect(order).toEqual(['keep']);
    expect(queue.cancel(t.id)).toBe(false);
  });

  it('accepts cancellations that arrive while another task runs', async () => {
    let release!: () => void;
    const slow: QueuedTask = {
      id: 100,
      priority: 'high',
      barrier: false,
      run: () =>
        new Promise<void>((r) => {
          order.push('slow');
          release = r;
        }),
    };
    const render = task('render');
    queue.enqueue(slow);
    queue.enqueue(render);
    await sched.flush(); // slow starts and blocks
    expect(order).toEqual(['slow']);
    queue.cancel(render.id); // arrives mid-run
    release();
    await sched.flush();
    expect(order).toEqual(['slow']);
    expect(queue.size).toBe(0);
  });

  it('runs one task at a time and survives a throwing task', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const tracked = (label: string, fail = false): QueuedTask => ({
      id: nextId++,
      priority: 'normal',
      barrier: false,
      run: async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Promise.resolve();
        concurrent--;
        order.push(label);
        if (fail) throw new Error('boom');
      },
    });
    queue.enqueue(tracked('a', true));
    queue.enqueue(tracked('b'));
    await sched.flush();
    expect(order).toEqual(['a', 'b']);
    expect(maxConcurrent).toBe(1);
  });
});
