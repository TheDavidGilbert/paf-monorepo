import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Address, Meta, Schema } from './types.js';

interface Dataset {
  rows: Buffer;
  rowStart: Uint32Array;
  distinctPcKey: Buffer;
  pcStart: Uint32Array;
  pcEnd: Uint32Array;
  schema: Schema;
  meta: Meta;
}

let dataset: Dataset | null = null;

/**
 * Load binary assets into memory synchronously.
 */
export function loadDataset(dataDir: string): void {
  console.log(`Loading dataset from: ${dataDir}`);

  const rows = readFileSync(join(dataDir, 'rows.bin'));
  const rowStartBuf = readFileSync(join(dataDir, 'rowStart.bin'));
  const distinctPcKey = readFileSync(join(dataDir, 'distinctPcKey.bin'));
  const pcStartBuf = readFileSync(join(dataDir, 'pcStart.bin'));
  const pcEndBuf = readFileSync(join(dataDir, 'pcEnd.bin'));
  const schema = JSON.parse(readFileSync(join(dataDir, 'schema.json'), 'utf-8')) as Schema;
  const meta = JSON.parse(readFileSync(join(dataDir, 'meta.json'), 'utf-8')) as Meta;

  // Convert Buffer to Uint32Array
  const rowStart = new Uint32Array(
    rowStartBuf.buffer,
    rowStartBuf.byteOffset,
    rowStartBuf.byteLength / 4
  );
  const pcStart = new Uint32Array(
    pcStartBuf.buffer,
    pcStartBuf.byteOffset,
    pcStartBuf.byteLength / 4
  );
  const pcEnd = new Uint32Array(pcEndBuf.buffer, pcEndBuf.byteOffset, pcEndBuf.byteLength / 4);

  dataset = {
    rows,
    rowStart,
    distinctPcKey,
    pcStart,
    pcEnd,
    schema,
    meta,
  };

  console.log(`Dataset loaded: ${meta.rows} rows, ${meta.distinctPostcodes} distinct postcodes`);
  console.log(`Built at: ${meta.builtAt}, version: ${meta.version}`);
}

/**
 * Get the loaded dataset.
 */
export function getDataset(): Dataset {
  if (!dataset) {
    throw new Error('Dataset not loaded');
  }
  return dataset;
}

/**
 * Binary search for a 7-byte postcode key in distinctPcKey buffer.
 * Returns the index if found, or -1 if not found.
 */
export function findPostcodeRange(key7: string): [number, number] | null {
  const ds = getDataset();
  const keyBuf = Buffer.from(key7, 'utf-8');

  let left = 0;
  let right = ds.distinctPcKey.length / 7 - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midKey = ds.distinctPcKey.subarray(mid * 7, mid * 7 + 7);

    const cmp = keyBuf.compare(midKey);

    if (cmp === 0) {
      // Found
      return [ds.pcStart[mid], ds.pcEnd[mid]];
    } else if (cmp < 0) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return null;
}

/**
 * Decode a single row at the given row index.
 */
export function decodeRow(rowIndex: number): Address {
  const ds = getDataset();
  const offset = ds.rowStart[rowIndex];

  // Read 11 uint16 lengths (22 bytes)
  const lengths: number[] = [];
  for (let i = 0; i < 11; i++) {
    lengths.push(ds.rows.readUInt16LE(offset + i * 2));
  }

  // Read field payloads
  let payloadOffset = offset + 22;
  const fieldValues: string[] = [];

  for (const len of lengths) {
    if (len === 0) {
      fieldValues.push('');
    } else {
      const fieldBuf = ds.rows.subarray(payloadOffset, payloadOffset + len);
      fieldValues.push(fieldBuf.toString('utf-8'));
      payloadOffset += len;
    }
  }

  // Map to Address object using schema field order
  const address: Address = {
    postcode: fieldValues[0] ?? '',
    postTown: fieldValues[1] ?? '',
    dependentLocality: fieldValues[2] ?? '',
    doubleDependentLocality: fieldValues[3] ?? '',
    thoroughfare: fieldValues[4] ?? '',
    dependentThoroughfare: fieldValues[5] ?? '',
    buildingNumber: fieldValues[6] ?? '',
    buildingName: fieldValues[7] ?? '',
    subBuildingName: fieldValues[8] ?? '',
    udprn: fieldValues[9] ?? '',
    deliveryPointSuffix: fieldValues[10] ?? '',
  };

  return address;
}
