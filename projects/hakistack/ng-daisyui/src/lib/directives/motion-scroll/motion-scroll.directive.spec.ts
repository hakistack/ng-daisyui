import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MotionScrollDirective } from './motion-scroll.directive';

@Component({
  selector: 'hk-test-bare-scroll',
  imports: [MotionScrollDirective],
  template: `<div hkScroll></div>`,
})
class BareScrollHostComponent {
  readonly directive = viewChild.required(MotionScrollDirective);
}

describe('MotionScrollDirective', () => {
  it('treats the bare attribute as progress tracking (true), not "off"', () => {
    const fixture = TestBed.createComponent(BareScrollHostComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.directive().hkScroll()).toBe(true);
  });
});
