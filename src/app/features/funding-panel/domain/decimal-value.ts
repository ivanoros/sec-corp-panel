import Decimal from 'decimal.js';

declare const decimalStringBrand: unique symbol;

export type DecimalString = string & {
  readonly [decimalStringBrand]: 'DecimalString';
};

const CANONICAL_DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)\.\d{2}$/;

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
});

export const ZERO_DECIMAL = asDecimalString('0.00');

export function asDecimalString(value: string): DecimalString {
  if (!CANONICAL_DECIMAL_PATTERN.test(value)) {
    throw new InvalidDecimalValueError(value);
  }

  return value === '-0.00' ? ('0.00' as DecimalString) : (value as DecimalString);
}

export function normalizeDecimal(value: string | Decimal): DecimalString {
  let decimal: Decimal;

  try {
    decimal = value instanceof Decimal ? value : new Decimal(value);
  } catch {
    throw new InvalidDecimalValueError(String(value));
  }

  if (!decimal.isFinite()) {
    throw new InvalidDecimalValueError(decimal.toString());
  }

  return asDecimalString(decimal.toFixed(2));
}

export function sumDecimals(values: readonly DecimalString[]): DecimalString {
  const total = values.reduce((sum, value) => sum.plus(value), new Decimal(ZERO_DECIMAL));

  return normalizeDecimal(total);
}

export function decimalValuesEqual(left: DecimalString, right: DecimalString): boolean {
  return new Decimal(left).equals(right);
}

export class InvalidDecimalValueError extends Error {
  constructor(readonly value: string) {
    super(`Invalid canonical decimal value: ${value}`);
    this.name = 'InvalidDecimalValueError';
  }
}
