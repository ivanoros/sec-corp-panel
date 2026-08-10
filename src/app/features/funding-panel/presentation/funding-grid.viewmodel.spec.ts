import { asDecimalString } from '../domain/decimal-value';
import { recalculateFundingReport } from '../domain/report-calculator';
import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';
import { toFundingGridViewModel } from './funding-grid.viewmodel';

describe('toFundingGridViewModel', () => {
  it('maps only editable-period input cells as editable', () => {
    const baselineReport = createSecCorpReportFixture();
    const previewReport = recalculateFundingReport({
      ...baselineReport,
      rows: baselineReport.rows.map((row) =>
        row.id === 'occ'
          ? {
              ...row,
              values: { ...row.values, snapshot0830: asDecimalString('-300000000.00') },
            }
          : row,
      ),
    });
    const viewModel = toFundingGridViewModel(
      previewReport,
      {
        occ: {
          snapshot0830: asDecimalString('-300000000.00'),
        },
      },
      {
        rowId: 'occ',
        periodId: 'snapshot0830',
        validationMessage: null,
      },
      baselineReport,
    );
    const occ = requireRow(viewModel.rows, 'occ');
    const totalMargin = requireRow(viewModel.rows, 'totalMargin');

    expect(occ.cells.snapshot0830).toMatchObject({
      dirty: true,
      editable: true,
      originalValue: '-308824714.48',
      preview: true,
      value: '-300000000.00',
    });
    expect(occ.cells.live.editable).toBe(false);
    expect(occ.cells.opportunityFunding.editable).toBe(true);
    expect(totalMargin.cells.snapshot0830.editable).toBe(false);
    expect(totalMargin.cells.opportunityFunding.editable).toBe(false);
  });

  it('carries active validation to only the edited cell', () => {
    const viewModel = toFundingGridViewModel(
      createSecCorpReportFixture(),
      {},
      {
        rowId: 'nscc',
        periodId: 'snapshot1130',
        validationMessage: 'Enter an amount.',
      },
    );

    expect(requireRow(viewModel.rows, 'nscc').cells.snapshot1130.validationMessage).toBe(
      'Enter an amount.',
    );
    expect(requireRow(viewModel.rows, 'nscc').cells.snapshot0830.validationMessage).toBeNull();
  });
});

function requireRow(rows: ReturnType<typeof toFundingGridViewModel>['rows'], rowId: string) {
  const row = rows.find(({ id }) => id === rowId);

  if (row === undefined) {
    throw new Error(`Missing row ${rowId}.`);
  }

  return row;
}
