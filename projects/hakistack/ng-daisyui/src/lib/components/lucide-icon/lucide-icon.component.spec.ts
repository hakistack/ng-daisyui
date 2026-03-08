import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Search, Home, Settings, type LucideIconData } from 'lucide-angular';

import { LucideIconComponent } from './lucide-icon.component';
import { ICON_REGISTRY, provideIcons } from './icon-registry';

describe('LucideIconComponent', () => {
  let component: LucideIconComponent;
  let fixture: ComponentFixture<LucideIconComponent>;

  function createComponent(name: string): ComponentFixture<LucideIconComponent> {
    fixture = TestBed.createComponent(LucideIconComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    return fixture;
  }

  describe('with default registry (internal icons)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [LucideIconComponent],
      }).compileComponents();
    });

    it('should create the component', () => {
      createComponent('Search');
      expect(component).toBeTruthy();
    });

    it('should resolve an internal icon by name', () => {
      createComponent('Search');
      expect(component.icon()).toBeTruthy();
      expect(component.icon()).toBe(Search);
    });

    it('should resolve various internal icons', () => {
      createComponent('Info');
      expect(component.icon()).toBeTruthy();

      fixture.componentRef.setInput('name', 'X');
      fixture.detectChanges();
      expect(component.icon()).toBeTruthy();

      fixture.componentRef.setInput('name', 'CircleCheck');
      fixture.detectChanges();
      expect(component.icon()).toBeTruthy();
    });

    it('should return undefined for an unregistered icon name', () => {
      createComponent('NonExistentIcon');
      expect(component.icon()).toBeUndefined();
    });

    it('should not render lucide-icon element when icon data is undefined', () => {
      createComponent('NonExistentIcon');
      const lucideEl = fixture.nativeElement.querySelector('lucide-icon');
      expect(lucideEl).toBeNull();
    });

    it('should render lucide-icon element when icon data is resolved', () => {
      createComponent('Search');
      const lucideEl = fixture.nativeElement.querySelector('lucide-icon');
      expect(lucideEl).toBeTruthy();
    });

    describe('default input values', () => {
      beforeEach(() => {
        createComponent('Search');
      });

      it('should have default size of 20', () => {
        expect(component.size()).toBe(20);
      });

      it('should have default color of currentColor', () => {
        expect(component.color()).toBe('currentColor');
      });

      it('should have default strokeWidth of 2', () => {
        expect(component.strokeWidth()).toBe(2);
      });

      it('should have default absoluteStrokeWidth of false', () => {
        expect(component.absoluteStrokeWidth()).toBe(false);
      });

      it('should have default class of empty string', () => {
        expect(component.class()).toBe('');
      });
    });

    describe('custom input values', () => {
      it('should accept a custom size', () => {
        createComponent('Search');
        fixture.componentRef.setInput('size', 32);
        fixture.detectChanges();
        expect(component.size()).toBe(32);
      });

      it('should accept a custom color', () => {
        createComponent('Search');
        fixture.componentRef.setInput('color', '#ff0000');
        fixture.detectChanges();
        expect(component.color()).toBe('#ff0000');
      });

      it('should accept a custom strokeWidth', () => {
        createComponent('Search');
        fixture.componentRef.setInput('strokeWidth', 3);
        fixture.detectChanges();
        expect(component.strokeWidth()).toBe(3);
      });

      it('should accept absoluteStrokeWidth', () => {
        createComponent('Search');
        fixture.componentRef.setInput('absoluteStrokeWidth', true);
        fixture.detectChanges();
        expect(component.absoluteStrokeWidth()).toBe(true);
      });

      it('should accept a custom class', () => {
        createComponent('Search');
        fixture.componentRef.setInput('class', 'my-custom-class');
        fixture.detectChanges();
        expect(component.class()).toBe('my-custom-class');
      });
    });

    describe('iconData input override', () => {
      it('should prefer explicit iconData over registry lookup', () => {
        createComponent('Search');
        const customIconData: LucideIconData = Home;
        fixture.componentRef.setInput('iconData', customIconData);
        fixture.detectChanges();
        // iconData takes precedence over the registry
        expect(component.icon()).toBe(customIconData);
      });

      it('should fall back to registry when iconData is not provided', () => {
        createComponent('Search');
        expect(component.icon()).toBe(Search);
      });
    });

    describe('changing the name input', () => {
      it('should reactively update the resolved icon when name changes', () => {
        createComponent('Search');
        expect(component.icon()).toBe(Search);

        fixture.componentRef.setInput('name', 'Info');
        fixture.detectChanges();
        expect(component.icon()).toBeTruthy();
        expect(component.icon()).not.toBe(Search);
      });

      it('should clear the icon when switching to an unregistered name', () => {
        createComponent('Search');
        expect(component.icon()).toBeTruthy();

        fixture.componentRef.setInput('name', 'DoesNotExist');
        fixture.detectChanges();
        expect(component.icon()).toBeUndefined();
      });
    });
  });

  describe('with custom provideIcons', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [LucideIconComponent],
        providers: [provideIcons({ Home, Settings })],
      }).compileComponents();
    });

    it('should resolve consumer-provided icons', () => {
      createComponent('Home');
      expect(component.icon()).toBe(Home);
    });

    it('should resolve consumer-provided Settings icon', () => {
      createComponent('Settings');
      expect(component.icon()).toBe(Settings);
    });

    it('should still resolve internal icons when provideIcons is used', () => {
      createComponent('Search');
      expect(component.icon()).toBe(Search);
    });
  });

  describe('provideIcons function', () => {
    it('should return a provider with ICON_REGISTRY token', () => {
      const provider = provideIcons({ Home });
      expect(provider.provide).toBe(ICON_REGISTRY);
    });

    it('should merge consumer icons with internal icons', () => {
      const provider = provideIcons({ Home });
      const registry = provider.useValue as Record<string, LucideIconData>;
      // Should include internal icon
      expect(registry['Search']).toBe(Search);
      // Should include consumer icon
      expect(registry['Home']).toBe(Home);
    });
  });

  describe('ICON_REGISTRY token', () => {
    it('should provide default internal icons via factory', () => {
      TestBed.configureTestingModule({
        imports: [LucideIconComponent],
      });
      const registry = TestBed.inject(ICON_REGISTRY);
      expect(registry['Search']).toBe(Search);
      expect(registry['X']).toBeTruthy();
      expect(registry['Info']).toBeTruthy();
      expect(registry['CircleCheck']).toBeTruthy();
      expect(registry['TriangleAlert']).toBeTruthy();
      expect(registry['CircleX']).toBeTruthy();
    });

    it('should include all 29 internal icons', () => {
      TestBed.configureTestingModule({
        imports: [LucideIconComponent],
      });
      const registry = TestBed.inject(ICON_REGISTRY);
      const expectedIcons = [
        'ArrowDown', 'ArrowUp', 'ArrowUpDown', 'Braces', 'Check', 'CheckCheck',
        'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronsLeft', 'ChevronsRight',
        'CircleCheck', 'CircleX', 'Columns3', 'Eye', 'EyeOff', 'FileSpreadsheet',
        'FileText', 'Folder', 'FolderOpen', 'GripVertical', 'Info', 'ListFilter',
        'Lock', 'RotateCcw', 'Search', 'Sheet', 'TriangleAlert', 'X',
      ];
      for (const name of expectedIcons) {
        expect(registry[name]).toBeTruthy();
      }
    });
  });
});
