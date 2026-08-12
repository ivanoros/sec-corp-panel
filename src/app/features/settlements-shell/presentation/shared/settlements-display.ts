export function formatDashboardAmount(value: string, fractionDigits = 0): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  const formatted = Math.abs(numericValue).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return numericValue < 0 ? `(${formatted})` : formatted;
}
