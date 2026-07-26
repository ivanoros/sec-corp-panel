import { asDecimalString } from '../../domain/decimal-value';
import { createSecCorpReportFixture } from '../../panels/sec-corp/mocks/sec-corp-report.fixture';
import { toFundingGridViewModel } from '../funding-grid.viewmodel';
import {
  FUNDING_GRID_CELL_CLASSES,
  FUNDING_GRID_ROW_CLASSES,
  formatFundingAmount,
  formatFundingRowLabel,
  getFundingRowClass,
  getFundingValueCellClasses,
} from './funding-grid-display';

describe('funding grid display policy', () => {
  const rows = toFundingGridViewModel(createSecCorpReportFixture(), {}, null).rows;

  it.each([
    ['0.00', '0.00'],
    ['28012488.36', '28,012,488.36'],
    ['-308824714.48', '(308,824,714.48)'],
    ['4802238823.83', '4,802,238,823.83'],
  ])('formats %s without converting exact decimal strings to numbers', (value, expected) => {
    expect(formatFundingAmount(asDecimalString(value))).toBe(expected);
  });

  it('renders section cells as blank', () => {
    expect(formatFundingAmount(null)).toBe('');
  });

  it('centralizes hierarchy labels and row presentation classes', () => {
    const occ = requireRow(rows, 'occ');
    const margin = requireRow(rows, 'margin');
    const totalMargin = requireRow(rows, 'total-margin');
    const endOfDay = requireRow(rows, 'end-of-day');

    expect(formatFundingRowLabel(occ)).toBe('- OCC');
    expect(formatFundingRowLabel(margin)).toBe('Margin');
    expect(getFundingRowClass(margin)).toBe(FUNDING_GRID_ROW_CLASSES.section);
    expect(getFundingRowClass(totalMargin)).toBe(FUNDING_GRID_ROW_CLASSES.subtotal);
    expect(getFundingRowClass(endOfDay)).toBe(FUNDING_GRID_ROW_CLASSES.closingBalance);
  });

  it('marks negative amounts through the centralized cell policy', () => {
    expect(getFundingValueCellClasses(asDecimalString('-1.00'))).toEqual([
      FUNDING_GRID_CELL_CLASSES.numeric,
      FUNDING_GRID_CELL_CLASSES.negative,
    ]);
    expect(getFundingValueCellClasses(asDecimalString('1.00'))).toEqual([
      FUNDING_GRID_CELL_CLASSES.numeric,
    ]);
  });
});

function requireRow(rows: ReturnType<typeof toFundingGridViewModel>['rows'], rowId: string) {
  const row = rows.find(({ id }) => id === rowId);

  if (row === undefined) {
    throw new Error(`Missing row ${rowId}.`);
  }

  return row;
}
