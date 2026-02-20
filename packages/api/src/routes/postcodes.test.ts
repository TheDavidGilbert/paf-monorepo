import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// Mock the dataset module
const mockSearchPostcodePrefix = jest.fn((prefix: string, limit: number) => {
  if (prefix === 'SW1A') return ['SW1A 1AA', 'SW1A 1AB', 'SW1A 2AA'].slice(0, limit);
  if (prefix === 'PL1') return ['PL1 1AA', 'PL1 1AB', 'PL1 2AA'].slice(0, limit);
  if (prefix === 'ZZ9') return [];
  return [];
});

jest.unstable_mockModule('../dataset.js', () => ({
  searchPostcodePrefix: mockSearchPostcodePrefix,
}));

const { postcodesRoute } = await import('./postcodes.js');

interface AutocompleteResponse {
  status: number;
  query: string;
  countryCode: string;
  country: string;
  total: number;
  results: string[];
  message?: string;
}

describe('postcodesRoute', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(postcodesRoute);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockSearchPostcodePrefix.mockClear();
  });

  // ---------------------------------------------------------------------------
  // Query validation
  // ---------------------------------------------------------------------------

  it('should return 400 when q is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as AutocompleteResponse;
    expect(body.message).toContain('"q"');
  });

  it('should return 400 for query shorter than 2 characters (after normalisation)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=S',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as AutocompleteResponse;
    expect(body.message).toContain('at least 2');
  });

  it('should return 400 for query longer than 7 characters (after normalisation)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A1AAX',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as AutocompleteResponse;
    expect(body.message).toContain('7');
  });

  it('should return 400 for query containing invalid characters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1!',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as AutocompleteResponse;
    expect(body.message).toContain('invalid characters');
  });

  // ---------------------------------------------------------------------------
  // Successful searches
  // ---------------------------------------------------------------------------

  it('should return matching postcodes for a valid prefix', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as AutocompleteResponse;
    expect(body.status).toBe(200);
    expect(body.query).toBe('SW1A');
    expect(body.countryCode).toBe('GB');
    expect(body.country).toBe('United Kingdom');
    expect(body.total).toBe(3);
    expect(body.results).toEqual(['SW1A 1AA', 'SW1A 1AB', 'SW1A 2AA']);
  });

  it('should normalise the query to uppercase before searching', async () => {
    await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=sw1a',
    });

    expect(mockSearchPostcodePrefix).toHaveBeenLastCalledWith('SW1A', expect.any(Number));
  });

  it('should strip spaces from the query before searching', async () => {
    // "SW1A 1" → normalised to "SW1A1" (5 chars)
    await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A%201',
    });

    expect(mockSearchPostcodePrefix).toHaveBeenLastCalledWith('SW1A1', expect.any(Number));
  });

  it('should return an empty results array when no postcodes match', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=ZZ9',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as AutocompleteResponse;
    expect(body.total).toBe(0);
    expect(body.results).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Limit parameter
  // ---------------------------------------------------------------------------

  it('should apply the default limit of 10 when limit is omitted', async () => {
    await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A',
    });

    expect(mockSearchPostcodePrefix).toHaveBeenLastCalledWith('SW1A', 10);
  });

  it('should pass a custom limit to the search function', async () => {
    await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A&limit=2',
    });

    expect(mockSearchPostcodePrefix).toHaveBeenLastCalledWith('SW1A', 2);
  });

  it('should cap limit at 100', async () => {
    await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A&limit=999',
    });

    expect(mockSearchPostcodePrefix).toHaveBeenLastCalledWith('SW1A', 100);
  });

  it('should return 400 for a non-positive limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A&limit=0',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as AutocompleteResponse;
    expect(body.message).toContain('positive integer');
  });

  it('should return 400 for a non-numeric limit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A&limit=abc',
    });

    expect(response.statusCode).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // Cache headers
  // ---------------------------------------------------------------------------

  it('should set a public cache header on successful responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/autocomplete?q=SW1A',
    });

    expect(response.headers['cache-control']).toContain('public');
    expect(response.headers['cache-control']).toContain('max-age=3600');
  });
});
