import {
  asDecimalString,
  InvalidDecimalValueError,
  normalizeDecimal,
  sumDecimals,
  ZERO_DECIMAL,
} from './decimal-value';

describe('decimal values', () => {
  it('requires canonical API values with two decimal places', () => {
    expect(asDecimalString('-308824714.48')).toBe('-308824714.48');
    expect(() => asDecimalString('1.2')).toThrow(InvalidDecimalValueError);
    expect(() => asDecimalString('01.20')).toThrow(InvalidDecimalValueError);
  });

  it('normalizes values without binary floating-point arithmetic', () => {
    expect(normalizeDecimal('0.105')).toBe('0.11');
    expect(normalizeDecimal('-0')).toBe(ZERO_DECIMAL);
  });

  it('sums large financial values exactly', () => {
    expect(
      sumDecimals([
        asDecimalString('1912853090.48'),
        asDecimalString('342143518.25'),
        asDecimalString('189066447.07'),
        asDecimalString('56156376.00'),
      ]),
    ).toBe('2500219431.80');
  });
});
