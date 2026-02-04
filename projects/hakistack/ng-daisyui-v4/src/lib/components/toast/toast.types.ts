export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';
export type ToastPosition = 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

/**
 * Action button configuration for toast notifications
 */
export interface ToastAction {
  /** Button label text */
  label: string;

  /** Callback when button is clicked */
  onClick: () => void;

  /** Optional: dismiss toast after action (default: true) */
  dismissOnClick?: boolean;

  /** Optional: button style variant */
  style?: 'default' | 'primary' | 'ghost';
}

export interface ToastOptions {
  /** Toast severity/type */
  severity: ToastSeverity;

  /** Main toast message */
  summary: string;

  /** Optional detailed message */
  detail?: string;

  /** Duration in ms before auto-dismiss (default: 5000) */
  life?: number;

  /** If true, toast won't auto-dismiss */
  sticky?: boolean;

  /** Use soft/muted styling variant */
  soft?: boolean;

  /** Show countdown progress bar */
  progressBar?: boolean;

  /** Pause auto-dismiss on hover */
  pauseOnHover?: boolean;

  /** Dismiss toast when clicked anywhere */
  tapToDismiss?: boolean;

  /** Callback when toast is clicked */
  onTap?: () => void;

  /** Optional action buttons (max 2 recommended) */
  actions?: ToastAction[];
}

export interface Toast extends Required<Omit<ToastOptions, 'detail' | 'onTap' | 'actions'>> {
  /** Unique toast identifier */
  id: string;

  /** Optional detailed message */
  detail?: string;

  /** Callback when toast is clicked */
  onTap?: () => void;

  /** Optional action buttons */
  actions?: ToastAction[];

  /** Internal: toast is being dismissed (for exit animation) */
  dismissing: boolean;

  /** Internal: progress bar target width percentage (0 when animating, current value when paused) */
  progressTarget: number;

  /** Internal: auto-dismiss is paused */
  isPaused: boolean;

  /** Internal: creation timestamp */
  createdAt: number;

  /** Internal: remaining time before dismiss */
  remainingTime: number;

  /** Internal: current transition duration in ms */
  transitionDuration: number;
}
