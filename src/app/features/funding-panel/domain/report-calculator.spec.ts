import { asDecimalString } from './decimal-value';
import type { FundingReport } from './funding-report';
import { recalculateFundingReport } from './report-calculator';
import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';

describe('recalculateFundingReport', () => {
  it('updates dependent subtotals and end of day from an input change', () => {
    const report = createSecCorpReportFixture();
    const editedReport: FundingReport = {
      ...report,
      rows: report.rows.map((row) =>
        row.id === 'occ'
          ? {
              ...row,
              values: {
                ...row.values,
                snapshot0830: asDecimalString('-300000000.00'),
              },
            }
          : row,
      ),
    };

    const recalculated = recalculateFundingReport(editedReport);

    expect(findRow(recalculated, 'totalMargin').values.snapshot0830).toBe('-210403134.64');
    expect(findRow(recalculated, 'endOfDay').values.snapshot0830).toBe('4811063538.31');
  });
});

function findRow(report: FundingReport, rowId: string) {
  const row = report.rows.find(({ id }) => id === rowId);

  if (row === undefined) {
    throw new Error(`Missing test row ${rowId}.`);
  }

  return row;
}
