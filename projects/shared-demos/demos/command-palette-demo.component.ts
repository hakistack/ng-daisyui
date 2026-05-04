import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { CommandPaletteComponent, createCommandPalette } from '@hakistack/ng-daisyui';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DocSectionComponent } from '../shared/doc-section.component';

type CommandPaletteTab = 'basic' | 'modes' | 'hotkey';

interface ProjectMeta {
  readonly slug: string;
}

@Component({
  selector: 'app-command-palette-demo',
  imports: [CommandPaletteComponent, DocSectionComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Command Palette"
      description="Search-driven launcher with grouped results, mode prefixes, and a global Mod+K hotkey. Native to the lib — no @tailwindplus/elements runtime."
      icon="search"
      category="Navigation"
      importName="CommandPaletteComponent, createCommandPalette"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="grid gap-6">
            <app-doc-section
              title="Basic palette"
              description="Flat item list with a fuzzy filter. Default Mod+K hotkey opens the palette anywhere on the page."
              [codeExample]="basicCode"
            >
              <div class="flex items-center gap-3 flex-wrap">
                <button class="btn btn-primary" (click)="basic.open()">Open palette</button>
                <span class="text-xs text-base-content/60"
                  >…or press <kbd class="kbd kbd-sm">⌘</kbd>/<kbd class="kbd kbd-sm">Ctrl</kbd> + <kbd class="kbd kbd-sm">K</kbd></span
                >
              </div>
              <hk-command-palette [config]="basic.config()" />
              @if (lastSelection()) {
                <div class="mt-3 alert alert-soft alert-info">
                  <span class="text-sm"> <strong>Selected:</strong> {{ lastSelection() }} </span>
                </div>
              }
            </app-doc-section>

            <app-doc-section
              title="Reactive state"
              description="Read controller.state() — open/closed, query, mode, selection, filtered list — all reactive signals."
            >
              <div class="text-xs space-y-1 font-mono">
                <div><strong>Open:</strong> {{ basic.state().open }}</div>
                <div><strong>Query:</strong> "{{ basic.state().query }}"</div>
                <div><strong>Mode:</strong> {{ basic.state().mode?.prefix ?? 'none' }}</div>
                <div><strong>Selected index:</strong> {{ basic.state().selectedIndex }}</div>
                <div><strong>Filtered count:</strong> {{ basic.state().filtered.length }}</div>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'modes') {
          <div class="grid gap-6">
            <app-doc-section
              title="Mode prefixes"
              description="Type # for projects, > for users, ? for help. Each mode scopes the search to its filterGroups (or renders a help layout)."
              [codeExample]="modesCode"
            >
              <div class="flex items-center gap-3 flex-wrap">
                <button class="btn btn-primary" (click)="modes.open()">Open palette</button>
                <button class="btn btn-sm btn-ghost" (click)="modes.setQuery('#')">Try # mode</button>
                <button class="btn btn-sm btn-ghost" (click)="modes.setQuery('>')">Try &gt; mode</button>
                <button class="btn btn-sm btn-ghost" (click)="modes.setQuery('?')">Try ? mode</button>
              </div>
              <hk-command-palette [config]="modes.config()" />
              @if (lastModeSelection()) {
                <div class="mt-3 alert alert-soft alert-info">
                  <span class="text-sm"><strong>Selected:</strong> {{ lastModeSelection() }}</span>
                </div>
              }
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'hotkey') {
          <div class="grid gap-6">
            <app-doc-section
              title="Custom hotkey"
              description="Override the default Mod+K with any key combination. Pass false to disable the listener entirely."
              [codeExample]="hotkeyCode"
            >
              <div class="flex flex-col gap-3">
                <p class="text-sm text-base-content/70">
                  This palette listens for <kbd class="kbd kbd-sm">/</kbd> instead of <kbd class="kbd kbd-sm">⌘K</kbd>. Try pressing it now
                  (anywhere on the page that isn't a text input).
                </p>
                <div class="flex items-center gap-3">
                  <button class="btn btn-primary" (click)="slash.open()">Open palette</button>
                  <span class="text-xs text-base-content/60">Hotkey: <kbd class="kbd kbd-sm">/</kbd></span>
                </div>
              </div>
              <hk-command-palette [config]="slash.config()" />
            </app-doc-section>

            <app-doc-section
              title="Substring filter"
              description="Drop fuzzy matching for a literal case-insensitive contains check. Useful when consumers expect exact substring behavior."
              [codeExample]="substringCode"
            >
              <button class="btn btn-primary" (click)="substring.open()">Open palette</button>
              <span class="ml-3 text-xs text-base-content/60">Filter: <code>'substring'</code></span>
              <hk-command-palette [config]="substring.config()" />
            </app-doc-section>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class CommandPaletteDemoComponent {
  private readonly route = inject(ActivatedRoute);

  readonly featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  readonly activeTab = computed(() => (this.featureParam() ?? 'basic') as CommandPaletteTab);

  readonly lastSelection = signal<string>('');
  readonly lastModeSelection = signal<string>('');

  // ── Basic palette ───────────────────────────────────────────────────────

  readonly basic = createCommandPalette({
    items: [
      {
        id: 'new-project',
        label: 'New project',
        description: 'Start a fresh project',
        icon: 'folder-plus',
        onSelect: () => this.lastSelection.set('New project'),
      },
      {
        id: 'open-doc',
        label: 'Open documentation',
        description: 'Browse the lib reference',
        onSelect: () => this.lastSelection.set('Documentation'),
      },
      { id: 'invite', label: 'Invite team member', description: 'Send an email invite', onSelect: () => this.lastSelection.set('Invite') },
      { id: 'settings', label: 'Settings', description: 'Workspace preferences', onSelect: () => this.lastSelection.set('Settings') },
      { id: 'profile', label: 'Profile', description: 'Edit your account details', onSelect: () => this.lastSelection.set('Profile') },
      { id: 'logout', label: 'Sign out', description: 'End your session', onSelect: () => this.lastSelection.set('Sign out') },
    ],
  });

  // ── Modes palette ───────────────────────────────────────────────────────

  readonly modes = createCommandPalette<ProjectMeta>({
    items: [
      // Projects
      {
        id: 'p-website',
        label: 'Website Redesign',
        description: 'Workflow Inc.',
        group: 'projects',
        keywords: ['site', 'frontend'],
        onSelect: () => this.lastModeSelection.set('project: Website Redesign'),
      },
      {
        id: 'p-mobile',
        label: 'Mobile App',
        description: 'Conglomerate Inc.',
        group: 'projects',
        onSelect: () => this.lastModeSelection.set('project: Mobile App'),
      },
      {
        id: 'p-logo',
        label: 'Logo Design',
        description: 'Workflow Inc.',
        group: 'projects',
        keywords: ['branding'],
        onSelect: () => this.lastModeSelection.set('project: Logo Design'),
      },
      {
        id: 'p-tv',
        label: 'TV Ad Campaign',
        description: 'Conglomerate Inc.',
        group: 'projects',
        onSelect: () => this.lastModeSelection.set('project: TV Ad Campaign'),
      },
      // Users
      {
        id: 'u-leslie',
        label: 'Leslie Alexander',
        description: 'leslie@example.com',
        group: 'users',
        avatar: 'https://i.pravatar.cc/64?img=49',
        onSelect: () => this.lastModeSelection.set('user: Leslie Alexander'),
      },
      {
        id: 'u-michael',
        label: 'Michael Foster',
        description: 'michael@example.com',
        group: 'users',
        avatar: 'https://i.pravatar.cc/64?img=11',
        onSelect: () => this.lastModeSelection.set('user: Michael Foster'),
      },
      {
        id: 'u-courtney',
        label: 'Courtney Henry',
        description: 'courtney@example.com',
        group: 'users',
        avatar: 'https://i.pravatar.cc/64?img=23',
        onSelect: () => this.lastModeSelection.set('user: Courtney Henry'),
      },
      {
        id: 'u-tom',
        label: 'Tom Cook',
        description: 'tom@example.com',
        group: 'users',
        avatar: 'https://i.pravatar.cc/64?img=15',
        onSelect: () => this.lastModeSelection.set('user: Tom Cook'),
      },
    ],
    groups: [
      { id: 'projects', label: 'Projects' },
      { id: 'users', label: 'Users' },
    ],
    modes: [
      { prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Projects' },
      { prefix: '>', filterGroups: ['users'], indicatorLabel: 'Users' },
      {
        prefix: '?',
        layout: 'help',
        helpText: 'Type # to search projects, > to search users. Without a prefix, all groups are searched at once.',
      },
    ],
    hotkey: false, // disable in this tab — the basic-tab palette already owns Mod+K
  });

  // ── Custom hotkey ───────────────────────────────────────────────────────

  readonly slash = createCommandPalette({
    items: [
      { id: 'find', label: 'Find in project', onSelect: () => console.log('find') },
      { id: 'goto-line', label: 'Go to line', onSelect: () => console.log('goto') },
      { id: 'replace', label: 'Find and replace', onSelect: () => console.log('replace') },
    ],
    hotkey: '/',
  });

  // ── Substring filter ────────────────────────────────────────────────────

  readonly substring = createCommandPalette({
    items: [
      { id: 'apple', label: 'Apple', description: 'Fruit' },
      { id: 'apricot', label: 'Apricot', description: 'Fruit' },
      { id: 'banana', label: 'Banana', description: 'Fruit' },
      { id: 'blueberry', label: 'Blueberry', description: 'Berry' },
      { id: 'cherry', label: 'Cherry', description: 'Fruit' },
    ],
    filter: 'substring',
    hotkey: false,
  });

  // ── Code samples ────────────────────────────────────────────────────────

  readonly basicCode = `import { CommandPaletteComponent, createCommandPalette } from '@hakistack/ng-daisyui';

@Component({
  imports: [CommandPaletteComponent],
  template: \`
    <button (click)="palette.open()">Open</button>
    <hk-command-palette [config]="palette.config()" />
  \`,
})
export class MyComponent {
  palette = createCommandPalette({
    items: [
      { id: '1', label: 'New project', onSelect: () => router.navigate(['/projects/new']) },
      { id: '2', label: 'Settings', onSelect: () => router.navigate(['/settings']) },
    ],
  });
}`;

  readonly modesCode = `palette = createCommandPalette({
  items: [
    { id: 'p1', label: 'Website Redesign', group: 'projects', onSelect: ... },
    { id: 'u1', label: 'Leslie Alexander', avatar: '/leslie.jpg', group: 'users', onSelect: ... },
  ],
  groups: [
    { id: 'projects', label: 'Projects' },
    { id: 'users', label: 'Users' },
  ],
  modes: [
    { prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Projects' },
    { prefix: '>', filterGroups: ['users'], indicatorLabel: 'Users' },
    { prefix: '?', layout: 'help', helpText: 'Use # for projects, > for users.' },
  ],
});`;

  readonly hotkeyCode = `// Custom hotkey:
palette = createCommandPalette({
  items: [...],
  hotkey: '/',  // open with the slash key
});

// Disable global hotkey entirely:
palette = createCommandPalette({
  items: [...],
  hotkey: false,
});

// Default is 'Mod+K' — Cmd on macOS, Ctrl elsewhere.`;

  readonly substringCode = `palette = createCommandPalette({
  items: [...],
  filter: 'substring',  // case-insensitive includes() over label / description / keywords
});

// Other options: 'fuzzy' (default — Fuse.js) or a custom function:
// filter: (query, items, mode) => items.filter(...)`;
}
