/**
 * Keeps decimal values as strings at the API boundary. Numeric compatibility
 * remains only for the current backend contract and is rejected once the
 * number could no longer be represented safely by JavaScript.
 */
const decimalPattern = /^-?\d+(?:\.\d+)?$/;

export function exactDecimalString(value: unknown): string | null {
  if (typeof value === "string" && decimalPattern.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) return String(value);
  return null;
}
