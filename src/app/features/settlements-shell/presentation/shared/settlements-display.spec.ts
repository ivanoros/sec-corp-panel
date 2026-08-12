import { formatDashboardAmount } from './settlements-display';

describe('formatDashboardAmount', () => {
  it('formats dashboard amounts with accounting negatives', () => {
    expect(formatDashboardAmount('9705.00')).toBe('9,705');
    expect(formatDashboardAmount('-2797.00')).toBe('(2,797)');
    expect(formatDashboardAmount('520000000.00', 2)).toBe('520,000,000.00');
  });
});
