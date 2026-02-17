import { Component, signal } from '@angular/core';
import { MotionAnimateDirective, MotionHoverDirective, LucideIconComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type MotionTab = 'animate' | 'hover' | 'presets';

@Component({
  selector: 'app-motion-demo',
  imports: [MotionAnimateDirective, MotionHoverDirective, LucideIconComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Motion Directives</h1>
        <p class="text-base-content/70 mt-2">Smooth animations powered by Motion library</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} MotionAnimateDirective, MotionHoverDirective {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-bordered">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-boxed">
          <input type="radio" name="motion_tabs" role="tab" class="tab" aria-label="Animate"
            [checked]="activeTab() === 'animate'" (change)="activeTab.set('animate')" />
          <input type="radio" name="motion_tabs" role="tab" class="tab" aria-label="Hover"
            [checked]="activeTab() === 'hover'" (change)="activeTab.set('hover')" />
          <input type="radio" name="motion_tabs" role="tab" class="tab" aria-label="Presets"
            [checked]="activeTab() === 'presets'" (change)="activeTab.set('presets')" />
        </div>

        @if (activeTab() === 'animate') {
          <div class="space-y-6">
            <app-doc-section title="Animate on Load" description="Elements animate when they appear" [codeExample]="loadCode">
              <button class="btn btn-primary mb-4" (click)="toggleLoadDemo()">
                {{ showLoadDemo() ? 'Hide' : 'Show' }} Elements
              </button>

              @if (showLoadDemo()) {
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    [motionAnimate]="'fadeIn'"
                    [motionOptions]="{ trigger: 'immediate', duration: 0.5 }"
                    class="p-6 bg-primary text-primary-content rounded-lg text-center"
                  >
                    Fade In
                  </div>
                  <div
                    [motionAnimate]="'fadeInUp'"
                    [motionOptions]="{ trigger: 'immediate', duration: 0.5, delay: 0.1 }"
                    class="p-6 bg-secondary text-secondary-content rounded-lg text-center"
                  >
                    Fade In Up
                  </div>
                  <div
                    [motionAnimate]="'fadeInDown'"
                    [motionOptions]="{ trigger: 'immediate', duration: 0.5, delay: 0.2 }"
                    class="p-6 bg-accent text-accent-content rounded-lg text-center"
                  >
                    Fade In Down
                  </div>
                  <div
                    [motionAnimate]="'zoomIn'"
                    [motionOptions]="{ trigger: 'immediate', duration: 0.5, delay: 0.3 }"
                    class="p-6 bg-info text-info-content rounded-lg text-center"
                  >
                    Zoom In
                  </div>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="Click Animations" description="Triggered by user click" [codeExample]="clickCode">
              <div class="flex flex-wrap gap-4">
                <button
                  [motionAnimate]="'bounceIn'"
                  [motionOptions]="{ trigger: 'click', duration: 0.5 }"
                  class="btn btn-primary"
                >
                  Bounce
                </button>
                <button
                  [motionAnimate]="{ scale: [1, 1.2, 1] }"
                  [motionOptions]="{ trigger: 'click', duration: 0.3 }"
                  class="btn btn-secondary"
                >
                  Pulse
                </button>
                <button
                  [motionAnimate]="{ rotate: [0, 360] }"
                  [motionOptions]="{ trigger: 'click', duration: 0.5 }"
                  class="btn btn-accent"
                >
                  <hk-lucide-icon name="RefreshCw" [size]="18" />
                  Spin
                </button>
                <button
                  [motionAnimate]="{ x: [0, -10, 10, -10, 10, 0] }"
                  [motionOptions]="{ trigger: 'click', duration: 0.4 }"
                  class="btn btn-warning"
                >
                  Shake
                </button>
              </div>
            </app-doc-section>

            <app-doc-section title="Staggered Animation" description="Elements animate in sequence with delays" [codeExample]="staggerCode">
              <button class="btn btn-primary mb-4" (click)="toggleStaggerDemo()">
                {{ showStaggerDemo() ? 'Reset' : 'Animate' }} List
              </button>

              @if (showStaggerDemo()) {
                <div class="space-y-2">
                  @for (item of staggerItems; track item; let i = $index) {
                    <div
                      [motionAnimate]="'fadeInLeft'"
                      [motionOptions]="{ trigger: 'immediate', duration: 0.4, delay: i * 0.1 }"
                      class="p-4 bg-base-200 rounded-lg flex items-center gap-3"
                    >
                      <hk-lucide-icon [name]="item.icon" [size]="20" class="text-primary" />
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
                  [motionHover]="{ scale: [1, 1.1] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-primary text-primary-content rounded-lg text-center cursor-pointer"
                >
                  Scale Up
                </div>
                <div
                  [motionHover]="{ scale: [1, 0.95] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-secondary text-secondary-content rounded-lg text-center cursor-pointer"
                >
                  Scale Down
                </div>
                <div
                  [motionHover]="{ rotate: [0, 5] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-accent text-accent-content rounded-lg text-center cursor-pointer"
                >
                  Rotate
                </div>
                <div
                  [motionHover]="{ y: [0, -8] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-info text-info-content rounded-lg text-center cursor-pointer"
                >
                  Lift Up
                </div>
              </div>
            </app-doc-section>

            <app-doc-section title="Combined Hover Effects" description="Multiple properties animated together" [codeExample]="combinedHoverCode">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  [motionHover]="{ scale: [1, 1.05], y: [0, -4], boxShadow: ['0 4px 6px -1px rgba(0,0,0,0.1)', '0 20px 25px -5px rgba(0,0,0,0.15)'] }"
                  [animationOptions]="{ duration: 0.3, ease: 'easeOut' }"
                  class="p-6 bg-base-200 rounded-xl shadow-md cursor-pointer"
                >
                  <hk-lucide-icon name="Rocket" [size]="32" class="text-primary mb-3" />
                  <h3 class="font-semibold">Card Lift</h3>
                  <p class="text-sm text-base-content/70 mt-1">Scales up with elevated shadow</p>
                </div>

                <div
                  [motionHover]="{ scale: [1, 1.02], rotate: [0, 1] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl cursor-pointer"
                >
                  <hk-lucide-icon name="Sparkles" [size]="32" class="text-secondary mb-3" />
                  <h3 class="font-semibold">Subtle Tilt</h3>
                  <p class="text-sm text-base-content/70 mt-1">Gentle scale with rotation</p>
                </div>

                <div
                  [motionHover]="{ x: [0, 4], scale: [1, 1.02] }"
                  [animationOptions]="{ duration: 0.2 }"
                  class="p-6 bg-base-200 rounded-xl cursor-pointer border-l-4 border-accent"
                >
                  <hk-lucide-icon name="ArrowRight" [size]="32" class="text-accent mb-3" />
                  <h3 class="font-semibold">Slide Right</h3>
                  <p class="text-sm text-base-content/70 mt-1">Suggests forward navigation</p>
                </div>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'presets') {
          <div class="space-y-6">
            <app-doc-section title="Animation Presets" description="Built-in named animations (click to trigger)" [codeExample]="presetCode">
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                @for (preset of presets; track preset) {
                  <button
                    [motionAnimate]="preset"
                    [motionOptions]="{ trigger: 'click', duration: 0.6 }"
                    class="btn btn-outline btn-sm"
                  >
                    {{ preset }}
                  </button>
                }
              </div>
            </app-doc-section>

            <app-doc-section title="Custom Keyframes" description="Define your own animation keyframes" [codeExample]="customCode">
              <div class="flex flex-wrap gap-6">
                <div
                  [motionAnimate]="{ opacity: [0, 1], y: [30, 0], rotate: [-10, 0] }"
                  [motionOptions]="{ trigger: 'scroll', duration: 0.8, ease: 'easeOut' }"
                  class="p-6 bg-gradient-to-r from-primary to-secondary text-white rounded-xl"
                >
                  Custom: Fade + Slide + Rotate
                </div>

                <div
                  [motionAnimate]="{ scale: [0.8, 1.1, 1], opacity: [0, 1] }"
                  [motionOptions]="{ trigger: 'scroll', duration: 0.6 }"
                  class="p-6 bg-gradient-to-r from-secondary to-accent text-white rounded-xl"
                >
                  Custom: Bounce Scale In
                </div>
              </div>
            </app-doc-section>
          </div>
        }
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="motionAnimate Directive" [entries]="animateDocs" />
          <app-api-table title="motionHover Directive" [entries]="hoverDocs" />
          <app-api-table title="MotionOptions" [entries]="optionDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Available Presets</h3>
            <app-code-block [code]="presetsListCode" />
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-2">Usage</h3>
            <app-code-block [code]="usageCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class MotionDemoComponent {
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<MotionTab>('animate');
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
  [motionAnimate]="'fadeInUp'"
  [motionOptions]="loadAnimation">
  Content
</div>`;

  clickCode = `// TypeScript
bounceOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.5 };
pulseKeyframes = { scale: [1, 1.2, 1] };
pulseOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.3 };

// Template
<!-- Preset animation -->
<button
  [motionAnimate]="'bounceIn'"
  [motionOptions]="bounceOptions">
  Bounce
</button>

<!-- Custom keyframes -->
<button
  [motionAnimate]="pulseKeyframes"
  [motionOptions]="pulseOptions">
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
    [motionAnimate]="'fadeInLeft'"
    [motionOptions]="staggerOptions(i)">
    {{ item.label }}
  </div>
}`;

  hoverCode = `// TypeScript
scaleHover: HoverKeyframes = { scale: [1, 1.1] };
hoverAnimOptions: HoverAnimationOptions = { duration: 0.2 };

// Template
<div
  [motionHover]="scaleHover"
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
  [motionHover]="cardLiftHover"
  [animationOptions]="cardLiftOptions">
  Card content
</div>`;

  presetCode = `// TypeScript
presetOptions: MotionDirectiveOptions = { trigger: 'click', duration: 0.6 };

// Template
<button
  [motionAnimate]="'bounceIn'"
  [motionOptions]="presetOptions">
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
  [motionAnimate]="customKeyframes"
  [motionOptions]="customOptions">
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
      [motionAnimate]="'fadeInUp'"
      [motionOptions]="{
        trigger: 'immediate',  // 'immediate' | 'click' | 'scroll'
        duration: 0.5,
        delay: 0,
        ease: 'easeOut',
      }">
      Animated content
    </div>

    <!-- Hover directive -->
    <div
      [motionHover]="{ scale: [1, 1.1] }"
      [animationOptions]="{ duration: 0.2 }">
      Hover effect
    </div>
  \`,
})`;

  // --- API docs ---
  animateDocs: ApiDocEntry[] = [
    { name: '[motionAnimate]', type: "string | Record<string, number[]>", description: 'Preset name or custom keyframes object' },
    { name: '[motionOptions]', type: 'MotionOptions', default: '{}', description: 'Animation configuration options' },
  ];

  hoverDocs: ApiDocEntry[] = [
    { name: '[motionHover]', type: 'Record<string, number[]>', description: 'Keyframes to animate on hover (from/to values)' },
    { name: '[animationOptions]', type: 'AnimationOptions', default: '{}', description: 'Hover animation configuration' },
  ];

  optionDocs: ApiDocEntry[] = [
    { name: 'trigger', type: "'immediate' | 'click' | 'scroll'", default: "'immediate'", description: 'What triggers the animation' },
    { name: 'duration', type: 'number', default: '0.5', description: 'Animation duration in seconds' },
    { name: 'delay', type: 'number', default: '0', description: 'Delay before animation starts (seconds)' },
    { name: 'ease', type: 'string', default: "'easeOut'", description: 'Easing function (easeIn, easeOut, easeInOut, linear)' },
  ];
}
