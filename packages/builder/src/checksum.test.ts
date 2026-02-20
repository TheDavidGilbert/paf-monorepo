import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, it, expect, afterAll } from '@jest/globals';

import { computeChecksum } from './checksum.js';

describe('computeChecksum', () => {
  const testFile = join(tmpdir(), 'checksum-test.txt');

  afterAll(() => {
    try {
      unlinkSync(testFile);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should compute SHA-256 checksum for a file', async () => {
    writeFileSync(testFile, 'Hello, World!');

    const checksum = await computeChecksum(testFile);

    // SHA-256 of "Hello, World!"
    expect(checksum).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  });

  it('should compute different checksums for different content', async () => {
    writeFileSync(testFile, 'Content A');
    const checksumA = await computeChecksum(testFile);

    writeFileSync(testFile, 'Content B');
    const checksumB = await computeChecksum(testFile);

    expect(checksumA).not.toBe(checksumB);
  });

  it('should compute same checksum for same content', async () => {
    const content = 'Test content for consistency';

    writeFileSync(testFile, content);
    const checksum1 = await computeChecksum(testFile);

    writeFileSync(testFile, content);
    const checksum2 = await computeChecksum(testFile);

    expect(checksum1).toBe(checksum2);
  });

  it('should handle empty files', async () => {
    writeFileSync(testFile, '');

    const checksum = await computeChecksum(testFile);

    // SHA-256 of empty string
    expect(checksum).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
