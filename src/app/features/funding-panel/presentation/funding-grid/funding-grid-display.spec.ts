import { asDecimalString } from '../../domain/decimal-value';
import { createSecCorpReportFixture } from '../../panels/sec-corp/mocks/sec-corp-report.fixture';
import { toFundingGridViewModel } from '../funding-grid.viewmodel';
import {
  FUNDING_GRID_CELL_CLASSES,
  FUNDING_GRID_ROW_CLASSES,
  formatFundingAmount,
  formatFundingCellTooltip,
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
    const totalMargin = requireRow(rows, 'totalMargin');
    const endOfDay = requireRow(rows, 'endOfDay');

    expect(formatFundingRowLabel(occ)).toBe('- OCC');
    expect(formatFundingRowLabel(margin)).toBe('Margin');
    expect(getFundingRowClass(margin)).toBe(FUNDING_GRID_ROW_CLASSES.section);
    expect(getFundingRowClass(totalMargin)).toBe(FUNDING_GRID_ROW_CLASSES.subtotal);
    expect(getFundingRowClass(endOfDay)).toBe(FUNDING_GRID_ROW_CLASSES.closingBalance);
  });

  it('marks negative amounts through the centralized cell policy', () => {
    const negativeCell = {
      ...requireRow(rows, 'occ').cells.snapshot0830,
      value: asDecimalString('-1.00'),
    };
    const positiveCell = {
      ...negativeCell,
      value: asDecimalString('1.00'),
    };

    expect(getFundingValueCellClasses(negativeCell)).toEqual([
      FUNDING_GRID_CELL_CLASSES.numeric,
      FUNDING_GRID_CELL_CLASSES.negative,
      FUNDING_GRID_CELL_CLASSES.editable,
    ]);
    expect(getFundingValueCellClasses(positiveCell)).toEqual([
      FUNDING_GRID_CELL_CLASSES.numeric,
      FUNDING_GRID_CELL_CLASSES.editable,
    ]);
  });

  it('adds dirty, preview, and invalid state classes from the view model', () => {
    const cell = {
      ...requireRow(rows, 'occ').cells.snapshot0830,
      dirty: true,
      preview: true,
      validationMessage: 'Enter an amount.',
    };

    expect(getFundingValueCellClasses(cell)).toEqual(
      expect.arrayContaining([
        FUNDING_GRID_CELL_CLASSES.dirty,
        FUNDING_GRID_CELL_CLASSES.preview,
        FUNDING_GRID_CELL_CLASSES.invalid,
      ]),
    );
  });

  it('describes the original and current values for a dirty cell', () => {
    const cell = {
      ...requireRow(rows, 'occ').cells.snapshot0830,
      dirty: true,
      originalValue: asDecimalString('-308824714.48'),
      value: asDecimalString('123.00'),
    };

    expect(formatFundingCellTooltip('OCC', '8:30', cell)).toBe(
      ['Modified — not saved', 'OCC · 8:30', 'Original: (308,824,714.48)', 'Current: 123.00'].join(
        '\n',
      ),
    );
  });

  it('does not show a modification tooltip for an unchanged cell', () => {
    expect(
      formatFundingCellTooltip('OCC', '8:30', requireRow(rows, 'occ').cells.snapshot0830),
    ).toBeNull();
  });
});

function requireRow(rows: ReturnType<typeof toFundingGridViewModel>['rows'], rowId: string) {
  const row = rows.find(({ id }) => id === rowId);

  if (row === undefined) {
    throw new Error(`Missing row ${rowId}.`);
  }

  return row;
}
