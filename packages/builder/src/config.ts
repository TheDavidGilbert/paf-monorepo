import { parseArgs } from 'node:util';
import { resolve, join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface BuildConfig {
  inputPath: string;
  /** Base input directory (two levels above inputPath, e.g. packages/builder/input/) */
  inputDir: string;
  outputDir: string;
  version: string;
}

export function parseConfig(): BuildConfig {
  const { values } = parseArgs({
    options: {
      input: {
        type: 'string',
      },
      out: {
        type: 'string',
      },
      version: {
        type: 'string',
      },
    },
  });

  // Determine input path
  let inputPath: string;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const defaultPath = join(__dirname, '..', 'input', 'CSV PAF', 'CSV PAF.csv');
  if (values.input) {
    inputPath = resolve(values.input);
    // If provided path doesn't exist, fall back to new default
    if (!existsSync(inputPath)) {
      console.warn(`Warning: Input file not found at ${inputPath}, using default: ${defaultPath}`);
      inputPath = defaultPath;
    }
  } else {
    // No input provided, use new default
    inputPath = defaultPath;
  }

  // Derive the base input directory (two levels above the CSV PAF file)
  // e.g. …/input/CSV PAF/CSV PAF.csv  →  …/input/
  const inputDir = dirname(dirname(inputPath));

  const outputDir = resolve(values.out ?? 'packages/api/data');
  const version = values.version ?? `paf-${new Date().toISOString().split('T')[0]}`;

  return {
    inputPath,
    inputDir,
    outputDir,
    version,
  };
}
