import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LucideIconComponent } from './lucide-icon.component';

describe('LucideIconComponent', () => {
  let component: LucideIconComponent;
  let fixture: ComponentFixture<LucideIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LucideIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LucideIconComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'Home');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
