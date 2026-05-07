# Notification — Implementation Plan

Reference UX target: [Tailwind Plus notifications](https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/notifications) — overlay panels for user-facing events that are richer and more persistent than transient toasts.

Goal: ship `<hk-notification-host>` + `NotificationService` inside `@hakistack/ng-daisyui`, **alongside** the existing `<hk-toast>` (not replacing it). Both serve the overlay-feedback category but solve different problems.

## Why a separate component (not a toast extension)

| Concern | `<hk-toast>` (existing) | `<hk-notification>` (new) |
|---|---|---|
| Lifetime | Auto-dismiss after seconds | Persistent until manually dismissed |
| Content shape | One-line status + optional 1-button action | Title + body + avatar/icon + multiple actions + close |
| Trigger | App-side event ("file saved") | User-relevant event ("Leslie sent you a message") |
| Volume | Many short ones | Few, more meaningful ones |
| Layout | Single visual style | Multiple variants (default / side-action / stacked-action) |
| Width | Compact (≈max-w-xs) | Wider (max-w-sm to max-w-md) |

Extending toast to swallow the richer pattern would bloat its API and degrade the simple-toast use case. Two focused components is cleaner — toast for transient status, notification for user-facing events.

## Realistic scope

Single phase, ~3 days focused work. Most of the surface mirrors existing patterns (`ToastService` for service shape, command-palette for theme-bridged card styling, audit-aligned card-border).

| Phase | Scope | Status |
|---|---|---|
| 1 | Service + host + variants (default / side-action / stacked-action) + auto-stack + dismiss | Not started |
| 2+ | Notification center (read/unread list), persistence to FormStateService, push integration | Deferred |

## Architecture (locked)

### Stack
- **No new runtime deps.** Pure Angular + daisyUI primitives + Tailwind utilities.
- **`NotificationService`** (`providedIn: 'root'`) — same shape as `ToastService`. Holds a stack signal of active notifications.
- **`<hk-notification-host>`** — singleton component rendered once at app root (or via a provided template slot). Subscribes to the service's stack signal and renders each active notification with slide-in/out transitions.
- **`<hk-notification>`** — internal per-item component the host iterates. Not directly exported — consumers always go through the service.

### State model
- Service holds `notifications = signal<readonly Notification[]>([])`.
- `show(config)` returns a `NotificationRef` with `dismiss()`, `update(config)`, an `onDismiss` callback hook, and the resolved `id`.
- Stack capped by `provideNotification({ maxStack: N })`. Default: `5`. Overflow drops oldest.

### Layout variants
Three variants matching the Tailwind Plus reference snippets the consumer shared:

1. **`'default'`** — icon (or avatar) + title + body + optional inline actions row + close button. The most common shape.
2. **`'side-action'`** — content on the left, vertical divider, single action button on the right (full panel height). Good for "Reply"-style flows.
3. **`'stacked-action'`** — content on the left, vertical divider, stacked action buttons on the right. Good for "Reply / Don't allow" pairs.

Variant inferred from config when not set:
- `actions.length === 0` → `default`
- `actions.length === 1` and `layout` not set → `side-action`
- `actions.length >= 2` and `layout` not set → `stacked-action`
- Explicit `layout` always wins.

### Visual styling (daisyUI + theme bridge)
- Panel = `card` + `theme.classes.cardBorder` + `bg-base-100 shadow-lg` — consistent with the audit-aligned containers in 0.1.73+.
- Severity icons (`success` / `warning` / `error` / `info`) use daisyUI's semantic color tokens (`text-success`, `text-warning`, etc.) via inline SVGs (no Lucide dep).
- Action buttons use daisyUI button variants — `btn btn-primary btn-sm` (primary), `btn btn-ghost btn-sm` (secondary), `btn btn-outline btn-sm` (decline-style).
- Avatar uses daisyUI's `avatar` + `mask mask-circle` pattern.
- Close button: `btn btn-ghost btn-sm btn-circle` with `<svg>` X icon.

### Position + stacking
- Default position: `'top-right'` on `sm+` viewports, `'bottom-center'` on mobile (matches the Tailwind Plus reference's `items-end` → `sm:items-start`).
- Configurable via `provideNotification({ position: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center' })`.
- Stack: column with `space-y-3` between panels.
- Newer notifications appear at the top of the stack.

### Animations
- Slide-in on add: matches Tailwind Plus's `starting:translate-y-2 starting:opacity-0 starting:sm:translate-x-2 sm:translate-y-0` semantics — uses CSS `@starting-style` for a spec-compliant entrance with no JS-driven animation library.
- Fade-out on dismiss: small CSS transition.
- Honors `prefers-reduced-motion: reduce` (no transforms, just opacity).

### Accessibility
- Host wrapper uses `aria-live="assertive"` for screen-reader announcement.
- Close button gets `aria-label="Close notification"` (i18n token).
- Action buttons inherit their text labels for accessibility.
- Focus management: when a notification with `autoFocus: true` mounts, its first action button receives focus. Default off (don't steal focus from the user's current task).

### Public-API additions
- `NotificationHostComponent`
- `NotificationService`
- `provideNotification(config)`
- Tokens: `HK_NOTIFICATION_LABELS`, `provideHkNotificationLabels`, `NOTIFICATION_CONFIG`, `DEFAULT_NOTIFICATION_CONFIG`
- Types: `NotificationConfig`, `NotificationLayout`, `NotificationSeverity`, `NotificationAction`, `Notification`, `NotificationRef`, `NotificationGlobalConfig`, `NotificationLabels`, `NotificationPosition`

---

## Phase 1 — Service + host + variants

**Effort**: ~3 days focused. **Bundle add**: zero new deps.

### Features

- **Service API** — `show({...}): NotificationRef`, `dismiss(id)`, `dismissAll()`, plus convenience methods `success` / `info` / `warning` / `error` (severity shortcut).
- **Layout variants** — `'default'` / `'side-action'` / `'stacked-action'` per the Tailwind Plus snippets, auto-inferred from action count.
- **Severity icons** — built-in `success` / `info` / `warning` / `error` rendered inline (no icon library required). Consumers can override per-notification with `iconTemplate` (template ref).
- **Avatar override** — `avatar: string | TemplateRef` on the config. When set, replaces the severity icon.
- **Multiple actions** — `actions: NotificationAction[]` with `label`, `variant: 'primary' | 'ghost' | 'outline'`, `onClick(ref) => void | 'dismiss'`. Returning `'dismiss'` from a click handler is a shorthand to dismiss the notification.
- **Auto-dismiss** — optional `duration: number` (ms). Default: undefined (persistent — opposite of toast's auto-dismiss default). Pass `0` for explicit "no auto-dismiss".
- **Pause-on-hover** — when `duration` is set, hovering the panel pauses the timer; mouseleave resumes. Standard UX. Configurable via `pauseOnHover: boolean`.
- **Close button** — always present unless `closable: false`. Positioned per layout variant.
- **Stack management** — capped by `provideNotification({ maxStack })`. Default 5. Overflow drops oldest with a fade-out.
- **Global position** — configured at provider level. Per-notification override possible via `position` field.
- **Slide-in animation** — CSS `@starting-style` for a spec-compliant entrance. Reduced-motion friendly.
- **NotificationRef** — returned from `show()`. Has `id`, `dismiss()`, `update(partial)`, `onDismiss(callback)`. Useful for consumer patterns like "show progress, update to success when done."
- **i18n** — close button aria-label and severity-specific aria announcements via `HK_NOTIFICATION_LABELS` injection token.

### Public API surface

```ts
import { NotificationService } from '@hakistack/ng-daisyui';

@Injectable()
export class MyService {
  private notifications = inject(NotificationService);

  saved() {
    this.notifications.success({
      title: 'Successfully saved!',
      message: 'Anyone with a link can now view this file.',
      duration: 5000,
    });
  }

  movedDiscussion() {
    this.notifications.show({
      title: 'Discussion moved',
      message: 'Lorem ipsum dolor sit amet consectetur adipisicing elit.',
      actions: [
        { label: 'Undo', variant: 'primary', onClick: () => this.undo() },
        { label: 'Dismiss', variant: 'ghost', onClick: () => 'dismiss' },
      ],
    });
  }

  message(from: User) {
    const ref = this.notifications.show({
      avatar: from.avatarUrl,
      title: from.name,
      message: 'Sure! 8:30pm works great!',
      layout: 'side-action',
      actions: [{ label: 'Reply', variant: 'primary', onClick: () => this.openChat(from.id) }],
    });

    ref.onDismiss((reason) => console.log('dismissed:', reason));
  }

  invitation(from: User) {
    this.notifications.show({
      avatar: from.avatarUrl,
      title: from.name,
      message: 'Sent you an invite to connect.',
      actions: [
        { label: 'Accept', variant: 'primary', onClick: () => this.accept(from.id) },
        { label: 'Decline', variant: 'outline', onClick: () => this.decline(from.id) },
      ],
    });
  }
}
```

In `app.config.ts`:

```ts
providers: [
  provideNotification({
    position: 'top-right',
    maxStack: 5,
    pauseOnHover: true,
  }),
],
```

In the root template (or any layout that lives across route changes):

```html
<hk-notification-host />
```

### File structure

```
src/lib/components/notification/
├── notification-host.component.ts        # singleton, iterates the service stack
├── notification-host.component.html
├── notification-host.component.css       # @starting-style entrance, reduced-motion
├── notification.component.ts             # internal per-item renderer
├── notification.component.html
├── notification.types.ts                 # NotificationConfig, NotificationAction, ...
├── notification.service.ts               # NotificationService, NotificationRef
├── notification.config.ts                # NOTIFICATION_CONFIG token, DEFAULT_*, provideNotification
└── notification.labels.ts                # HK_NOTIFICATION_LABELS, provideHkNotificationLabels
```

### Phase 1 deliverables

- All public exports added to `public-api.ts`.
- JSDoc on every public symbol (Batch-1 conventions).
- 5–8 unit tests: show / dismiss / dismissAll / auto-dismiss / pause-on-hover / max-stack / layout-inference / severity-shortcuts.
- Demo page in `projects/shared-demos/demos/notification-demo.component.ts` with three tabs: `basic` (severity shortcuts), `actions` (inline / side / stacked variants), `interactions` (avatar message, accept/decline, programmatic update via NotificationRef).
- Nav entry under "Feedback" in `app.ts` (where toast lives).

---

## Decisions locked in

1. **Coexists with toast** — does not replace it. Two components.
2. **Service-driven** — same shape as `ToastService`. Not a builder.
3. **Auto-dismiss off by default** — opposite of toast. Notifications are user-facing events that the user should dismiss when they're done with them.
4. **Layout auto-inferred from action count** unless explicitly set — keeps the simple case simple, lets the consumer override when needed.
5. **No icon library dep** — built-in severity icons inline, consumer can pass `TemplateRef` for custom.
6. **Theme-bridged card** — uses `card + cardBorder + bg-base-100 + shadow-lg`, consistent with audit-aligned containers in 0.1.73+.

## Decisions deferred to Phase 2+

- **Notification center** — list of all notifications (read + unread), opened from a bell icon in the app header. Includes persistence + read state. Big surface, separate from the overlay component.
- **Push notification integration** — bridging to the browser's Notification API for off-tab alerts.
- **Persistent notifications across sessions** — auto-restore via `FormStateService` or a dedicated `NotificationStateService`.
- **Grouping / threading** — collapse multiple notifications from the same source into a single panel.

## Out of scope

- **Replacing `<hk-toast>`** — covered above.
- **Modal-blocking notifications** — that's `<hk-dialog-wrapper>` territory.
- **In-content alert banners** — that's `<hk-alert>` territory (already exists in the lib).
- **Sound/vibration** — out of scope; can be added by consumers via `onShow` callback if needed.

## References

- Tailwind Plus notification patterns: https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/notifications
- daisyUI `card`: https://daisyui.com/components/card/
- daisyUI `avatar`: https://daisyui.com/components/avatar/
- CSS `@starting-style`: https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style
- Existing `ToastService` in this lib: `src/lib/components/toast/toast.service.ts` (reference for service shape)

## Open questions worth resolving early

1. **Position handling on mobile** — Tailwind Plus's reference defaults to bottom on small screens, top-right on desktop. Should we mirror that behavior, or always honor the `position` setting? My pick: mirror — the consumer's `position` setting is "preferred desktop position," with mobile auto-switching to bottom-center for thumb reach. Override with explicit `mobilePosition` if needed (deferred).
2. **Stack overflow behavior** — drop oldest, drop newest, or queue and show next when one dismisses? Tailwind Plus doesn't show this. My pick: drop oldest with fade — the user is most likely interested in the latest events.
3. **Action button focus order** — primary first or last? Tailwind Plus puts primary first ("Accept" before "Decline"). My pick: declared order — let the consumer choose. Don't reorder behind their backs.
