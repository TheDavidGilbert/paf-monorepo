import { readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, it, expect, afterEach } from '@jest/globals';

import { writeUint16Array, writeUint32ArrayToFile } from './io.js';

describe('writeUint16Array', () => {
  it('should write uint16 values to buffer at specified offset', () => {
    const buffer = Buffer.alloc(10);
    const values = [100, 200, 300];

    writeUint16Array(buffer, 0, values);

    expect(buffer.readUInt16LE(0)).toBe(100);
    expect(buffer.readUInt16LE(2)).toBe(200);
    expect(buffer.readUInt16LE(4)).toBe(300);
  });

  it('should handle offset correctly', () => {
    const buffer = Buffer.alloc(10);
    const values = [42, 99];

    writeUint16Array(buffer, 4, values);

    expect(buffer.readUInt16LE(4)).toBe(42);
    expect(buffer.readUInt16LE(6)).toBe(99);
  });

  it('should handle maximum uint16 values', () => {
    const buffer = Buffer.alloc(4);
    const values = [0, 65535];

    writeUint16Array(buffer, 0, values);

    expect(buffer.readUInt16LE(0)).toBe(0);
    expect(buffer.readUInt16LE(2)).toBe(65535);
  });
});

describe('writeUint32ArrayToFile', () => {
  const testFile = join(tmpdir(), 'uint32-test.bin');

  afterEach(() => {
    try {
      unlinkSync(testFile);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should write uint32 array to file', () => {
    const data = new Uint32Array([100, 200, 300, 400]);

    writeUint32ArrayToFile(testFile, data);

    const buffer = readFileSync(testFile);
    expect(buffer.readUInt32LE(0)).toBe(100);
    expect(buffer.readUInt32LE(4)).toBe(200);
    expect(buffer.readUInt32LE(8)).toBe(300);
    expect(buffer.readUInt32LE(12)).toBe(400);
  });

  it('should handle empty arrays', () => {
    const data = new Uint32Array([]);

    writeUint32ArrayToFile(testFile, data);

    const buffer = readFileSync(testFile);
    expect(buffer.length).toBe(0);
  });

  it('should handle large values correctly', () => {
    const data = new Uint32Array([0, 4294967295, 2147483647]);

    writeUint32ArrayToFile(testFile, data);

    const buffer = readFileSync(testFile);
    expect(buffer.readUInt32LE(0)).toBe(0);
    expect(buffer.readUInt32LE(4)).toBe(4294967295);
    expect(buffer.readUInt32LE(8)).toBe(2147483647);
  });
});
