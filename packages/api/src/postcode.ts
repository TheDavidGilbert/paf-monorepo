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
