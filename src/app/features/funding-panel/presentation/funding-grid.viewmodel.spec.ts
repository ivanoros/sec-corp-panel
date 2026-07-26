import { asDecimalString } from '../domain/decimal-value';
import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';
import { toFundingGridViewModel } from './funding-grid.viewmodel';

describe('toFundingGridViewModel', () => {
  it('maps domain rows without making calculated or live values editable', () => {
    const viewModel = toFundingGridViewModel(
      createSecCorpReportFixture(),
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
    );
    const occ = requireRow(viewModel.rows, 'occ');
    const totalMargin = requireRow(viewModel.rows, 'total-margin');

    expect(occ.cells.snapshot0830).toMatchObject({
      dirty: true,
      editable: true,
      preview: true,
    });
    expect(occ.cells.live.editable).toBe(false);
    expect(occ.cells.opportunityFunding.editable).toBe(false);
    expect(totalMargin.cells.snapshot0830.editable).toBe(false);
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
