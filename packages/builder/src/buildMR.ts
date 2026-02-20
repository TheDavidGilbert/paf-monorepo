import { createReadStream, createWriteStream, existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

import { computeChecksum } from './checksum.js';
import { writeUint16Array, writeUint32ArrayToFile } from './io.js';

/** Expected path of the MR CSV relative to the input base directory. */
const MR_RELATIVE_PATH = join('CSV MULRES', 'CSV Multiple Residence.csv');

/** Fields extracted from each MR row (indices into the CSV). */
const MR_FIELD_COUNT = 4;
const COL_UDPRN = 11;
const COL_BUILDING_NUMBER = 15;
const COL_BUILDING_NAME = 16;
const COL_SUB_BUILDING_NAME = 17;
const COL_UMPRN = 20;

interface MRRow {
  buildingNumber: string;
  buildingName: string;
  subBuildingName: string;
  umprn: string;
}

export interface MRBuildResult {
  rows: number;
  distinctUdprns: number;
  checksums: Record<string, string>;
}

/**
 * Zero-pad a UDPRN string to exactly 8 characters.
 * Enables lexicographic comparison to equal numeric order during binary search.
 * e.g. "1234" → "00001234"
 */
export function padUdprn(udprn: string): string {
  return udprn.trim().padStart(8, '0');
}

/**
 * Compare building numbers/names for sorting.
 * Alpha strings come first, then numeric. Handles mixed formats like "2a", "2b", "10a".
 * (Mirrors the compareBuildingNumbers function in build.ts.)
 */
function compareBuildingNumbers(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aMatch = /^(\d*)([a-zA-Z]*)$/.exec(a);
  const bMatch = /^(\d*)([a-zA-Z]*)$/.exec(b);

  if (!aMatch || !bMatch) {
    return a.localeCompare(b);
  }

  const [, aNum, aAlpha] = aMatch;
  const [, bNum, bAlpha] = bMatch;

  if (aAlpha && bAlpha) {
    const alphaCompare = aAlpha.localeCompare(bAlpha);
    if (alphaCompare !== 0) return alphaCompare;
    if (aNum && bNum) {
      return parseInt(aNum, 10) - parseInt(bNum, 10);
    }
    return aNum ? 1 : -1;
  }

  if (aAlpha && !bAlpha) return -1;
  if (!aAlpha && bAlpha) return 1;

  if (aNum && bNum) {
    return parseInt(aNum, 10) - parseInt(bNum, 10);
  }

  return 0;
}

/**
 * Simple CSV line parser (same logic as build.ts parseCsvLine).
 * Handles quoted fields; assumes no embedded newlines.
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

/**
 * Encode a single MR row into the binary format used by mrRows.bin.
 * Format: [4 × uint16 field lengths (8 bytes)] + [variable UTF-8 payloads]
 */
function encodeMRRow(row: MRRow): Buffer {
  const fieldValues = [
    row.buildingNumber,
    row.buildingName,
    row.subBuildingName,
    row.umprn,
  ];

  const fieldBuffers = fieldValues.map((v) => Buffer.from(v, 'utf-8'));
  const lengths = fieldBuffers.map((b) => b.length);

  const headerBuf = Buffer.alloc(MR_FIELD_COUNT * 2); // 8 bytes
  writeUint16Array(headerBuf, 0, lengths);

  return Buffer.concat([headerBuf, ...fieldBuffers]);
}

/**
 * Build the Multiple Residence binary index files.
 *
 * Looks for `{inputDir}/CSV MULRES/CSV Multiple Residence.csv`.
 * If the file is absent, returns null (build proceeds without MR data).
 *
 * Output files written to outputDir:
 *   mrRows.bin      - encoded MR row data
 *   mrRowStart.bin  - uint32 byte offsets into mrRows.bin
 *   mrUdprn.bin     - sorted 8-byte zero-padded UDPRN keys
 *   mrStart.bin     - uint32 first MR row index per UDPRN
 *   mrEnd.bin       - uint32 one-past-last MR row index per UDPRN
 */
export async function buildMRIndex(
  inputDir: string,
  outputDir: string
): Promise<MRBuildResult | null> {
  const mrCsvPath = join(inputDir, MR_RELATIVE_PATH);

  if (!existsSync(mrCsvPath)) {
    console.log(`MR file not found at ${mrCsvPath}, skipping Multiple Residence build.`);
    return null;
  }

  console.log(`Building Multiple Residence index from: ${mrCsvPath}`);

  // Group MR rows by zero-padded UDPRN
  const udprnMap = new Map<string, MRRow[]>();

  const rl = createInterface({
    input: createReadStream(mrCsvPath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let linesRead = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    const tokens = parseCsvLine(line);
    if (tokens.length <= COL_UMPRN) continue; // Skip malformed lines

    const udprnRaw = tokens[COL_UDPRN] ?? '';
    if (!udprnRaw) continue; // Skip rows with no UDPRN

    const udprn8 = padUdprn(udprnRaw);

    const row: MRRow = {
      buildingNumber: tokens[COL_BUILDING_NUMBER] ?? '',
      buildingName: tokens[COL_BUILDING_NAME] ?? '',
      subBuildingName: tokens[COL_SUB_BUILDING_NAME] ?? '',
      umprn: tokens[COL_UMPRN] ?? '',
    };

    if (!udprnMap.has(udprn8)) {
      udprnMap.set(udprn8, []);
    }
    udprnMap.get(udprn8)!.push(row);
    linesRead++;
  }

  console.log(`MR: read ${linesRead} records across ${udprnMap.size} distinct UDPRNs`);
  console.log('MR: sorting...');

  // Sort rows within each UDPRN group by buildingName then buildingNumber
  for (const rows of udprnMap.values()) {
    rows.sort((a, b) => {
      const nameCmp = compareBuildingNumbers(a.buildingName, b.buildingName);
      if (nameCmp !== 0) return nameCmp;
      return compareBuildingNumbers(a.buildingNumber, b.buildingNumber);
    });
  }

  // Sort UDPRNs in ascending order (lexicographic on zero-padded strings = numeric order)
  const sortedUdprns = Array.from(udprnMap.keys()).sort();

  console.log('MR: writing binary files...');

  const mrRowsPath = join(outputDir, 'mrRows.bin');
  const mrRowStartPath = join(outputDir, 'mrRowStart.bin');
  const mrUdprnPath = join(outputDir, 'mrUdprn.bin');
  const mrStartPath = join(outputDir, 'mrStart.bin');
  const mrEndPath = join(outputDir, 'mrEnd.bin');

  // Write mrRows.bin and build rowStart array
  const rowsStream = createWriteStream(mrRowsPath);
  const rowStartArr: number[] = [];
  const udprnStartArr: number[] = [];
  const udprnEndArr: number[] = [];

  let currentOffset = 0;
  let rowIndex = 0;

  for (const udprn8 of sortedUdprns) {
    const rows = udprnMap.get(udprn8)!;
    udprnStartArr.push(rowIndex);

    for (const row of rows) {
      const encoded = encodeMRRow(row);
      rowsStream.write(encoded);
      rowStartArr.push(currentOffset);
      currentOffset += encoded.length;
      rowIndex++;
    }

    udprnEndArr.push(rowIndex);
  }

  rowsStream.end();
  await new Promise<void>((resolve) => rowsStream.on('finish', () => resolve()));

  // Write mrRowStart.bin
  writeUint32ArrayToFile(mrRowStartPath, new Uint32Array(rowStartArr));

  // Write mrUdprn.bin (8 bytes per UDPRN key)
  const udprnBuf = Buffer.alloc(sortedUdprns.length * 8);
  for (let i = 0; i < sortedUdprns.length; i++) {
    udprnBuf.write(sortedUdprns[i], i * 8, 8, 'utf-8');
  }
  writeFileSync(mrUdprnPath, udprnBuf);

  // Write mrStart.bin and mrEnd.bin
  writeUint32ArrayToFile(mrStartPath, new Uint32Array(udprnStartArr));
  writeUint32ArrayToFile(mrEndPath, new Uint32Array(udprnEndArr));

  // Compute checksums
  const checksums: Record<string, string> = {};
  for (const [name, path] of [
    ['mrRows.bin', mrRowsPath],
    ['mrRowStart.bin', mrRowStartPath],
    ['mrUdprn.bin', mrUdprnPath],
    ['mrStart.bin', mrStartPath],
    ['mrEnd.bin', mrEndPath],
  ] as [string, string][]) {
    checksums[name] = await computeChecksum(path);
  }

  const result: MRBuildResult = {
    rows: rowIndex,
    distinctUdprns: sortedUdprns.length,
    checksums,
  };

  console.log(
    `MR build complete: ${result.rows} MR rows, ${result.distinctUdprns} distinct UDPRNs`
  );

  return result;
}
