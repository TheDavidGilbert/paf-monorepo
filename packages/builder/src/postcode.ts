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
 * Check if the first line is a header row.
 * We check if the first token (up to first comma) is "Postcode".
 */
export function hasHeader(firstLine: string): boolean {
  const firstToken = firstLine.split(',')[0]?.trim().replace(/^"|"$/g, '');
  return firstToken === 'Postcode';
}
