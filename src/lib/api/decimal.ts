/**
 * Keeps decimal values as strings at the API boundary. Numeric compatibility
 * remains only for the current backend contract and is rejected once the
 * number could no longer be represented safely by JavaScript.
 */
const decimalPattern = /^-?\d+(?:\.\d+)?$/;

export function exactDecimalString(value: unknown): string | null {
  if (typeof value === "string" && decimalPattern.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
    return numberToDecimalString(value);
  }
  return null;
}

function numberToDecimalString(value: number): string {
  const raw = String(value);
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match) return raw;

  const [, sign, whole, fraction = "", exponentText] = match;
  const digits = `${whole}${fraction}`;
  const decimalIndex = whole.length + Number(exponentText);

  if (decimalIndex <= 0) return `${sign}0.${"0".repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length) return `${sign}${digits}${"0".repeat(decimalIndex - digits.length)}`;
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}
