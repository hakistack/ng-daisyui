import { Component, signal } from '@angular/core';
import { MotionAnimateDirective, MotionHoverDirective, LucideIconComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-motion-demo',
  imports: [MotionAnimateDirective, MotionHoverDirective, LucideIconComponent],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Motion Directives</h1>
        <p class="text-base-content/70 mt-2">Smooth animations powered by Motion library</p>
      </div>

      <!-- Animate on Load -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Animate on Load</h2>
          <p class="text-sm text-base-content/60 mb-4">Elements animate when they appear</p>

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
        </div>
      </div>

      <!-- Animate on Scroll -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Animate on Scroll</h2>
          <p class="text-sm text-base-content/60 mb-4">Elements animate when scrolled into view</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              [motionAnimate]="'fadeInLeft'"
              [motionOptions]="{ trigger: 'scroll', duration: 0.6, once: true }"
              class="p-6 bg-base-200 rounded-lg"
            >
              <h3 class="font-semibold mb-2">Fade In Left</h3>
              <p class="text-sm text-base-content/70">Slides in from the left on scroll</p>
            </div>
            <div
              [motionAnimate]="'fadeInUp'"
              [motionOptions]="{ trigger: 'scroll', duration: 0.6, delay: 0.15, once: true }"
              class="p-6 bg-base-200 rounded-lg"
            >
              <h3 class="font-semibold mb-2">Fade In Up</h3>
              <p class="text-sm text-base-content/70">Slides up from below on scroll</p>
            </div>
            <div
              [motionAnimate]="'fadeInRight'"
              [motionOptions]="{ trigger: 'scroll', duration: 0.6, delay: 0.3, once: true }"
              class="p-6 bg-base-200 rounded-lg"
            >
              <h3 class="font-semibold mb-2">Fade In Right</h3>
              <p class="text-sm text-base-content/70">Slides in from the right on scroll</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Hover Animations -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Hover Animations</h2>
          <p class="text-sm text-base-content/60 mb-4">Interactive hover effects</p>

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
        </div>
      </div>

      <!-- Combined Hover Effects -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Combined Hover Effects</h2>
          <p class="text-sm text-base-content/60 mb-4">Multiple properties animated together</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              [motionHover]="{ scale: [1, 1.05], y: [0, -4], boxShadow: ['0 4px 6px -1px rgba(0,0,0,0.1)', '0 20px 25px -5px rgba(0,0,0,0.15)'] }"
              [animationOptions]="{ duration: 0.3, ease: 'easeOut' }"
              class="p-6 bg-base-200 rounded-xl shadow-md cursor-pointer"
            >
              <app-lucide-icon name="Rocket" [size]="32" class="text-primary mb-3" />
              <h3 class="font-semibold">Card Lift</h3>
              <p class="text-sm text-base-content/70 mt-1">Scales up with elevated shadow</p>
            </div>

            <div
              [motionHover]="{ scale: [1, 1.02], rotate: [0, 1] }"
              [animationOptions]="{ duration: 0.2 }"
              class="p-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl cursor-pointer"
            >
              <app-lucide-icon name="Sparkles" [size]="32" class="text-secondary mb-3" />
              <h3 class="font-semibold">Subtle Tilt</h3>
              <p class="text-sm text-base-content/70 mt-1">Gentle scale with rotation</p>
            </div>

            <div
              [motionHover]="{ x: [0, 4], scale: [1, 1.02] }"
              [animationOptions]="{ duration: 0.2 }"
              class="p-6 bg-base-200 rounded-xl cursor-pointer border-l-4 border-accent"
            >
              <app-lucide-icon name="ArrowRight" [size]="32" class="text-accent mb-3" />
              <h3 class="font-semibold">Slide Right</h3>
              <p class="text-sm text-base-content/70 mt-1">Suggests forward navigation</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Click Animations -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Click Animations</h2>
          <p class="text-sm text-base-content/60 mb-4">Triggered by user click</p>

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
              <app-lucide-icon name="RefreshCw" [size]="18" />
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
        </div>
      </div>

      <!-- Animation Presets -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Animation Presets</h2>
          <p class="text-sm text-base-content/60 mb-4">Built-in named animations</p>

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
        </div>
      </div>

      <!-- Staggered Children -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Staggered Animation</h2>
          <p class="text-sm text-base-content/60 mb-4">Elements animate in sequence with delays</p>

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
                  <app-lucide-icon [name]="item.icon" [size]="20" class="text-primary" />
                  <span>{{ item.label }}</span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Custom Keyframes -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Custom Keyframes</h2>
          <p class="text-sm text-base-content/60 mb-4">Define your own animation keyframes</p>

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

          <div class="mt-4 p-4 bg-base-200 rounded-lg">
            <code class="text-sm whitespace-pre-wrap">[motionAnimate]="&#123; opacity: [0, 1], y: [30, 0], rotate: [-10, 0] &#125;"</code>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MotionDemoComponent {
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
}
