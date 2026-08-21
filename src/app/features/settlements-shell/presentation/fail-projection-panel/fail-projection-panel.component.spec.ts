import { TestBed } from '@angular/core/testing';

import type { FailProjectionValues } from '../../domain/settlements-dashboard';
import { FailProjectionPanelComponent } from './fail-projection-panel.component';

const VALUES: FailProjectionValues = {
  settled: { sellTrades: '4362839957.00', buyTrades: '4362839957.00' },
  pending: { sellTrades: '1184290700.00', buyTrades: '839560120.00' },
  fails: { sellTrades: '219227849.00', buyTrades: '61584377.00' },
};

describe('FailProjectionPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FailProjectionPanelComponent],
    }).compileComponents();
  });

  it('renders six compact metrics without visible trade-side headings', () => {
    const fixture = TestBed.createComponent(FailProjectionPanelComponent);
    fixture.componentRef.setInput('values', VALUES);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.fail-projection__metric')).toHaveLength(6);
    expect(element.textContent).toContain('$ 4,362,839,957');
    expect(element.textContent).not.toContain('AF Sell Trades');
    expect(element.textContent).not.toContain('AF Buy Trades');
    expect(element.querySelector('[aria-label="AF Sell Trades Settled"]')).not.toBeNull();
    expect(element.querySelectorAll('.fail-projection__metric--buy')).toHaveLength(3);
  });
});
