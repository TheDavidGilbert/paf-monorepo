import { describe, it, expect } from '@jest/globals';

import { padUdprn } from './buildMR.js';

describe('padUdprn', () => {
  it('should zero-pad a short UDPRN to 8 characters', () => {
    expect(padUdprn('1234')).toBe('00001234');
    expect(padUdprn('1')).toBe('00000001');
    expect(padUdprn('12345678')).toBe('12345678');
  });

  it('should trim whitespace before padding', () => {
    expect(padUdprn('  1234  ')).toBe('00001234');
    expect(padUdprn(' 99')).toBe('00000099');
  });

  it('should handle an already 8-character UDPRN unchanged', () => {
    expect(padUdprn('00001234')).toBe('00001234');
    expect(padUdprn('99999999')).toBe('99999999');
  });

  it('should produce lexicographic order equal to numeric order', () => {
    const udprns = ['999', '1', '100', '20', '12345678'];
    const padded = udprns.map(padUdprn).sort();
    expect(padded).toEqual([
      '00000001',
      '00000020',
      '00000100',
      '00000999',
      '12345678',
    ]);
  });
});
