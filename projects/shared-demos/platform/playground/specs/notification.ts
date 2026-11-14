import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Notification (service) ────────────────────────────────────────────────
export interface NotificationPgState {
  [k: string]: string | number | boolean;
  title: string;
  message: string;
  severity: string;
  layout: string;
  actions: number;
  duration: number;
  closable: boolean;
  autoFocus: boolean;
  position: string;
}
const NOTIFICATION_DEFAULTS: NotificationPgState = {
  title: 'New comment',
  message: 'Leslie replied to your post.',
  // Library defaults: severity 'info', persistent (no duration), closable,
  // no auto-focus, position from provideNotification() ('top-right').
  severity: 'info',
  layout: 'default',
  actions: 0,
  duration: 0,
  closable: true,
  autoFocus: false,
  position: 'top-right',
};

/** Sample action buttons, in the order they are added by the `actions` count. */
export const NOTIFICATION_SAMPLE_ACTIONS = [
  { label: 'Reply', variant: 'primary' },
  { label: 'Mark as read', variant: 'ghost' },
] as const;

const str = (v: string): string => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function notificationCode(s: NotificationPgState): string {
  const d = NOTIFICATION_DEFAULTS;
  const lines: string[] = [`      title: ${str(s.title)},`];
  if (s.message) lines.push(`      message: ${str(s.message)},`);
  if (s.severity !== d.severity) lines.push(`      severity: '${s.severity}',`);
  // Without `layout` the service infers it from the action count, so write it whenever actions are present.
  if (s.layout !== d.layout || s.actions > 0) lines.push(`      layout: '${s.layout}',`);
  if (s.actions > 0) {
    const actions = NOTIFICATION_SAMPLE_ACTIONS.slice(0, s.actions).map(
      (a) =>
        `        { label: '${a.label}'${a.variant === 'ghost' ? '' : `, variant: '${a.variant}'`}, onClick: () => this.onAction('${a.label}') },`,
    );
    lines.push(`      actions: [\n${actions.join('\n')}\n      ],`);
  }
  if (s.duration !== d.duration) lines.push(`      duration: ${s.duration},`);
  if (s.closable !== d.closable) lines.push(`      closable: ${s.closable},`);
  if (s.autoFocus !== d.autoFocus) lines.push(`      autoFocus: ${s.autoFocus},`);
  if (s.position !== d.position) lines.push(`      position: '${s.position}',`);
  const onAction =
    s.actions > 0
      ? `

  /** Returning 'dismiss' closes the notification after the click. */
  private onAction(label: string): 'dismiss' {
    console.log('action', label);
    return 'dismiss';
  }`
      : '';

  return `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationHostComponent, NotificationService } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [NotificationHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <button type="button" class="btn btn-primary" (click)="notify()">Notify</button>
    <!-- Required: mount the host once, in a layout that never goes away (usually the app root). -->
    <hk-notification-host />
  \`,
})
export class ExampleComponent {
  private readonly notifications = inject(NotificationService);

  notify(): void {
    const ref = this.notifications.show({
${lines.join('\n')}
    });
    ref.onDismiss((reason) => console.log('dismissed', reason));
  }${onAction}
}
`;
}

export const NOTIFICATION_PLAYGROUND = definePlayground<NotificationPgState>({
  symbol: 'NotificationService',
  optionsSymbol: 'NotificationConfig',
  defaults: NOTIFICATION_DEFAULTS,
  controls: [
    { key: 'title', kind: 'text', label: l('Title', 'Título') },
    { key: 'message', kind: 'text', label: l('Message', 'Mensaje') },
    { key: 'severity', kind: 'select', label: l('Kind', 'Tipo'), options: ['info', 'success', 'warning', 'error'] },
    {
      key: 'actions',
      kind: 'number',
      label: l('Action buttons', 'Botones de acción'),
      hint: l('Number of sample actions (Reply, Mark as read).', 'Cantidad de acciones de ejemplo (Responder, Marcar como leída).'),
      min: 0,
      max: 2,
      step: 1,
    },
    {
      key: 'layout',
      kind: 'select',
      label: l('Layout', 'Diseño'),
      hint: l('If you leave it out, it is picked from the number of actions.', 'Si lo omites, se elige según la cantidad de acciones.'),
      options: ['default', 'side-action', 'stacked-action'],
    },
    {
      key: 'duration',
      kind: 'number',
      label: l('Close after (ms, 0 = stays)', 'Cerrar tras (ms, 0 = permanece)'),
      min: 0,
      max: 20000,
      step: 500,
    },
    { key: 'closable', kind: 'boolean', label: l('Close button', 'Botón de cerrar') },
    { key: 'autoFocus', kind: 'boolean', label: l('Focus first action', 'Enfocar la primera acción') },
    {
      key: 'position',
      kind: 'select',
      label: l('Position', 'Posición'),
      options: ['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center'],
    },
  ],
  code: notificationCode,
});
