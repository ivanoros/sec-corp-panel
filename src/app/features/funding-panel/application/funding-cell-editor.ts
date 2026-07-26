import { normalizeDecimal, type DecimalString } from '../domain/decimal-value';

export type FundingCellValidation =
  | {
      readonly isValid: true;
      readonly value: DecimalString;
      readonly message: null;
    }
  | {
      readonly isValid: false;
      readonly value: null;
      readonly message: string;
    };

const UNSIGNED_AMOUNT_PATTERN = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{0,2})?$/;

/**
 * Accepts normal financial-entry forms while returning the canonical decimal
 * string required by the REST contract.
 */
export function validateFundingCellInput(rawValue: string): FundingCellValidation {
  const trimmedValue = rawValue.trim();

  if (trimmedValue.length === 0) {
    return invalid('Enter an amount.');
  }

  const isParenthesized = trimmedValue.startsWith('(') && trimmedValue.endsWith(')');
  const unwrappedValue = isParenthesized ? trimmedValue.slice(1, -1).trim() : trimmedValue;
  const signedValue = unwrappedValue.startsWith('$')
    ? unwrappedValue.slice(1).trim()
    : unwrappedValue;
  const isNegative = signedValue.startsWith('-');
  const unsignedValue = isNegative ? signedValue.slice(1) : signedValue;

  if (
    unsignedValue.length === 0 ||
    (isParenthesized && isNegative) ||
    !UNSIGNED_AMOUNT_PATTERN.test(unsignedValue)
  ) {
    return invalid('Use a number with no more than two decimal places.');
  }

  const normalizedInput = `${isParenthesized || isNegative ? '-' : ''}${unsignedValue.replaceAll(
    ',',
    '',
  )}`;

  try {
    return {
      isValid: true,
      value: normalizeDecimal(normalizedInput),
      message: null,
    };
  } catch {
    return invalid('Enter a valid finite amount.');
  }
}

function invalid(message: string): FundingCellValidation {
  return {
    isValid: false,
    value: null,
    message,
  };
}
