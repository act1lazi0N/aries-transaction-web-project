export function formatMoney(value: string, currency: string) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return `${value} ${currency}`;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integer, fraction = ""] = unsigned.split(".");
  if (fraction.length > 20) return `${value} ${currency}`;
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: fraction.length,
      maximumFractionDigits: fraction.length,
    });
    const parts = formatter.formatToParts(negative ? -1 : 0);
    return parts.map(part => part.type === "integer" ? integer.replace(/^0+(?=\d)/, "") : part.type === "fraction" ? fraction : part.value).join("");
  } catch {
    return `${value} ${currency}`;
  }
}

export function formatAccountType(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
}
