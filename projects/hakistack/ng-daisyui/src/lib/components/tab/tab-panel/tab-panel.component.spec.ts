import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabPanelComponent } from './tab-panel.component';

// ---------------------------------------------------------------------------
// Test host components
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-host-panel-basic',
  imports: [TabPanelComponent],
  template: `
    <hk-tab-panel value="panel1" label="Panel Label">
      <ng-template>Panel content here</ng-template>
    </hk-tab-panel>
  `,
})
class BasicPanelTestHostComponent {
  readonly panel = viewChild.required(TabPanelComponent);
}

@Component({
  selector: 'hk-test-host-panel-icon',
  imports: [TabPanelComponent],
  template: `
    <hk-tab-panel value="panel-icon" label="With Icon" icon="Home">
      <ng-template>Icon panel content</ng-template>
    </hk-tab-panel>
  `,
})
class IconPanelTestHostComponent {
  readonly panel = viewChild.required(TabPanelComponent);
}

@Component({
  selector: 'hk-test-host-panel-disabled',
  imports: [TabPanelComponent],
  template: `
    <hk-tab-panel value="panel-dis" label="Disabled" [disabled]="true">
      <ng-template>Disabled panel content</ng-template>
    </hk-tab-panel>
  `,
})
class DisabledPanelTestHostComponent {
  readonly panel = viewChild.required(TabPanelComponent);
}

@Component({
  selector: 'hk-test-host-panel-no-icon',
  imports: [TabPanelComponent],
  template: `
    <hk-tab-panel value="no-icon" label="No Icon">
      <ng-template>No icon content</ng-template>
    </hk-tab-panel>
  `,
})
class NoIconPanelTestHostComponent {
  readonly panel = viewChild.required(TabPanelComponent);
}

@Component({
  selector: 'hk-test-host-panel-empty-label',
  imports: [TabPanelComponent],
  template: `
    <hk-tab-panel value="empty-label">
      <ng-template>Content with empty label</ng-template>
    </hk-tab-panel>
  `,
})
class EmptyLabelPanelTestHostComponent {
  readonly panel = viewChild.required(TabPanelComponent);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TabPanelComponent', () => {
  // -------------------------------------------------------------------------
  // Basic creation
  // -------------------------------------------------------------------------
  describe('component creation', () => {
    it('should create the tab panel component', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel()).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Inputs
  // -------------------------------------------------------------------------
  describe('value input', () => {
    it('should expose the required value input', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().value()).toBe('panel1');
    });
  });

  describe('label input', () => {
    it('should expose the label input', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().label()).toBe('Panel Label');
    });

    it('should default label to empty string when not provided', async () => {
      await TestBed.configureTestingModule({
        imports: [EmptyLabelPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(EmptyLabelPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().label()).toBe('');
    });
  });

  describe('icon input', () => {
    it('should expose the icon input when provided', async () => {
      await TestBed.configureTestingModule({
        imports: [IconPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(IconPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().icon()).toBe('Home');
    });

    it('should default icon to undefined when not provided', async () => {
      await TestBed.configureTestingModule({
        imports: [NoIconPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(NoIconPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().icon()).toBeUndefined();
    });
  });

  describe('disabled input', () => {
    it('should expose the disabled input when set to true', async () => {
      await TestBed.configureTestingModule({
        imports: [DisabledPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(DisabledPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().disabled()).toBe(true);
    });

    it('should default disabled to false', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().disabled()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Content template ref
  // -------------------------------------------------------------------------
  describe('contentTemplateRef', () => {
    it('should have a content template reference', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicPanelTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.panel().contentTemplateRef()).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Template projection
  // -------------------------------------------------------------------------
  describe('content projection', () => {
    it('should project ng-content (the template is passed through)', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicPanelTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicPanelTestHostComponent);
      fixture.detectChanges();

      // TabPanelComponent uses <ng-content /> which projects the ng-template
      // The contentTemplateRef should be set by contentChild(TemplateRef)
      const templateRef = fixture.componentInstance.panel().contentTemplateRef();
      expect(templateRef).toBeTruthy();
    });
  });
});
