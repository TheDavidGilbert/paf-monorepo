/**
 * UK postcode validation regex (case-insensitive).
 * Accepts optional single space between outward and inward codes.
 */
const UK_POSTCODE_REGEX =
  /^(?:GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9A-HJKMNPR-Y]? ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

/**
 * Validate UK postcode format.
 */
export function isValidUkPostcode(postcode: string): boolean {
  return UK_POSTCODE_REGEX.test(postcode);
}

/**
 * Normalise a UK postcode to a 7-byte key for binary indexing.
 * - Uppercase
 * - Remove spaces
 * - Pad with spaces to exactly 7 characters
 * - Slice to 7 bytes
 */
export function normalisePostcodeForKey(postcode: string): string {
  const upper = postcode.toUpperCase().replace(/\s+/g, '');
  const padded = upper.padEnd(7, ' ');
  return padded.slice(0, 7);
}

/**
 * Convert a 7-byte postcode key back to a human-readable UK postcode string.
 * The inward code (last 3 chars of the trimmed key) is separated from the
 * outward code by a single space.
 * e.g. "SW1A1AA" → "SW1A 1AA", "PL11LR " → "PL1 1LR"
 */
export function formatPostcodeKey(key7: string): string {
  const trimmed = key7.trimEnd();
  const inward = trimmed.slice(-3);
  const outward = trimmed.slice(0, -3);
  return `${outward} ${inward}`;
}
