# Structure & utilities: Stepper, Tabs, Tree, Virtual Scroller, Motion, Theme, Pipes, Form-state

## Stepper (`hk-stepper`, extends CdkStepper)

Inputs: `linear` (CdkStepper), `showStepIndicator` (def true), `showCard` (def true), `animateContent` (def true), `previousButtonText`/`nextButtonText`/`completeButtonText`, `optionalLabel` (def `'(Optional)'`).
Outputs: `(completed)`, `(stepChange)` → `{ previousIndex, currentIndex }`.
Methods: `goToStep(i)`, `isStepCompleted(i)`, `isStepActive(i)`, `getStepState(i)`.
```html
<hk-stepper [linear]="true" (stepChange)="onStepChange($event)">
  <cdk-step label="Personal"> … <button cdkStepperNext>Next</button> </cdk-step>
  <cdk-step label="Address" optional> … <button cdkStepperPrevious>Back</button> </cdk-step>
</hk-stepper>
```
For data-driven wizards prefer `createForm({ steps: [...] })` (see `references/forms.md`).

## Tabs (`hk-tab-group` + `hk-tab-panel`)

`hk-tab-group` inputs: `activeIndex` (def 0), `selectionMode` (`'follow'|'explicit'`, def explicit), `orientation` (`'horizontal'|'vertical'`), `variant` (`'lift'|'box'|'border'`, horizontal only), `wrap` (def true), `selectedTab` (`model<string|undefined>` — two-way).
`hk-tab-panel` inputs: `value` (req), `label`, `icon` (Lucide), `disabled`. Panel content goes inside an `<ng-template>`.
```html
<hk-tab-group [(selectedTab)]="activeTab" variant="lift">
  <hk-tab-panel value="overview" label="Overview" icon="Eye"><ng-template>…</ng-template></hk-tab-panel>
  <hk-tab-panel value="details" label="Details"><ng-template>…</ng-template></hk-tab-panel>
</hk-tab-group>
```

## Tree (`hk-tree`)

Inputs: `tree` (`TreeSetup<T>` from `createTree()`, takes precedence), or `nodes` + `config`; `selection` (two-way).
`TreeConfig`: `selectionMode('single'|'multiple'|'checkbox'|null)`, `dragDrop`, `dragDropSameLevel`, `filterable`, `filterMode('lenient'|'strict')`, `filterPlaceholder`, `showLines`, `indentSize` (def 24), `virtualScroll`, `virtualScrollItemHeight` (def 36), `propagateSelectionDown`/`Up` (def true), `selectionAllowParents` (def true), `expandAll`, `loading`, `emptyMessage`, `keyboardNavigation` (def true), `ariaLabel`.
Outputs: `(selectionChange)`, `(nodeSelect)`, `(nodeUnselect)`, `(nodeExpand)`, `(nodeCollapse)`, `(lazyLoad)`, `(nodeDragStart/nodeDragEnd/nodeDrop)`, `(filterChange)`.
Methods: `expandNode/collapseNode/toggleNode`, `expandAll/collapseAll`, `selectNode/unselectNode/clearSelection`, `isExpanded/isSelected/isPartialSelected`, `hasChildren`, `completeLoading(node)`.

Helpers: `createTree<T>(input)`, node factories `node.folder(label, children, opts?)`, `node.file(label, opts?)`, `node.lazy(label, opts?)`, `node.create(label, opts?)`; also `walkTree, findNode, findNodePath, mapTree, filterTree, flattenTree, countNodes, ensureKeys, buildTree`.
`TreeNode<T>`: `{ key?, label, children?, expanded?, selectable?, draggable?, droppable?, leaf?, icon?, expandedIcon?, data? }`.
```typescript
import { createTree, node } from '@hakistack/ng-daisyui';
fileSystem = createTree({
  nodes: [ node.folder('src', [ node.file('main.ts') ]), node.lazy('remote') ],
  selectionMode: 'checkbox', dragDrop: true, filterable: true, showLines: true,
});
// <hk-tree [tree]="fileSystem" [selection]="selected()" (selectionChange)="selected.set($event ?? [])" (lazyLoad)="load($event)" />
```
A WASM tree engine (`TreeEngineService`, `Engine*` types) exists for large trees — see `public-api.ts`.

## Virtual Scroller (`hk-virtual-scroller`)

Inputs: `items` (`(T|null)[]`; `null` slots trigger lazy load), `itemSize` (px, **required**), `orientation('vertical'|'horizontal'|'both')`, `numColumns` (grid), `viewportHeight` (def `'400px'`), `viewportWidth`, `scrollDelay`, `minBufferPx`/`maxBufferPx`, `trackByFn`, `lazy`, `loading`, `containerClass`, `itemClass`.
Outputs: `(scrolled)` → `{ first, last }`, `(lazyLoad)` → `{ first, rows }`, `(scrollIndexChange)`.
Named templates: `#item` (req; ctx `$implicit,index,count,first,last,even,odd`), `#loader` (ctx `index`), `#header`, `#footer`. Method: `scrollToIndex(i, behavior?)`.
```html
<hk-virtual-scroller [items]="rows()" [itemSize]="60" viewportHeight="500px" [numColumns]="3">
  <ng-template #item let-row let-i="index">…</ng-template>
  <ng-template #loader>…</ng-template>
</hk-virtual-scroller>
```

## Motion directives

- `[hkAnimate]` — preset name (`fadeIn, fadeInUp/Down/Left/Right, fadeOut, zoomIn/Out, slideInUp/Down, bounceIn, rotateIn`) or custom keyframes. `[hkAnimateOptions]`: `trigger('immediate'|'scroll'|'click')`, `duration`(s, def .6), `delay`, `ease`, `repeat`, `direction`, `once`, `margin`, `amount`, `stagger`, `staggerSelector`.
- `[hkHover]` — keyframes to animate to on hover; `animationOptions` (def `{duration:.3,ease:'easeOut'}`), `restoreOnLeave` (def true); outputs `(hoverStart)/(hoverEnd)`.
- `[hkPress]` — press keyframes; `restoreOnRelease` (def true); output `(pressEnd)` → `{ event, success }`.
- `[hkScroll]` — keyframes (animate) or `true` (emit progress); `scrollAxis`, `scrollOffset`, `scrollContainer`, `scrollTarget`; outputs `(scrollProgress)` 0–1, `(scrollInfo)`.
- `[hkResize]` — `'viewport'` or host; output `(resizeChange)` → `{ width, height }`.
- `animateSequence(segments, options?)` — timeline; segment `{ target, keyframes, options:{ at:'<0.2'|'+0.1'|'0', duration, ease } }`.
```html
<div [hkAnimate]="'fadeInUp'"></div>
<section [hkAnimate]="{ opacity: [0,1], y: [20,0] }" [hkAnimateOptions]="{ trigger: 'scroll', once: true, amount: 0.3 }"></section>
<button [hkHover]="{ scale: 1.05 }" [hkPress]="{ scale: 0.95 }">Tap</button>
<div [hkScroll]="{ scaleX: [0,1] }" class="fixed top-0 left-0 h-1 w-full origin-left bg-primary"></div>
```

## Theme — `provideHkTheme(id)`

```typescript
providers: [ provideHkTheme('daisyui-v5') ]   // 'daisyui-v5' | 'daisyui-v4'
```
Injection token `HK_THEME` exposes `HkThemeConfig` (`{ id, classes: { tabsLift, tabsBox, tabsBorder, menuActive, cardBorder } }`).

## Pipe registry — `providePipes(custom?)` / `PipeRegistryService`

Built-ins: `date, uppercase, lowercase, titlecase, currency, number, percent, json, keyvalue`. Powers table `formatters`.
```typescript
providers: [ providePipes({ beautifyRole: BeautifyRolePipe }) ];
const reg = inject(PipeRegistryService);
reg.transform('date', new Date(), { format: 'short' });
reg.apply(value, fmt.uppercase());            // fmt.* builds [name, options] tuples
reg.apply(new Date(), ['date', { format: 'long' }]);
```

## Form state — `provideFormState(options)` / `FormStateService`

Backs `createForm` auto-save.
```typescript
provideFormState({ mode: 'localStorage', keyPrefix: 'myapp-' });
// or { mode: 'api', apiUrl: '/api/forms' }
const fs = inject(FormStateService);
fs.save('id', values, { currentStep: 2, completedSteps: ['s1'] }).subscribe();
fs.load('id').subscribe((state) => state && restore(state.values, state.metadata));
fs.clear('id').subscribe();
```
