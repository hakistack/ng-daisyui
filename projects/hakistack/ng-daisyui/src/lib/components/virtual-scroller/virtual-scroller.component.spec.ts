import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualScrollerComponent } from './virtual-scroller.component';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateItems(count: number): { id: number; name: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));
}

// ---------------------------------------------------------------------------
// Test-host components
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-host',
  imports: [VirtualScrollerComponent],
  template: `
    <hk-virtual-scroller [items]="items()" [itemSize]="50" viewportHeight="200px">
      <ng-template #item let-data let-i="index">
        <div class="test-item" [style.height.px]="50">{{ data.name }}</div>
      </ng-template>
    </hk-virtual-scroller>
  `,
})
class BasicTestHostComponent {
  readonly items = signal(generateItems(1000));
}

@Component({
  selector: 'hk-grid-host',
  imports: [VirtualScrollerComponent],
  template: `
    <hk-virtual-scroller [items]="items()" [itemSize]="100" [numColumns]="3" viewportHeight="300px">
      <ng-template #item let-data let-i="index">
        <div class="grid-item" [style.height.px]="100">{{ data.name }}</div>
      </ng-template>
    </hk-virtual-scroller>
  `,
})
class GridTestHostComponent {
  readonly items = signal(generateItems(99));
}

@Component({
  selector: 'hk-lazy-host',
  imports: [VirtualScrollerComponent],
  template: `
    <hk-virtual-scroller [items]="items()" [itemSize]="50" [lazy]="true" viewportHeight="200px" (lazyLoad)="onLazyLoad($event)">
      <ng-template #item let-data>
        <div class="lazy-item">{{ data.name }}</div>
      </ng-template>
      <ng-template #loader let-i="index">
        <div class="loader-item">Loading {{ i }}...</div>
      </ng-template>
    </hk-virtual-scroller>
  `,
})
class LazyTestHostComponent {
  readonly items = signal<({ id: number; name: string } | null)[]>(new Array(100).fill(null));
  readonly lastLazyEvent = signal<{ first: number; rows: number } | null>(null);

  onLazyLoad(event: { first: number; rows: number }): void {
    this.lastLazyEvent.set(event);
  }
}

@Component({
  selector: 'hk-horizontal-host',
  imports: [VirtualScrollerComponent],
  template: `
    <hk-virtual-scroller [items]="items()" [itemSize]="120" orientation="horizontal" viewportHeight="100px" viewportWidth="400px">
      <ng-template #item let-data>
        <div class="horiz-item" [style.width.px]="120">{{ data.name }}</div>
      </ng-template>
    </hk-virtual-scroller>
  `,
})
class HorizontalTestHostComponent {
  readonly items = signal(generateItems(500));
}

@Component({
  selector: 'hk-template-host',
  imports: [VirtualScrollerComponent],
  template: `
    <hk-virtual-scroller [items]="items()" [itemSize]="50" viewportHeight="200px">
      <ng-template #header>
        <div class="test-header">Header Content</div>
      </ng-template>
      <ng-template #item let-data>
        <div class="test-item">{{ data.name }}</div>
      </ng-template>
      <ng-template #footer>
        <div class="test-footer">Footer Content</div>
      </ng-template>
    </hk-virtual-scroller>
  `,
})
class TemplateTestHostComponent {
  readonly items = signal(generateItems(100));
}

// ---------------------------------------------------------------------------
// Global stubs for APIs not implemented in the test DOM environment
// ---------------------------------------------------------------------------

beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function () {
      /* noop */
    };
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = function () {
      /* noop */
    };
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VirtualScrollerComponent', () => {
  describe('Basic vertical scrolling', () => {
    let fixture: ComponentFixture<BasicTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render a cdk-virtual-scroll-viewport', () => {
      const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport');
      expect(viewport).toBeTruthy();
    });

    it('should render some items (not all 1000)', () => {
      fixture.detectChanges();
      const items = fixture.nativeElement.querySelectorAll('.test-item');
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThan(1000);
    });

    it('should set viewport height', () => {
      const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport') as HTMLElement;
      expect(viewport.style.height).toBe('200px');
    });
  });

  describe('Grid mode', () => {
    let fixture: ComponentFixture<GridTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [GridTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(GridTestHostComponent);
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should have a viewport element', () => {
      const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport');
      expect(viewport).toBeTruthy();
    });
  });

  describe('Horizontal scrolling', () => {
    let fixture: ComponentFixture<HorizontalTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HorizontalTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HorizontalTestHostComponent);
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should apply horizontal orientation class on viewport', () => {
      const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport') as HTMLElement;
      expect(viewport).toBeTruthy();
      // CDK applies cdk-virtual-scroll-orientation-horizontal class
      expect(viewport.classList.contains('cdk-virtual-scroll-orientation-horizontal')).toBe(true);
    });

    it('should set viewport width', () => {
      const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport') as HTMLElement;
      expect(viewport.style.width).toBe('400px');
    });
  });

  describe('Lazy loading', () => {
    let fixture: ComponentFixture<LazyTestHostComponent>;
    let host: LazyTestHostComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [LazyTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(LazyTestHostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render loader template for null items', () => {
      fixture.detectChanges();
      const loaders = fixture.nativeElement.querySelectorAll('.loader-item');
      expect(loaders.length).toBeGreaterThan(0);
    });

    it('should render item template for loaded items', () => {
      // Load first 10 items
      const items = [...host.items()];
      for (let i = 0; i < 10; i++) {
        items[i] = { id: i, name: `Item ${i}` };
      }
      host.items.set(items);
      fixture.detectChanges();

      const rendered = fixture.nativeElement.querySelectorAll('.lazy-item');
      expect(rendered.length).toBeGreaterThan(0);
    });
  });

  describe('Header and Footer templates', () => {
    let fixture: ComponentFixture<TemplateTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TemplateTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TemplateTestHostComponent);
      fixture.detectChanges();
    });

    it('should render header template', () => {
      const header = fixture.nativeElement.querySelector('.test-header');
      expect(header).toBeTruthy();
      expect(header.textContent).toContain('Header Content');
    });

    it('should render footer template', () => {
      const footer = fixture.nativeElement.querySelector('.test-footer');
      expect(footer).toBeTruthy();
      expect(footer.textContent).toContain('Footer Content');
    });
  });

  describe('VirtualScrollerComponent API', () => {
    let fixture: ComponentFixture<BasicTestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BasicTestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(BasicTestHostComponent);
      fixture.detectChanges();
    });

    it('should expose scrollToIndex method', () => {
      const scroller = fixture.debugElement.children[0].componentInstance as VirtualScrollerComponent;
      expect(typeof scroller.scrollToIndex).toBe('function');
    });

    it('should not throw when calling scrollToIndex', () => {
      const scroller = fixture.debugElement.children[0].componentInstance as VirtualScrollerComponent;
      expect(() => scroller.scrollToIndex(50)).not.toThrow();
    });
  });
});
