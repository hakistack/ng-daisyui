# Overlays & feedback: Toast, Notification, Dialog, Alert, Command Palette

Pick the right one:
- **Toast** — transient, auto-dismiss, brief feedback ("Saved!").
- **Notification** — persistent, rich content + actions/avatars/layouts; returns a `NotificationRef` you can `update()`.
- **Alert** — modal, blocks interaction, returns `Promise<AlertResult>` (confirmations, questions).
- **Dialog** — full custom component in a CDK modal.
- **Command Palette** — ⌘K fuzzy launcher.

## ToastService

Setup: `provideToast({ position, maxToasts, defaultLife, preventDuplicates, progressBar, pauseOnHover })`. Auto-initializes if not provided.

Methods (return toast `id: string`): `show(ToastOptions)`, `success(summary, detail?, opts?)`, `error(...)`, `warning(...)`, `info(...)`, `networkStatus('online'|'offline')`. Also `dismiss(id)`, `clear()`, `pauseAutoDismiss(id)`, `resumeAutoDismiss(id)`.

```typescript
private toast = inject(ToastService);
this.toast.success('File saved!', 'Document uploaded.');
this.toast.show({
  severity: 'info', summary: 'New message', detail: '1 unread', life: 8000, progressBar: true,
  actions: [{ label: 'View', onClick: () => open(), style: 'primary' }],   // dismissOnClick default true
});
```
`ToastOptions`: `severity('success'|'error'|'info'|'warning')`, `summary`, `detail?`, `life?` (def 5000), `sticky?`, `soft?`, `progressBar?`, `pauseOnHover?`, `tapToDismiss?`, `onTap?`, `actions?`. Positions: `top|bottom`-`start|center|end`.

## NotificationService

Setup: `provideNotification({ position, maxStack, pauseOnHover })`. **Requires** `<hk-notification-host />` once at app root.

Methods (return `NotificationRef`): `show(NotificationConfig)`, `success/info/warning/error(Omit<NotificationConfig,'severity'>)`, `dismiss(id, reason?)`, `dismissAll()`, `update(id, partial)`.

```typescript
private notify = inject(NotificationService);
const ref = this.notify.show({
  title: 'Build #2389 finished', message: 'CI passed in 4m 12s.', severity: 'success', duration: 5000,
  actions: [
    { label: 'Deploy', variant: 'primary', onClick: (ref) => { deploy(); ref.dismiss(); } },
    { label: 'Logs', variant: 'ghost', onClick: () => 'dismiss' },   // returning 'dismiss' auto-closes
  ],
});
ref.update({ title: 'Deploying…' });   // live update
```
`NotificationConfig`: `title` (req), `message?`, `severity?` (def info), `avatar?`, `iconTemplate?`, `actions?`, `layout?('default'|'side-action'|'stacked-action', auto-inferred from action count)`, `duration?` (undefined = persistent), `closable?` (def true), `pauseOnHover?`, `autoFocus?`, `position?`, `id?`. `NotificationRef`: `id`, `dismiss(reason?)`, `update(partial)`, `onDismiss(cb)`.

## DialogService (CDK)

`open(component, opts?)` → wrapped (card + animation); `openRaw(component, opts?)` → plain CDK dialog. Returns CDK `DialogRef`; subscribe `ref.closed`. Auto-closes on router navigation.

```typescript
private dialog = inject(DialogService);
const ref = this.dialog.open(MyDialogComponent, { data: { userId: 123 }, disableClose: true, width: '600px' });
ref.closed.subscribe((result) => { /* ... */ });
```
In the dialog component: `inject(DIALOG_DATA)`, `inject(DialogRef)` then `dialogRef.close(result)` (from `@angular/cdk/dialog`).
`DialogConfig`: `data`, `disableClose`, `width/height/minWidth/maxWidth/...`, `panelClass`, `hasBackdrop`, `backdropClass`, `autoFocus`, `restoreFocus`.

## AlertService

Setup: `provideAlert({ translate?, langChange$?, labels? })`. Auto-initializes.

Methods (all return `Promise<AlertResult>`, except loading): `show(AlertOptions)`, `success/error/warning/info(title, text?)`, `confirm(ConfirmOptions)`, `question(title, text?)`, `confirmDelete(DeleteConfirmOptions?)`, `countdown(CountdownOptions)`, plus `showLoading(opts?)`, `updateLoading(text)`, `hideLoading()`.

```typescript
private alert = inject(AlertService);
const r = await this.alert.confirm({ title: 'Delete item?', text: 'Cannot be undone.', confirmText: 'Delete', confirmStyle: 'error' });
if (r.isConfirmed) { /* ... */ }

await this.alert.confirmDelete({ itemName: 'Project Alpha' });

const r2 = await this.alert.countdown({ title: 'Session expiring',
  html: 'Logging out in <kbd class="kbd">{seconds}</kbd>s', timer: 10000, showCancelButton: true, confirmButtonText: 'Stay' });
if (r2.dismissReason === 'timer') logout();
```
`AlertResult`: `{ isConfirmed, isDismissed, isCancelled, dismissReason?('cancel'|'backdrop'|'close'|'esc'|'timer') }`. `AlertOptions` supports `html`, `htmlUrl` (fetched), `icon`, `timer`, `timerProgressBar`, `size('sm'..'full')`, `width`, etc.

## Command Palette

`createCommandPalette<TContext>(config)` → controller. Render `<hk-command-palette [config]="palette.config()" />`. Default hotkey `Mod+K`.

```typescript
palette = createCommandPalette<{ workspaceSlug: string }>({
  context: { workspaceSlug: 'ws' },
  items: [
    { id: 'new', label: 'New project', description: 'Start fresh', icon: 'folder-plus', group: 'projects',
      onSelect: (ctx) => this.router.navigate(['/projects/new']) },
    { id: 'u1', label: 'Leslie Alexander', avatar: 'https://…', group: 'users', keywords: ['teammate'],
      onSelect: () => this.router.navigate(['/users/leslie']) },
  ],
  groups: [{ id: 'projects', label: 'Projects' }, { id: 'users', label: 'Users' }],
  modes: [
    { prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Projects' },
    { prefix: '?', layout: 'help', helpText: 'Use # for projects.' },
  ],
  filter: 'fuzzy',     // 'fuzzy' | 'substring' | (query, items, mode) => items[]
  hotkey: 'Mod+K',     // or false to disable
  closeOnSelect: true,
  onSelect: (item, ctx) => {}, onOpen: () => {}, onClose: () => {},
});
// controller: palette.open() | close() | toggle() | setQuery(q) | clear(); palette.state() => { open, query, mode, selectedIndex, filtered }
```
`CommandPaletteItem`: `id` (req), `label` (req), `description?`, `icon?`, `avatar?`, `group?`, `keywords?`, `disabled?`, `onSelect?`. `CommandPaletteMode`: `prefix`, `filterGroups?`, `indicatorLabel?`, `layout?('results'|'help')`, `helpText?` (required for help layout).
