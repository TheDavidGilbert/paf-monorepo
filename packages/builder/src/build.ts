import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

import fieldsConfig from '../fields.config.json' with { type: 'json' };

import { parseConfig } from './config.js';
import { hasHeader, normalisePostcodeForKey } from './postcode.js';
import { computeChecksum } from './checksum.js';
import { writeUint16Array, writeUint32ArrayToFile } from './io.js';

interface FieldConfig {
  csvIndex: number;
  csvName: string;
  key: string;
}

const FIELDS: FieldConfig[] = fieldsConfig.fields;
const _FIELD_COUNT = FIELDS.length;

interface PostcodeRange {
  key: string;
  startRow: number;
  endRow: number;
}

interface AddressRow {
  postcodeKey: string;
  fieldValues: string[];
}

/**
 * Compare building numbers for sorting.
 * Alpha characters come first (A, B, C...), then numeric (1, 2, 10, 11...).
 * Handles mixed formats like "2a", "2b", "10a".
 */
function compareBuildingNumbers(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1; // Empty goes to end
  if (!b) return -1;

  // Extract numeric and alpha parts
  const aMatch = /^(\d*)([a-zA-Z]*)$/.exec(a);
  const bMatch = /^(\d*)([a-zA-Z]*)$/.exec(b);

  if (!aMatch || !bMatch) {
    return a.localeCompare(b);
  }

  const [, aNum, aAlpha] = aMatch;
  const [, bNum, bAlpha] = bMatch;

  // If both have alpha prefix/suffix
  if (aAlpha && bAlpha) {
    // Compare alpha first
    const alphaCompare = aAlpha.localeCompare(bAlpha);
    if (alphaCompare !== 0) return alphaCompare;
    // Then numeric
    if (aNum && bNum) {
      return parseInt(aNum, 10) - parseInt(bNum, 10);
    }
    return aNum ? 1 : -1;
  }

  // Alpha-only comes before numeric-only
  if (aAlpha && !bAlpha) return -1;
  if (!aAlpha && bAlpha) return 1;

  // Both numeric - compare numerically
  if (aNum && bNum) {
    return parseInt(aNum, 10) - parseInt(bNum, 10);
  }

  return 0;
}

async function main() {
  const config = parseConfig();
  console.log('Builder configuration:', config);

  // Ensure output directory exists
  mkdirSync(config.outputDir, { recursive: true });

  const rowsPath = join(config.outputDir, 'rows.bin');
  const rowStartPath = join(config.outputDir, 'rowStart.bin');
  const distinctPcKeyPath = join(config.outputDir, 'distinctPcKey.bin');
  const pcStartPath = join(config.outputDir, 'pcStart.bin');
  const pcEndPath = join(config.outputDir, 'pcEnd.bin');
  const schemaPath = join(config.outputDir, 'schema.json');
  const metaPath = join(config.outputDir, 'meta.json');

  // Collect all rows grouped by postcode
  const postcodeRowsMap = new Map<string, AddressRow[]>();
  let isFirstLine = true;

  const rl = createInterface({
    input: createReadStream(config.inputPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  console.log('Reading and grouping addresses by postcode...');

  for await (const line of rl) {
    // Skip header if present
    if (isFirstLine) {
      isFirstLine = false;
      if (hasHeader(line)) {
        console.log('Header detected, skipping first line.');
        continue;
      }
    }

    // Parse CSV line
    const tokens = parseCsvLine(line);
    if (tokens.length === 0) continue;

    // Extract the selected fields
    const fieldValues: string[] = [];
    for (const field of FIELDS) {
      const value = tokens[field.csvIndex] ?? '';
      fieldValues.push(value);
    }

    // Normalise postcode for indexing
    const postcodeRaw = fieldValues[0] ?? '';
    const postcodeKey = normalisePostcodeForKey(postcodeRaw);

    // Group by postcode
    if (!postcodeRowsMap.has(postcodeKey)) {
      postcodeRowsMap.set(postcodeKey, []);
    }
    const postcodeRows = postcodeRowsMap.get(postcodeKey);
    if (postcodeRows) {
      postcodeRows.push({ postcodeKey, fieldValues });
    }
  }

  console.log(`Grouped ${postcodeRowsMap.size} distinct postcodes`);
  console.log('Sorting addresses within each postcode...');

  // Sort rows within each postcode by building number/name
  // Building number is at index 6, building name is at index 7
  const buildingNumberIndex = 6;
  const buildingNameIndex = 7;

  for (const rows of postcodeRowsMap.values()) {
    rows.sort((a, b) => {
      const aBuildingNumber = a.fieldValues[buildingNumberIndex] || '';
      const bBuildingNumber = b.fieldValues[buildingNumberIndex] || '';
      const aBuildingName = a.fieldValues[buildingNameIndex] || '';
      const bBuildingName = b.fieldValues[buildingNameIndex] || '';

      // Primary sort by building number
      if (aBuildingNumber || bBuildingNumber) {
        const numberCompare = compareBuildingNumbers(aBuildingNumber, bBuildingNumber);
        if (numberCompare !== 0) return numberCompare;
      }

      // Secondary sort by building name if building numbers are equal/empty
      if (aBuildingName || bBuildingName) {
        return compareBuildingNumbers(aBuildingName, bBuildingName);
      }

      return 0;
    });
  }

  console.log('Writing sorted rows to binary files...');

  // Now write all sorted rows
  const rowsStream = createWriteStream(rowsPath);
  const rowStartArr: number[] = [];
  const postcodeMap = new Map<string, PostcodeRange>();

  let currentOffset = 0;
  let rowIndex = 0;

  // Sort postcodes alphabetically for consistent ordering
  const sortedPostcodeKeys = Array.from(postcodeRowsMap.keys()).sort();

  for (const postcodeKey of sortedPostcodeKeys) {
    const rows = postcodeRowsMap.get(postcodeKey);
    if (!rows) continue;
    const startRow = rowIndex;

    for (const row of rows) {
      // Encode row: 11 uint16 lengths + concatenated field bytes
      const fieldBuffers: Buffer[] = [];
      const lengths: number[] = [];

      for (const val of row.fieldValues) {
        const buf = Buffer.from(val, 'utf-8');
        fieldBuffers.push(buf);
        lengths.push(buf.length);
      }

      // Write header (11 x uint16 = 22 bytes)
      const headerBuf = Buffer.alloc(22);
      writeUint16Array(headerBuf, 0, lengths);
      rowsStream.write(headerBuf);

      // Write payload
      for (const buf of fieldBuffers) {
        rowsStream.write(buf);
      }

      // Record row start offset
      rowStartArr.push(currentOffset);
      currentOffset += 22 + fieldBuffers.reduce((sum, b) => sum + b.length, 0);
      rowIndex++;
    }

    const endRow = rowIndex;
    postcodeMap.set(postcodeKey, { key: postcodeKey, startRow, endRow });
  }

  rowsStream.end();
  await new Promise<void>((resolve) => rowsStream.on('finish', () => resolve()));

  console.log(`Processed ${rowIndex} rows.`);
  console.log(`Distinct postcodes: ${postcodeMap.size}`);

  // Sort distinct postcodes by key
  const sortedPostcodes = Array.from(postcodeMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );

  // Write rowStart.bin
  const rowStartU32 = new Uint32Array(rowStartArr);
  writeUint32ArrayToFile(rowStartPath, rowStartU32);

  // Write distinctPcKey.bin (7 bytes per key)
  const distinctPcKeyBuf = Buffer.alloc(sortedPostcodes.length * 7);
  for (let i = 0; i < sortedPostcodes.length; i++) {
    const key = sortedPostcodes[i].key;
    distinctPcKeyBuf.write(key, i * 7, 7, 'utf-8');
  }
  writeFileSync(distinctPcKeyPath, distinctPcKeyBuf);

  // Write pcStart.bin and pcEnd.bin
  const pcStartU32 = new Uint32Array(sortedPostcodes.map((p) => p.startRow));
  const pcEndU32 = new Uint32Array(sortedPostcodes.map((p) => p.endRow));
  writeUint32ArrayToFile(pcStartPath, pcStartU32);
  writeUint32ArrayToFile(pcEndPath, pcEndU32);

  // Write schema.json
  const schema = {
    format: 'compact-rows/v1',
    fieldOrder: FIELDS.map((f) => f.key),
    fields: FIELDS.map((f) => ({
      key: f.key,
      csvName: f.csvName,
      csvIndex: f.csvIndex,
    })),
  };
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

  // Compute checksums
  const checksums: Record<string, string> = {};
  for (const [name, path] of [
    ['rows.bin', rowsPath],
    ['rowStart.bin', rowStartPath],
    ['distinctPcKey.bin', distinctPcKeyPath],
    ['pcStart.bin', pcStartPath],
    ['pcEnd.bin', pcEndPath],
    ['schema.json', schemaPath],
  ]) {
    checksums[name] = await computeChecksum(path);
  }

  // Write meta.json
  const meta = {
    version: config.version,
    builtAt: new Date().toISOString(),
    format: 'compact-rows/v1',
    rows: rowIndex,
    distinctPostcodes: postcodeMap.size,
    fieldOrder: FIELDS.map((f) => f.key),
    checksums,
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  checksums['meta.json'] = await computeChecksum(metaPath);

  console.log('Build complete!');
  console.log(`Output directory: ${config.outputDir}`);
  console.log('Files created:');
  console.log('  - rows.bin');
  console.log('  - rowStart.bin');
  console.log('  - distinctPcKey.bin');
  console.log('  - pcStart.bin');
  console.log('  - pcEnd.bin');
  console.log('  - schema.json');
  console.log('  - meta.json');
}

/**
 * Simple CSV line parser.
 * Handles quotes on the first field; assumes no embedded commas in kept fields.
 */
function parseCsvLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === ',' && !inQuotes) {
      tokens.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  tokens.push(current.trim());
  return tokens;
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
