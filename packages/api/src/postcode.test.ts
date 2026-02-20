import { describe, it, expect } from '@jest/globals';

import { isValidUkPostcode, normalisePostcodeForKey } from './postcode.js';

describe('isValidUkPostcode', () => {
  it('should validate correct UK postcodes', () => {
    expect(isValidUkPostcode('SW1A 1AA')).toBe(true);
    expect(isValidUkPostcode('PL1 1LR')).toBe(true);
    expect(isValidUkPostcode('M1 1AE')).toBe(true);
    expect(isValidUkPostcode('B33 8TH')).toBe(true);
    expect(isValidUkPostcode('CR2 6XH')).toBe(true);
    expect(isValidUkPostcode('DN55 1PT')).toBe(true);
  });

  it('should validate postcodes without spaces', () => {
    expect(isValidUkPostcode('SW1A1AA')).toBe(true);
    expect(isValidUkPostcode('PL11LR')).toBe(true);
    expect(isValidUkPostcode('M11AE')).toBe(true);
  });

  it('should validate special case GIR 0AA', () => {
    expect(isValidUkPostcode('GIR 0AA')).toBe(true);
    expect(isValidUkPostcode('GIR0AA')).toBe(true);
  });

  it('should reject invalid postcodes', () => {
    expect(isValidUkPostcode('INVALID')).toBe(false);
    expect(isValidUkPostcode('12345')).toBe(false);
    expect(isValidUkPostcode('')).toBe(false);
    expect(isValidUkPostcode('XXX XXX')).toBe(false);
    expect(isValidUkPostcode('A')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(isValidUkPostcode('sw1a 1aa')).toBe(true);
    expect(isValidUkPostcode('Pl1 1Lr')).toBe(true);
  });
});

describe('normalisePostcodeForKey', () => {
  it('should normalise postcode to 7-byte key', () => {
    expect(normalisePostcodeForKey('PL1 1LR')).toBe('PL11LR ');
    expect(normalisePostcodeForKey('SW1A 1AA')).toBe('SW1A1AA');
    expect(normalisePostcodeForKey('M1 1AE')).toBe('M11AE  ');
  });

  it('should remove spaces and uppercase', () => {
    expect(normalisePostcodeForKey('pl1 1lr')).toBe('PL11LR ');
    expect(normalisePostcodeForKey('  sw1a   1aa  ')).toBe('SW1A1AA');
  });

  it('should pad short postcodes to 7 characters', () => {
    expect(normalisePostcodeForKey('M1')).toBe('M1     ');
    expect(normalisePostcodeForKey('ABC')).toBe('ABC    ');
  });

  it('should slice long postcodes to 7 characters', () => {
    expect(normalisePostcodeForKey('TOOLONGPOSTCODE')).toBe('TOOLONG');
  });
});
