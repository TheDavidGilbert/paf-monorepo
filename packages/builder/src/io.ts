import { writeFileSync } from 'node:fs';

/**
 * Write an array of uint16 values in little-endian order.
 */
export function writeUint16Array(buffer: Buffer, offset: number, values: number[]): number {
  let pos = offset;
  for (const val of values) {
    buffer.writeUInt16LE(val, pos);
    pos += 2;
  }
  return pos;
}

/**
 * Write a Uint32Array to a file.
 */
export function writeUint32ArrayToFile(filePath: string, arr: Uint32Array): void {
  const buffer = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  writeFileSync(filePath, buffer);
}

/**
 * Concatenate multiple buffers efficiently.
 */
export function concatBuffers(buffers: Buffer[]): Buffer {
  return Buffer.concat(buffers);
}
