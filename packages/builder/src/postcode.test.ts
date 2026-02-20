import { describe, it, expect } from '@jest/globals';

import { normalisePostcodeForKey, hasHeader } from './postcode.js';

describe('normalisePostcodeForKey', () => {
  it('should normalise postcode to 7-byte key', () => {
    expect(normalisePostcodeForKey('PL1 1LR')).toBe('PL11LR ');
    expect(normalisePostcodeForKey('SW1A 1AA')).toBe('SW1A1AA');
    expect(normalisePostcodeForKey('M1 1AE')).toBe('M11AE  ');
  });

  it('should remove spaces and uppercase', () => {
    expect(normalisePostcodeForKey('pl1 1lr')).toBe('PL11LR ');
    expect(normalisePostcodeForKey('  PL1   1LR  ')).toBe('PL11LR ');
  });

  it('should pad short postcodes to 7 characters', () => {
    expect(normalisePostcodeForKey('M1')).toBe('M1     ');
    expect(normalisePostcodeForKey('ABC')).toBe('ABC    ');
  });

  it('should slice long postcodes to 7 characters', () => {
    expect(normalisePostcodeForKey('TOOLONGPOSTCODE')).toBe('TOOLONG');
  });

  it('should handle empty strings', () => {
    expect(normalisePostcodeForKey('')).toBe('       ');
  });
});

describe('hasHeader', () => {
  it('should detect header line with Postcode', () => {
    expect(hasHeader('Postcode,Post Town,Locality')).toBe(true);
    expect(hasHeader('"Postcode","Post Town","Locality"')).toBe(true);
    expect(hasHeader('  Postcode  ,Other,Fields')).toBe(true);
  });

  it('should not detect non-header lines', () => {
    expect(hasHeader('PL1 1AE,PLYMOUTH,Test')).toBe(false);
    expect(hasHeader('SW1A 1AA,LONDON,Westminster')).toBe(false);
    expect(hasHeader('Some,Other,Data')).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(hasHeader('')).toBe(false);
  });

  it('should be case-sensitive for Postcode', () => {
    expect(hasHeader('POSTCODE,Other')).toBe(false);
    expect(hasHeader('postcode,Other')).toBe(false);
  });
});
