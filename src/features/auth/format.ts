export function formatUserRole(value: string) {
  const words = value.trim().toLowerCase().split(/[_\s-]+/u).filter(Boolean);
  if (words.length === 0) return "Unknown";
  return words.map((word, index) => index === 0 ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word).join(" ");
}
