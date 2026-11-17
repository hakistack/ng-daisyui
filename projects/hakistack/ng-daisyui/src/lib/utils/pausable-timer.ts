/**
 * Auto-dismiss timer shared by toasts, notifications and alerts.
 *
 * Pauses are *held* for a reason ('hover', 'focus', …) and the timer resumes only when every reason
 * has been released, so moving the pointer out while a button inside still has focus keeps it paused
 * (WCAG 2.2.1 — users must be able to stop time limits).
 */
export interface PausableTimer {
  /** (Re)start counting `ms` from now; clears any held pauses. */
  start(ms: number): void;
  /** Stop for good (dismissed, destroyed). */
  cancel(): void;
  /** Pause for `reason`. Returns true when this call paused a running timer. */
  hold(reason: string): boolean;
  /**
   * Release `reason`. When no reason is left the timer resumes with the time that was left,
   * but at least `minRemaining` ms. Returns the resume delay, or null if it did not resume.
   */
  release(reason: string, minRemaining?: number): number | null;
  /** Milliseconds left (frozen while paused). */
  remaining(): number;
  /** True while at least one reason holds the timer. */
  isHeld(): boolean;
  /** True while counting down. */
  isRunning(): boolean;
}

export function createPausableTimer(onExpire: () => void, now: () => number = defaultNow): PausableTimer {
  let handle: ReturnType<typeof setTimeout> | null = null;
  let remainingMs = 0;
  let startedAt = 0;
  let armed = false;
  const reasons = new Set<string>();

  const clear = (): void => {
    if (handle !== null) clearTimeout(handle);
    handle = null;
  };
  const run = (ms: number): void => {
    clear();
    remainingMs = ms;
    startedAt = now();
    handle = setTimeout(() => {
      handle = null;
      armed = false;
      remainingMs = 0;
      onExpire();
    }, ms);
  };

  return {
    start(ms) {
      reasons.clear();
      armed = true;
      run(ms);
    },
    cancel() {
      clear();
      armed = false;
      reasons.clear();
    },
    hold(reason) {
      const wasHeld = reasons.size > 0;
      reasons.add(reason);
      if (wasHeld || handle === null) return false;
      clear();
      remainingMs = Math.max(0, remainingMs - (now() - startedAt));
      return true;
    },
    release(reason, minRemaining = 0) {
      if (!reasons.delete(reason) || reasons.size > 0 || !armed) return null;
      const delay = Math.max(remainingMs, minRemaining);
      run(delay);
      return delay;
    },
    remaining() {
      return handle === null ? remainingMs : Math.max(0, remainingMs - (now() - startedAt));
    },
    isHeld() {
      return reasons.size > 0;
    },
    isRunning() {
      return handle !== null;
    },
  };
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
