export function newPasswordError(password: string): string | null {
  // Java String.length and JS length both count UTF-16 code units. Do not trim.
  const blank = Array.from(password).every(character => {
    // Match Java Character.isWhitespace, including its non-breaking exclusions.
    const code = character.charCodeAt(0);
    return (code >= 9 && code <= 13) || (code >= 28 && code <= 32)
      || (code >= 0x2000 && code <= 0x2006) || (code >= 0x2008 && code <= 0x200a)
      || [0x1680, 0x2028, 0x2029, 0x205f, 0x3000].includes(code);
  });
  if (blank || password.length < 8 || new TextEncoder().encode(password).length > 72) {
    return "Use at least 8 characters and at most 72 UTF-8 bytes. Some characters use more than one byte.";
  }
  return null;
}
