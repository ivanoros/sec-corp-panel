import { validateFundingCellInput } from './funding-cell-editor';

describe('validateFundingCellInput', () => {
  it.each([
    ['1,234.5', '1234.50'],
    ['($4,845,693.54)', '-4845693.54'],
    ['-0', '0.00'],
    ['$ 28,012,488.36', '28012488.36'],
  ])('normalizes %s to the REST decimal contract', (input, expected) => {
    expect(validateFundingCellInput(input)).toEqual({
      isValid: true,
      value: expected,
      message: null,
    });
  });

  it.each(['', '1,23.00', '12.345', '--1', '(1.00', 'Infinity'])(
    'rejects invalid input %j',
    (input) => {
      expect(validateFundingCellInput(input).isValid).toBe(false);
    },
  );
});
