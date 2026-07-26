import { TestBed } from '@angular/core/testing';

import { SecCorpPanelComponent } from './sec-corp-panel.component';

describe('SecCorpPanelComponent', () => {
  it('mounts a shell-owned panel surface', () => {
    const fixture = TestBed.createComponent(SecCorpPanelComponent);

    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector(
      '[data-testid="sec-corp-panel"]',
    ) as HTMLElement | null;

    expect(panel?.getAttribute('aria-label')).toBe('Sec Corp funding panel');
  });
});
