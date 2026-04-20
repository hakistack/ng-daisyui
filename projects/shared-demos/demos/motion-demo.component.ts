import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { MotionAnimateDirective, MotionHoverDirective } from '@hakistack/ng-daisyui';
import { LucideAngularModule, RefreshCw, Rocket, Sparkles, ArrowRight, Inbox, Star, Send, Archive, Trash2 } from 'lucide-angular';
import { DemoPageComponent } from '../shared/demo-page.component';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type MotionTab = 'animate' | 'hover' | 'presets';

@Component({
  selector: 'app-motion-demo',
  imports: [
    MotionAnimateDirective,
    MotionHoverDirective,
    LucideAngularModule,
    DemoPageComponent,
    DocSectionComponent,
    ApiTableComponent,
    CodeBlockComponent,
  ],
  template: `
    <app-demo-page
      title="Motion Directives"
      description="Declarative animations powered by Motion.dev with scroll, hover, and click triggers"
      icon="Sparkles"
      category="Utilities"
      importName="MotionAnimateDirective"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'animate') {
          <div class="space-y-6">
            <app-doc-section title="Animate on Load" description="Elements animate when they appear" [codeExample]="loadCode">
              <button class="btn btn-primary mb-4" (click)="toggleLoadDemo()">{{ showLoadDemo() ? 'Hide' : 'Show' }} Elements</button>

              @if (showLoadDemo()) {
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    [hkAnimate]="'fadeIn'"
                    [hkAnimateOptions]="{ trigger: 'immediate', duration: 0.5 }"
                    class="p-6 bg-primary text-primary-content rounded-lg text-center"
                  >
                    Fade In
                  </div>
                  <div
                    [hkAnimate]="'fadeInUp'"
                    [hkAnimateOptions]="{ trigger: 'immediate', duration: 0.5, delay: 0.1 }"
                    class="p-6 bg-secondary text-secondary-content rounded-lg text-center"
                  >
                    Fade In Up
                  </div>
                  <div
                    [hkAnimate]="'fadeInDown'"
                    [hkAnimateOptions]="{ trigger: 'immediate', duration: 0.5, delay: 0.2 }"
                    class="p-6 bg-accent text-accent-content rounded-lg text-center"
                  >
                    Fade In Down
                  </div>
                  <div
                    [hkAnimate]="'zoomIn'"
                    [hkAnimateOptions]="{ trigger: 'immediate', duration: 0.5, delay: 0.3 }"
                    class="p-6 bg-info text-info-content rounded-lg text-center"
                  >
                    Zoom In
                  </div>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="Click Animations" description="Triggered by user click" [codeExample]="clickCode">
              <div class="flex flex-wrap gap-4">
                <button [hkAnimate]="'bounceIn'" [hkAnimateOptions]="{ trigger: 'click', duration: 0.5 }" class="btn btn-primary">
                  Bounce
                </button>
                <button
                  [hkAnimate]="{ scale: [1, 1.2, 1] }"
                  [hkAnimateOptions]="{ trigger: 'click', duration: 0.3 }"
                  class="btn btn-secondary"
                >
                  Pulse
                </button>
                <button [hkAnimate]="{ rotate: [0, 360] }" [hkAnimateOptions]="{ trigger: 'click', duration: 0.5 }" class="btn btn-accent">
                  <lucide-icon [img]="refreshCwIcon" [size]="18" />
                  Spin
                </button>
                <button
                  [hkAnimate]="{ x: [0, -10, 10, -10, 10, 0] }"
                  [hkAnimateOptions]="{ trigger: 'click', duration: 0.4 }"
                  class="btn btn-warning"
                >
                  Shake
                </button>
              </div>
            </app-doc-section>

            <app-doc-section title="Staggered Animation" description="Elements animate in sequence with delays" [codeExample]="staggerCode">
              <button class="btn btn-primary mb-4" (click)="toggleStaggerDemo()">{{ showStaggerDemo() ? 'Reset' : 'Animate' }} List</button>

              @if (showStaggerDemo()) {
                <div class="space-y-2">
                  @for (item of staggerItems; track item; let i = $index) {
                    <div
                      [hkAnimate]="'fadeInLeft'"
                      [hkAnimateOptions]="{ trigger: 'immediate', duration: 0.4, delay: i * 0.1 }"
                      class="p-4 bg-base-200 rounded-lg flex items-center gap-3"
                    >
                      <lucide-icon [img]="iconMap[item.icon]" [size]="20" class="text-primary" />
                      <span>{{ item.label }}</span>
                    </div>
                  }
                </div>
              }
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'hover') {
          <div class="space-y-6">
            <app-doc-section title="Basic Hover Effects" description="Interactive hover effects" [codeExample]="hoverCode">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div
                  [hkHover]="{ scale: [1, 1.1] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-primary text-primary-content rounded-lg text-center cursor-pointer"
                >
                  Scale Up
                </div>
                <div
                  [hkHover]="{ scale: [1, 0.95] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-secondary text-secondary-content rounded-lg text-center cursor-pointer"
                >
                  Scale Down
                </div>
                <div
                  [hkHover]="{ rotate: [0, 5] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-accent text-accent-content rounded-lg text-center cursor-pointer"
                >
                  Rotate
                </div>
                <div
                  [hkHover]="{ y: [0, -8] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-info text-info-content rounded-lg text-center cursor-pointer"
                >
                  Lift Up
                </div>
              </div>
            </app-doc-section>

            <app-doc-section
              title="Combined Hover Effects"
              description="Multiple properties animated together"
              [codeExample]="combinedHoverCode"
            >
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  [hkHover]="{
                    scale: [1, 1.05],
                    y: [0, -4],
                    boxShadow: ['0 4px 6px -1px rgba(0,0,0,0.1)', '0 20px 25px -5px rgba(0,0,0,0.15)'],
                  }"
                  [animationOptions]="{ duration: 0.3, ease: 'easeOut' }"
                  class="p-6 bg-base-200 rounded-xl shadow-md cursor-pointer"
                >
                  <lucide-icon [img]="rocketIcon" [size]="32" class="text-primary mb-3" />
                  <h3 class="font-semibold">Card Lift</h3>
                  <p class="text-sm text-base-content/70 mt-1">Scales up with elevated shadow</p>
                </div>

                <div
                  [hkHover]="{ scale: [1, 1.02], rotate: [0, 1] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl cursor-pointer"
                >
                  <lucide-icon [img]="sparklesIcon" [size]="32" class="text-secondary mb-3" />
                  <h3 class="font-semibold">Subtle Tilt</h3>
                  <p class="text-sm text-base-content/70 mt-1">Gentle scale with rotation</p>
                </div>

                <div
                  [hkHover]="{ x: [0, 4], scale: [1, 1.02] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-base-200 rounded-xl cursor-pointer border-l-4 border-accent"
                >
                  <lucide-icon [img]="arrowRightIcon" [size]="32" class="text-accent mb-3" />
                  <h3 class="font-semibold">Slide Right</h3>
                  <p class="text-sm text-base-content/70 mt-1">Suggests forward navigation</p>
                </div>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'presets') {
          <div class="space-y-6">
            <app-doc-section
              title="Animation Presets"
              description="Built-in named animations (click to trigger)"
              [codeExample]="presetCode"
            >
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                @for (preset of presets; track preset) {
                  <button [hkAnimate]="preset" [hkAnimateOptions]="{ trigger: 'click', duration: 0.6 }" class="btn btn-outline btn-sm">
                    {{ preset }}
                  </button>
                }
              </div>
            </app-doc-section>

            <app-doc-section title="Custom Keyframes" description="Define your own animation keyframes" [codeExample]="customCode">
              <div class="flex flex-wrap gap-6">
                <div
                  [hkAnimate]="{ opacity: [0, 1], y: [30, 0], rotate: [-10, 0] }"
                  [hkAnimateOptions]="{ trigger: 'scroll', duration: 0.8, ease: 'easeOut' }"
                  class="p-6 bg-gradient-to-r from-primary to-secondary text-white rounded-xl"
                >
                  Custom: Fade + Slide + Rotate
                </div>

                <div
                  [hkAnimate]="{ scale: [0.8, 1.1, 1], opacity: [0, 1] }"
                  [hkAnimateOptions]="{ trigger: 'scroll', duration: 0.6 }"
                  class="p-6 bg-gradient-to-r from-secondary to-accent text-white rounded-xl"
                >
                  Custom: Bounce Scale In
                </div>
              </div>
            </app-doc-section>
          </div>
        }
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'animate-directive'" (click)="apiTab.set('animate-directive')">
            Animate Directive
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'hover-directive'" (click)="apiTab.set('hover-directive')">
            Hover Directive
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'scroll-directive'" (click)="apiTab.set('scroll-directive')">
            Scroll Directive
          </button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'options-types'" (click)="apiTab.set('options-types')">
            Options & Types
          </button>
        </div>

        <!-- Animate Directive sub-tab -->
        @if (apiTab() === 'animate-directive') {
          <div class="space-y-6">
            <app-api-table title="MotionAnimateDirective Inputs" [entries]="animateDocs" />
            <app-api-table title="Public Methods" [entries]="animateMethodDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Available Presets</h3>
                <p class="text-sm text-base-content/70">
                  Built-in animation presets that can be passed as a string to the <code>[hkAnimate]</code> input. Each preset defines a
                  complete set of keyframes for common animation patterns.
                </p>
                <app-code-block [code]="presetsListCode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Usage</h3>
                <p class="text-sm text-base-content/70">
                  Import <code>MotionAnimateDirective</code> and apply it to any element. You can use a preset name or supply custom
                  keyframe objects for full control over the animation.
                </p>
                <app-code-block [code]="usageCode" />
              </div>
            </div>
          </div>
        }

        <!-- Hover Directive sub-tab -->
        @if (apiTab() === 'hover-directive') {
          <div class="space-y-6">
            <app-api-table title="MotionHoverDirective Inputs" [entries]="hoverDocs" />
            <app-api-table title="Outputs" [entries]="hoverOutputDocs" />
            <app-api-table title="Public Methods" [entries]="hoverMethodDocs" />
            <app-api-table title="HoverOptions" [entries]="hoverOptionsDocs" />
          </div>
        }

        <!-- Scroll Directive sub-tab -->
        @if (apiTab() === 'scroll-directive') {
          <div class="space-y-6">
            <app-api-table title="MotionScrollDirective Inputs" [entries]="scrollDocs" />
            <app-api-table title="Outputs" [entries]="scrollOutputDocs" />
            <app-api-table title="Public Methods" [entries]="scrollMethodDocs" />
            <app-api-table title="ScrollInfo Properties" [entries]="scrollInfoDocs" />
          </div>
        }

        <!-- Options & Types sub-tab -->
        @if (apiTab() === 'options-types') {
          <div class="space-y-6">
            <app-api-table title="MotionDirectiveOptions (shared across all directives)" [entries]="optionDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">AnimationPreset</h3>
                <p class="text-sm text-base-content/70">
                  Union type of all built-in preset animation names. Pass one of these strings to the <code>[hkAnimate]</code> input to use
                  a pre-defined animation.
                </p>
                <app-code-block [code]="typeAnimationPreset" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">HoverKeyframes</h3>
                <p class="text-sm text-base-content/70">
                  A record of CSS property names to keyframe value arrays. Each property maps to a two-element array representing the start
                  and end values for the hover transition.
                </p>
                <app-code-block [code]="typeHoverKeyframes" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Easing</h3>
                <p class="text-sm text-base-content/70">
                  Accepts a named easing string (e.g., <code>'easeOut'</code>, <code>'easeInOut'</code>), a CSS cubic-bezier array
                  <code>[n, n, n, n]</code>, or a custom easing function.
                </p>
                <app-code-block [code]="typeEasing" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class MotionDemoComponent {
  readonly refreshCwIcon = RefreshCw;
  readonly rocketIcon = Rocket;
  readonly sparklesIcon = Sparkles;
  readonly arrowRightIcon = ArrowRight;
  readonly iconMap: Record<string, any> = { Inbox, Star, Send, Archive, Trash2 };
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'animate') as MotionTab);

  apiTab = signal<'animate-directive' | 'hover-directive' | 'scroll-directive' | 'options-types'>('animate-directive');
  showLoadDemo = signal(true);
  showStaggerDemo = signal(false);

  presets = [
    'fadeIn',
    'fadeOut',
    'fadeInUp',
    'fadeInDown',
    'fadeInLeft',
    'fadeInRight',
    'zoomIn',
    'zoomOut',
    'slideInUp',
    'slideInDown',
    'bounceIn',
    'rotateIn',
  ] as const;

  staggerItems = [
    { icon: 'Inbox', label: 'Inbox - 12 new messages' },
    { icon: 'Star', label: 'Starred - 5 items' },
    { icon: 'Send', label: 'Sent - 23 messages' },
    { icon: 'Archive', label: 'Archive - 156 items' },
    { icon: 'Trash2', label: 'Trash - 3 items' },
  ] as const;

  toggleLoadDemo() {
    this.showLoadDemo.update((v) => !v);
  }

  toggleStaggerDemo() {
    this.showStaggerDemo.set(false);
    setTimeout(() => this.showStaggerDemo.set(true), 50);
  }

  // --- Code examples ---
  loadCode = `// TypeScript
loadAnimation: MotionDirectiveOptions = {
  trigger: 'immediate',
  duration: 0.5,
  delay: 0.1,
};

// Template
<div
  [hkAnimate]="'fadeInUp'"
  [hkAnimateOptions]="loadAnimation">
  Content
</div>`;

  clickCode = `// TypeScript
bounceOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.5 };
pulseKeyframes = { scale: [1, 1.2, 1] };
pulseOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.3 };

// Template
<!-- Preset animation -->
<button
  [hkAnimate]="'bounceIn'"
  [hkAnimateOptions]="bounceOptions">
  Bounce
</button>

<!-- Custom keyframes -->
<button
  [hkAnimate]="pulseKeyframes"
  [hkAnimateOptions]="pulseOptions">
  Pulse
</button>`;

  staggerCode = `// TypeScript
items = [
  { icon: 'Inbox', label: 'Inbox - 12 new messages' },
  { icon: 'Star', label: 'Starred - 5 items' },
];

staggerOptions(index: number): MotionDirectiveOptions {
  return { trigger: 'immediate', duration: 0.4, delay: index * 0.1 };
}

// Template
@for (item of items; track item; let i = $index) {
  <div
    [hkAnimate]="'fadeInLeft'"
    [hkAnimateOptions]="staggerOptions(i)">
    {{ item.label }}
  </div>
}`;

  hoverCode = `// TypeScript
scaleHover: HoverKeyframes = { scale: [1, 1.1] };
hoverAnimOptions: HoverAnimationOptions = { duration: 0.2 };

// Template
<div
  [hkHover]="scaleHover"
  [animationOptions]="hoverAnimOptions">
  Hover me
</div>`;

  combinedHoverCode = `// TypeScript
cardLiftHover: HoverKeyframes = {
  scale: [1, 1.05],
  y: [0, -4],
  boxShadow: ['0 4px 6px rgba(0,0,0,0.1)', '0 20px 25px rgba(0,0,0,0.15)'],
};
cardLiftOptions: HoverAnimationOptions = { duration: 0.3, ease: 'easeOut' };

// Template
<div
  [hkHover]="cardLiftHover"
  [animationOptions]="cardLiftOptions">
  Card content
</div>`;

  presetCode = `// TypeScript
presetOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.6 };

// Template
<button
  [hkAnimate]="'bounceIn'"
  [hkAnimateOptions]="presetOptions">
  Click me
</button>`;

  customCode = `// TypeScript
customKeyframes = { opacity: [0, 1], y: [30, 0], rotate: [-10, 0] };
customOptions: MotionDirectiveOptions = {
  trigger: 'scroll',
  duration: 0.8,
  ease: 'easeOut',
};

// Template
<div
  [hkAnimate]="customKeyframes"
  [hkAnimateOptions]="customOptions">
  Custom animation
</div>`;

  presetsListCode = `// Available preset names:
'fadeIn'      'fadeOut'
'fadeInUp'    'fadeInDown'
'fadeInLeft'  'fadeInRight'
'zoomIn'      'zoomOut'
'slideInUp'   'slideInDown'
'bounceIn'    'rotateIn'`;

  usageCode = `import { MotionAnimateDirective, MotionHoverDirective } from '@hakistack/ng-daisyui';

@Component({
  imports: [MotionAnimateDirective, MotionHoverDirective],
  template: \`
    <!-- Animate directive -->
    <div
      [hkAnimate]="'fadeInUp'"
      [hkAnimateOptions]="{
        trigger: 'immediate',  // 'immediate' | 'click' | 'scroll'
        duration: 0.5,
        delay: 0,
        ease: 'easeOut',
      }">
      Animated content
    </div>

    <!-- Hover directive -->
    <div
      [hkHover]="{ scale: [1, 1.1] }"
      [animationOptions]="{ duration: 0.2 }">
      Hover effect
    </div>
  \`,
})`;

  // --- API docs ---
  animateDocs: ApiDocEntry[] = [
    {
      name: '[hkAnimate]',
      type: 'AnimationPreset | Record<string, unknown>',
      default: "'fadeIn'",
      description: "Preset name (e.g. 'fadeIn', 'bounceIn') or custom keyframes object",
    },
    {
      name: '[hkAnimateOptions]',
      type: 'MotionDirectiveOptions',
      default: '{}',
      description: 'Animation and trigger configuration options',
    },
  ];

  animateMethodDocs: ApiDocEntry[] = [
    { name: 'play()', type: 'void', description: 'Programmatically trigger the animation' },
    { name: 'stop()', type: 'void', description: 'Stop the currently running animation' },
    { name: 'reset()', type: 'void', description: 'Reset the hasAnimated flag so the animation can play again' },
  ];

  hoverDocs: ApiDocEntry[] = [
    { name: '[hkHover]', type: 'HoverKeyframes', description: 'Required. Keyframes to animate on hover (e.g. { scale: [1, 1.1] })' },
    { name: '[hoverOptions]', type: 'HoverOptions', default: '-', description: 'Hover listener options (passive, once)' },
    {
      name: '[animationOptions]',
      type: 'HoverAnimationOptions',
      default: "{ duration: 0.3, ease: 'easeOut' }",
      description: 'Animation timing and easing configuration',
    },
    { name: '[restoreOnLeave]', type: 'boolean', default: 'true', description: 'Whether to animate back to initial values on hover end' },
    {
      name: '[customRestoreKeyframes]',
      type: 'HoverKeyframes',
      default: '-',
      description: 'Custom keyframes for the restore animation instead of auto-captured values',
    },
  ];

  hoverOutputDocs: ApiDocEntry[] = [
    { name: '(hoverStart)', type: 'PointerEvent', description: 'Emits the PointerEvent when hover begins' },
    { name: '(hoverEnd)', type: 'PointerEvent', description: 'Emits the PointerEvent when hover ends' },
  ];

  hoverMethodDocs: ApiDocEntry[] = [
    { name: 'triggerHover()', type: 'void', description: 'Programmatically trigger the hover-in animation' },
    { name: 'triggerRestore()', type: 'void', description: 'Programmatically trigger the restore animation' },
    { name: 'stop()', type: 'void', description: 'Stop all running hover/restore animations' },
  ];

  scrollDocs: ApiDocEntry[] = [
    {
      name: '[motionScroll]',
      type: 'ScrollAnimationKeyframes | boolean',
      default: '-',
      description: 'Scroll-linked keyframes object, or true for progress tracking only',
    },
    {
      name: '[scrollOptions]',
      type: 'ScrollOptions',
      default: '{}',
      description: 'Combined scroll configuration (container, target, axis, offset)',
    },
    {
      name: '[scrollContainer]',
      type: 'HTMLElement',
      default: '-',
      description: 'Scroll container element (shorthand for scrollOptions.container)',
    },
    {
      name: '[scrollTarget]',
      type: 'HTMLElement',
      default: 'host element',
      description: 'Target element to track (shorthand for scrollOptions.target)',
    },
    { name: '[scrollAxis]', type: "'x' | 'y'", default: "'y'", description: 'Scroll axis to track' },
    { name: '[scrollOffset]', type: 'ScrollOffset', default: '-', description: "Scroll offset range, e.g. ['start', 'end']" },
    {
      name: '[animationOptions]',
      type: 'ScrollAnimationOptions',
      default: "{ ease: 'linear' }",
      description: 'Animation options for scroll-linked animations',
    },
  ];

  scrollOutputDocs: ApiDocEntry[] = [
    { name: '(scrollProgress)', type: 'number', description: 'Emits scroll progress from 0 to 1 (progress tracking mode)' },
    {
      name: '(scrollInfo)',
      type: 'ScrollInfo',
      description: 'Emits detailed scroll info with x/y current position, scrollLength, and velocity',
    },
  ];

  scrollMethodDocs: ApiDocEntry[] = [
    { name: 'stop()', type: 'void', description: 'Stop the scroll animation and cleanup listeners' },
    { name: 'restart()', type: 'void', description: 'Cleanup and re-initialize the scroll animation' },
  ];

  optionDocs: ApiDocEntry[] = [
    { name: 'trigger', type: "'immediate' | 'click' | 'scroll'", default: "'immediate'", description: 'What triggers the animation' },
    { name: 'duration', type: 'number', default: '0.6', description: 'Animation duration in seconds' },
    { name: 'delay', type: 'number', default: '0', description: 'Delay before animation starts (seconds)' },
    {
      name: 'ease',
      type: 'Easing | Easing[]',
      default: "'easeOut'",
      description: 'Easing function: string name, cubic-bezier [n,n,n,n], or custom function',
    },
    { name: 'repeat', type: 'number', default: '0', description: 'Number of times to repeat the animation' },
    {
      name: 'direction',
      type: "'normal' | 'reverse' | 'alternate' | 'alternate-reverse'",
      default: "'normal'",
      description: 'Animation playback direction',
    },
    { name: 'endDelay', type: 'number', default: '0', description: 'Delay after animation completes (seconds)' },
    { name: 'type', type: "'tween' | 'spring' | 'inertia'", default: "'tween'", description: 'Animation type' },
    { name: 'stiffness', type: 'number', default: '-', description: 'Spring stiffness (spring type only)' },
    { name: 'damping', type: 'number', default: '-', description: 'Spring damping (spring type only)' },
    { name: 'mass', type: 'number', default: '-', description: 'Spring mass (spring type only)' },
    { name: 'bounce', type: 'number', default: '-', description: 'Duration-based spring bounce (spring type only)' },
    { name: 'once', type: 'boolean', default: 'false', description: 'Only animate once when using scroll trigger' },
    { name: 'margin', type: 'string', default: '-', description: 'IntersectionObserver rootMargin for scroll trigger' },
    {
      name: 'amount',
      type: "number | 'some' | 'all'",
      default: '-',
      description: 'How much of the element must be visible to trigger (scroll)',
    },
  ];

  hoverOptionsDocs: ApiDocEntry[] = [
    { name: 'passive', type: 'boolean', default: '-', description: 'Use passive event listener for hover events' },
    { name: 'once', type: 'boolean', default: '-', description: 'Only trigger hover animation once' },
  ];

  scrollInfoDocs: ApiDocEntry[] = [
    {
      name: 'x.current',
      type: 'number',
      description: 'Current horizontal scroll position in pixels from the left edge of the scrollable container.',
    },
    {
      name: 'x.scrollLength',
      type: 'number',
      description: 'Total horizontal scrollable distance in pixels (scrollWidth minus clientWidth).',
    },
    {
      name: 'x.velocity',
      type: 'number',
      description: 'Current horizontal scroll velocity in pixels per second. Positive values indicate rightward scrolling.',
    },
    {
      name: 'y.current',
      type: 'number',
      description: 'Current vertical scroll position in pixels from the top of the scrollable container.',
    },
    {
      name: 'y.scrollLength',
      type: 'number',
      description: 'Total vertical scrollable distance in pixels (scrollHeight minus clientHeight).',
    },
    {
      name: 'y.velocity',
      type: 'number',
      description: 'Current vertical scroll velocity in pixels per second. Positive values indicate downward scrolling.',
    },
  ];

  typeAnimationPreset = `type AnimationPreset =
  | 'fadeIn'     | 'fadeOut'
  | 'fadeInUp'   | 'fadeInDown'
  | 'fadeInLeft' | 'fadeInRight'
  | 'zoomIn'     | 'zoomOut'
  | 'slideInUp'  | 'slideInDown'
  | 'bounceIn'   | 'rotateIn';`;

  typeHoverKeyframes = `type HoverKeyframes = Record<string, [start: number | string, end: number | string]>;

// Example:
// { scale: [1, 1.1], y: [0, -4], boxShadow: ['0 4px 6px rgba(0,0,0,0.1)', '0 20px 25px rgba(0,0,0,0.15)'] }`;

  typeEasing = `type Easing =
  | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'circIn' | 'circOut' | 'circInOut'
  | 'backIn' | 'backOut' | 'backInOut'
  | [number, number, number, number]   // cubic-bezier
  | ((t: number) => number);            // custom function`;
}
