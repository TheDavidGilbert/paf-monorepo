import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Address, MRRecord, Meta, Schema } from './types.js';
import { formatPostcodeKey } from './postcode.js';

interface Dataset {
  rows: Buffer;
  rowStart: Uint32Array;
  distinctPcKey: Buffer;
  pcStart: Uint32Array;
  pcEnd: Uint32Array;
  schema: Schema;
  meta: Meta;
}

interface MRDataset {
  mrRows: Buffer;
  mrRowStart: Uint32Array;
  mrUdprn: Buffer;
  mrStart: Uint32Array;
  mrEnd: Uint32Array;
}

/** Fixed byte width for each thoroughfare key in thoroughfareKeys.bin. Must match builder. */
const THOROUGHFARE_KEY_WIDTH = 80;

interface ThoroughfareDataset {
  thoroughfareKeys: Buffer; // N × THOROUGHFARE_KEY_WIDTH bytes, space-padded, sorted
  thoroughfareStart: Uint32Array; // N uint32s — start index in thoroughfareSortedRows
  thoroughfareEnd: Uint32Array; // N uint32s — end index (exclusive) in thoroughfareSortedRows
  thoroughfareSortedRows: Uint32Array; // M uint32s — row indices sorted by thoroughfare then buildingNumber
}

let dataset: Dataset | null = null;
let mrDataset: MRDataset | null = null;
let thoroughfareDataset: ThoroughfareDataset | null = null;

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

  // Read field lengths from header (fieldCount x uint16)
  const fieldCount = ds.schema.fieldOrder.length;
  const lengths: number[] = [];
  for (let i = 0; i < fieldCount; i++) {
    lengths.push(ds.rows.readUInt16LE(offset + i * 2));
  }

  // Read field payloads
  let payloadOffset = offset + fieldCount * 2;
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
    poBox: fieldValues[9] ?? '',
    departmentName: fieldValues[10] ?? '',
    organisationName: fieldValues[11] ?? '',
    udprn: fieldValues[12] ?? '',
    postcodeType: fieldValues[13] ?? '',
    suOrganisationIndicator: fieldValues[14] ?? '',
    deliveryPointSuffix: fieldValues[15] ?? '',
  };

  return address;
}

// ---------------------------------------------------------------------------
// Multiple Residence (MR) support
// ---------------------------------------------------------------------------

/**
 * Load Multiple Residence binary files into memory, if present.
 * If the files are absent (dataset was built without MR data), this is a no-op.
 */
export function loadMRDataset(dataDir: string): void {
  const mrUdprnPath = join(dataDir, 'mrUdprn.bin');

  if (!existsSync(mrUdprnPath)) {
    console.log('No MR dataset found — Multiple Residence expansion disabled.');
    return;
  }

  console.log('Loading Multiple Residence dataset...');

  const mrRows = readFileSync(join(dataDir, 'mrRows.bin'));
  const mrRowStartBuf = readFileSync(join(dataDir, 'mrRowStart.bin'));
  const mrUdprn = readFileSync(mrUdprnPath);
  const mrStartBuf = readFileSync(join(dataDir, 'mrStart.bin'));
  const mrEndBuf = readFileSync(join(dataDir, 'mrEnd.bin'));

  mrDataset = {
    mrRows,
    mrRowStart: new Uint32Array(
      mrRowStartBuf.buffer,
      mrRowStartBuf.byteOffset,
      mrRowStartBuf.byteLength / 4
    ),
    mrUdprn,
    mrStart: new Uint32Array(mrStartBuf.buffer, mrStartBuf.byteOffset, mrStartBuf.byteLength / 4),
    mrEnd: new Uint32Array(mrEndBuf.buffer, mrEndBuf.byteOffset, mrEndBuf.byteLength / 4),
  };

  const distinctUdprns = mrUdprn.length / 8;
  console.log(`MR dataset loaded: ${distinctUdprns} UDPRNs with MR records`);
}

/**
 * Returns true if MR data was loaded successfully.
 */
export function hasMRData(): boolean {
  return mrDataset !== null;
}

/**
 * Zero-pad a UDPRN string to exactly 8 characters for binary search.
 * e.g. "1234" → "00001234"
 */
export function padUdprn(udprn: string): string {
  return udprn.trim().padStart(8, '0');
}

/**
 * Binary search for a zero-padded 8-byte UDPRN key in mrUdprn buffer.
 * Returns [startRow, endRow] if found, or null if not found.
 */
export function findMRRange(udprn8: string): [number, number] | null {
  if (!mrDataset) return null;

  const keyBuf = Buffer.from(udprn8, 'utf-8');
  let left = 0;
  let right = mrDataset.mrUdprn.length / 8 - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midKey = mrDataset.mrUdprn.subarray(mid * 8, mid * 8 + 8);
    const cmp = keyBuf.compare(midKey);

    if (cmp === 0) {
      return [mrDataset.mrStart[mid], mrDataset.mrEnd[mid]];
    } else if (cmp < 0) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Prefix search
// ---------------------------------------------------------------------------

/**
 * Search for distinct postcodes whose binary key begins with the given prefix.
 *
 * `prefix` must be already normalised: uppercase, no spaces, 1–7 characters.
 * Uses a binary search to locate the first matching key in `distinctPcKey`,
 * then scans forward collecting up to `limit` results.
 *
 * Because keys are stored as 7-byte space-padded strings sorted
 * lexicographically, padding the prefix with spaces (ASCII 32, which is less
 * than any digit or letter) guarantees that the binary search lands at the
 * first key that begins with `prefix`.
 *
 * Returns formatted postcodes (e.g. "SW1A 1AA") rather than raw keys.
 */
export function searchPostcodePrefix(prefix: string, limit: number): string[] {
  const ds = getDataset();
  const totalKeys = ds.distinctPcKey.length / 7;
  const results: string[] = [];

  if (totalKeys === 0 || prefix.length === 0) return results;

  // Pad the prefix to 7 bytes with spaces so binary search finds the first
  // key >= "prefix" (e.g. "SW1A   " < "SW1A1AA" because space < '1').
  const searchKey = prefix.padEnd(7, ' ');
  const searchBuf = Buffer.from(searchKey, 'utf-8');

  // Binary search: find the smallest index where key >= searchKey.
  let left = 0;
  let right = totalKeys - 1;
  let startIndex = totalKeys; // sentinel: "not found"

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midKey = ds.distinctPcKey.subarray(mid * 7, mid * 7 + 7);

    if (searchBuf.compare(midKey) <= 0) {
      startIndex = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  // Linear scan from startIndex, collecting keys that start with the prefix.
  for (let i = startIndex; i < totalKeys && results.length < limit; i++) {
    const keyBuf = ds.distinctPcKey.subarray(i * 7, i * 7 + 7);
    const keyStr = keyBuf.toString('utf-8');

    if (!keyStr.startsWith(prefix)) break;

    results.push(formatPostcodeKey(keyStr));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Street (thoroughfare) index
// ---------------------------------------------------------------------------

/**
 * Load the secondary thoroughfare index from the four binary files written by
 * the builder. This is optional — only call it when ENABLE_STREET_INDEX=true.
 * If the files are absent this throws; callers should treat the error as non-fatal.
 */
export function loadThoroughfareIndex(dataDir: string): void {
  console.log('Loading thoroughfare (street) index...');

  const keysBuf = readFileSync(join(dataDir, 'thoroughfareKeys.bin'));
  const startBuf = readFileSync(join(dataDir, 'thoroughfareStart.bin'));
  const endBuf = readFileSync(join(dataDir, 'thoroughfareEnd.bin'));
  const sortedRowsBuf = readFileSync(join(dataDir, 'thoroughfareSortedRows.bin'));

  thoroughfareDataset = {
    thoroughfareKeys: keysBuf,
    thoroughfareStart: new Uint32Array(
      startBuf.buffer,
      startBuf.byteOffset,
      startBuf.byteLength / 4
    ),
    thoroughfareEnd: new Uint32Array(endBuf.buffer, endBuf.byteOffset, endBuf.byteLength / 4),
    thoroughfareSortedRows: new Uint32Array(
      sortedRowsBuf.buffer,
      sortedRowsBuf.byteOffset,
      sortedRowsBuf.byteLength / 4
    ),
  };

  const distinctCount = keysBuf.length / THOROUGHFARE_KEY_WIDTH;
  console.log(`Thoroughfare index loaded: ${distinctCount} distinct thoroughfares`);
}

/**
 * Returns true if the thoroughfare index has been loaded.
 */
export function hasThoroughfareIndex(): boolean {
  return thoroughfareDataset !== null;
}

/**
 * Search for addresses by thoroughfare prefix and optional building number / town filters.
 *
 * @param thoroughfarePrefix  Normalised (uppercase, trimmed) thoroughfare prefix, min 3 chars.
 * @param buildingNumber      Optional building number prefix to filter on (uppercase, trimmed).
 * @param town                Optional post town to filter on (uppercase, trimmed).
 * @param limit               Maximum number of Address records to return.
 *
 * Uses binary search to find the first thoroughfare key ≥ the prefix, then scans
 * forward collecting addresses from each matching thoroughfare's sorted row range
 * until the result limit is reached.
 */
export function searchByAddressPrefix(
  thoroughfarePrefix: string,
  buildingNumber: string | null,
  town: string | null,
  limit: number
): Address[] {
  if (!thoroughfareDataset) throw new Error('Thoroughfare index not loaded');

  const tf = thoroughfareDataset;
  const totalKeys = tf.thoroughfareKeys.length / THOROUGHFARE_KEY_WIDTH;
  const results: Address[] = [];

  if (totalKeys === 0) return results;

  // Pad prefix with spaces to full key width so binary search finds the
  // first stored key that is >= the padded prefix (space < any letter/digit).
  const searchKey = thoroughfarePrefix.padEnd(THOROUGHFARE_KEY_WIDTH, ' ');
  const searchBuf = Buffer.from(searchKey, 'utf-8');

  // Binary search: find the smallest index i where thoroughfareKeys[i] >= searchBuf.
  let left = 0;
  let right = totalKeys - 1;
  let startIndex = totalKeys; // sentinel

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midKey = tf.thoroughfareKeys.subarray(
      mid * THOROUGHFARE_KEY_WIDTH,
      (mid + 1) * THOROUGHFARE_KEY_WIDTH
    );
    if (searchBuf.compare(midKey) <= 0) {
      startIndex = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  // Scan forward through all thoroughfare keys that start with the prefix.
  for (let i = startIndex; i < totalKeys && results.length < limit; i++) {
    const keyBuf = tf.thoroughfareKeys.subarray(
      i * THOROUGHFARE_KEY_WIDTH,
      (i + 1) * THOROUGHFARE_KEY_WIDTH
    );

    // Check the first `prefix.length` bytes match (no trimEnd needed).
    const keyPrefix = keyBuf.toString('utf-8', 0, thoroughfarePrefix.length);
    if (keyPrefix !== thoroughfarePrefix) break;

    // Walk this thoroughfare's sorted row range.
    const rowStart = tf.thoroughfareStart[i];
    const rowEnd = tf.thoroughfareEnd[i];

    for (let j = rowStart; j < rowEnd && results.length < limit; j++) {
      const rowIndex = tf.thoroughfareSortedRows[j];
      const address = decodeRow(rowIndex);

      // Filter: building number prefix match (e.g. "38" matches "38", "38A", "38B")
      if (buildingNumber && !address.buildingNumber.startsWith(buildingNumber)) continue;

      // Filter: exact post town match
      if (town && address.postTown !== town) continue;

      results.push(address);
    }
  }

  return results;
}

/**
 * Decode a single MR row at the given row index.
 * MR row format: [4 × uint16 field lengths (8 bytes)] + [variable UTF-8 payloads]
 * Fields: buildingNumber, buildingName, subBuildingName, umprn
 */
export function decodeMRRow(rowIndex: number): MRRecord {
  if (!mrDataset) throw new Error('MR dataset not loaded');

  const offset = mrDataset.mrRowStart[rowIndex];

  // Read 4 uint16 lengths (8 bytes)
  const lengths: number[] = [];
  for (let i = 0; i < 4; i++) {
    lengths.push(mrDataset.mrRows.readUInt16LE(offset + i * 2));
  }

  let payloadOffset = offset + 8;
  const fieldValues: string[] = [];

  for (const len of lengths) {
    if (len === 0) {
      fieldValues.push('');
    } else {
      fieldValues.push(
        mrDataset.mrRows.subarray(payloadOffset, payloadOffset + len).toString('utf-8')
      );
      payloadOffset += len;
    }
  }

  return {
    buildingNumber: fieldValues[0] ?? '',
    buildingName: fieldValues[1] ?? '',
    subBuildingName: fieldValues[2] ?? '',
    umprn: fieldValues[3] ?? '',
  };
}
