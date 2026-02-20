import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockExistsSync = jest.fn<typeof import('node:fs').existsSync>();
const mockParseArgs = jest.fn<typeof import('node:util').parseArgs>();

jest.unstable_mockModule('node:fs', () => ({
  existsSync: mockExistsSync,
}));

jest.unstable_mockModule('node:util', () => ({
  parseArgs: mockParseArgs,
}));

const { parseConfig } = await import('./config.js');

describe('parseConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use provided input path if it exists', () => {
    mockParseArgs.mockReturnValue({
      values: { input: 'test.csv' },
      positionals: [],
    });
    mockExistsSync.mockReturnValue(true);

    const config = parseConfig();

    expect(config.inputPath).toContain('test.csv');
  });

  it('should use default input path if no input provided', () => {
    mockParseArgs.mockReturnValue({
      values: {},
      positionals: [],
    });

    const config = parseConfig();

    expect(config.inputPath).toMatch(/CSV[ /\\]PAF[ /\\]CSV PAF\.csv/);
  });

  it('should fall back to default if provided path does not exist', () => {
    mockParseArgs.mockReturnValue({
      values: { input: 'nonexistent.csv' },
      positionals: [],
    });
    mockExistsSync.mockReturnValue(false);

    const config = parseConfig();

    expect(config.inputPath).toMatch(/CSV[ /\\]PAF[ /\\]CSV PAF\.csv/);
  });

  it('should use provided output directory', () => {
    mockParseArgs.mockReturnValue({
      values: { out: 'custom/output' },
      positionals: [],
    });

    const config = parseConfig();

    expect(config.outputDir).toContain('custom');
  });

  it('should use default output directory if not provided', () => {
    mockParseArgs.mockReturnValue({
      values: {},
      positionals: [],
    });

    const config = parseConfig();

    // Should resolve to an absolute path containing api/data or api\data
    expect(config.outputDir).toMatch(/api[/\\]data/);
  });

  it('should use provided version', () => {
    mockParseArgs.mockReturnValue({
      values: { version: 'test-version-1.0' },
      positionals: [],
    });

    const config = parseConfig();

    expect(config.version).toBe('test-version-1.0');
  });

  it('should generate default version with date', () => {
    mockParseArgs.mockReturnValue({
      values: {},
      positionals: [],
    });

    const config = parseConfig();

    expect(config.version).toMatch(/^paf-\d{4}-\d{2}-\d{2}$/);
  });
});
