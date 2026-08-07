import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';
import { validateFundingReport } from './report-validator';

describe('validateFundingReport user identity', () => {
  it('accepts system only for the initial version', () => {
    const report = {
      ...createSecCorpReportFixture(),
      version: 0,
      userId: 'system',
    };

    expect(validateFundingReport(report)).toEqual([]);
  });

  it('requires system for version 0', () => {
    const report = {
      ...createSecCorpReportFixture(),
      version: 0,
      userId: 'e70165',
    };

    expect(validateFundingReport(report)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_INITIAL_USER_ID', path: 'userId' }),
      ]),
    );
  });

  it('requires the actual updater above version 0', () => {
    const report = {
      ...createSecCorpReportFixture(),
      version: 1,
      userId: 'system',
    };

    expect(validateFundingReport(report)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_UPDATED_USER_ID', path: 'userId' }),
      ]),
    );
  });
});

describe('validateFundingReport row identity', () => {
  it('requires lower camel case row IDs', () => {
    const source = createSecCorpReportFixture();
    const report = {
      ...source,
      rows: source.rows.map((row, index) =>
        index === 0
          ? {
              ...row,
              id: 'sod-balance',
            }
          : row,
      ),
    };

    expect(validateFundingReport(report)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_ROW_ID_FORMAT', path: 'rows[0].id' }),
      ]),
    );
  });
});
