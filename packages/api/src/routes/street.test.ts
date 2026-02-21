import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import type { AddressModel } from '../models/addressModel.js';

// ---------------------------------------------------------------------------
// Dataset mock
// ---------------------------------------------------------------------------

const mockHasThoroughfareIndex = jest.fn(() => true);
const mockSearchByAddressPrefix = jest.fn(
  (prefix: string, buildingNumber: string | null, town: string | null, _limit: number) => {
    if (prefix === 'FLORA') {
      return [
        {
          postcode: 'PL1 1LR',
          postTown: 'PLYMOUTH',
          dependentLocality: '',
          doubleDependentLocality: '',
          thoroughfare: 'FLORA COURT',
          dependentThoroughfare: '',
          buildingNumber: buildingNumber ?? '10',
          buildingName: '',
          subBuildingName: '',
          poBox: '',
          departmentName: '',
          organisationName: '',
          udprn: '12345678',
          postcodeType: 'S',
          suOrganisationIndicator: '',
          deliveryPointSuffix: '1A',
        },
        {
          postcode: 'PL2 2AA',
          postTown: town ?? 'BRISTOL',
          dependentLocality: '',
          doubleDependentLocality: '',
          thoroughfare: 'FLORA AVENUE',
          dependentThoroughfare: '',
          buildingNumber: buildingNumber ?? '22',
          buildingName: '',
          subBuildingName: '',
          poBox: '',
          departmentName: '',
          organisationName: '',
          udprn: '87654321',
          postcodeType: 'S',
          suOrganisationIndicator: '',
          deliveryPointSuffix: '2B',
        },
      ];
    }
    return [];
  }
);

jest.unstable_mockModule('../dataset.js', () => ({
  hasThoroughfareIndex: mockHasThoroughfareIndex,
  searchByAddressPrefix: mockSearchByAddressPrefix,
}));

const { streetRoute } = await import('./street.js');

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface StreetSearchResponse {
  status: number;
  query?: string;
  countryCode?: string;
  country?: string;
  total?: number;
  results?: AddressModel[];
  message?: string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('streetRoute', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(streetRoute);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockHasThoroughfareIndex.mockClear();
    mockSearchByAddressPrefix.mockClear();
    mockHasThoroughfareIndex.mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // Feature toggle
  // -------------------------------------------------------------------------

  it('should return 503 when the thoroughfare index is not loaded', async () => {
    mockHasThoroughfareIndex.mockReturnValue(false);

    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=38+Flora' });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body) as StreetSearchResponse;
    expect(body.message).toContain('not enabled');
  });

  // -------------------------------------------------------------------------
  // Query validation
  // -------------------------------------------------------------------------

  it('should return 400 when q is missing', async () => {
    const response = await app.inject({ method: 'GET', url: '/lookup/street' });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as StreetSearchResponse;
    expect(body.message).toContain('"q"');
  });

  it('should return 400 when the thoroughfare prefix is fewer than 3 characters', async () => {
    // "38 FL" → prefix "FL" (2 chars)
    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=38+FL' });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as StreetSearchResponse;
    expect(body.message).toContain('at least 3');
  });

  it('should return 400 when query contains invalid characters', async () => {
    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=38+Flo%21a' });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as StreetSearchResponse;
    expect(body.message).toContain('invalid characters');
  });

  it('should return 400 for a non-positive limit', async () => {
    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=Flora&limit=0' });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as StreetSearchResponse;
    expect(body.message).toContain('positive integer');
  });

  // -------------------------------------------------------------------------
  // Successful searches
  // -------------------------------------------------------------------------

  it('should return 200 with results for a matching prefix', async () => {
    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=Flora' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as StreetSearchResponse;
    expect(body.status).toBe(200);
    expect(body.query).toBe('Flora');
    expect(body.countryCode).toBe('GB');
    expect(body.country).toBe('United Kingdom');
    expect(body.total).toBe(2);
    expect(body.results).toHaveLength(2);
  });

  it('should parse building number from the leading token', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=38+Flora' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith('FLORA', '38', null, expect.any(Number));
  });

  it('should treat the whole query as a thoroughfare prefix when no leading number', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=Flora+Court' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith(
      'FLORA COURT',
      null,
      null,
      expect.any(Number)
    );
  });

  it('should normalise the query to uppercase before searching', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=flora' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith('FLORA', null, null, expect.any(Number));
  });

  it('should parse a building number with trailing letter (e.g. 38A)', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=38A+Flora' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith(
      'FLORA',
      '38A',
      null,
      expect.any(Number)
    );
  });

  it('should return 200 with empty results when prefix does not match', async () => {
    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=Zzzz' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as StreetSearchResponse;
    expect(body.total).toBe(0);
    expect(body.results).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Town filter
  // -------------------------------------------------------------------------

  it('should pass the town filter to the search function (uppercased)', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=Flora&town=Plymouth' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith(
      'FLORA',
      null,
      'PLYMOUTH',
      expect.any(Number)
    );
  });

  // -------------------------------------------------------------------------
  // Limit parameter
  // -------------------------------------------------------------------------

  it('should apply the default limit of 20 when limit is omitted', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=Flora' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith('FLORA', null, null, 20);
  });

  it('should cap limit at 50', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=Flora&limit=999' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith('FLORA', null, null, 50);
  });

  it('should pass a custom limit through', async () => {
    await app.inject({ method: 'GET', url: '/lookup/street?q=Flora&limit=5' });

    expect(mockSearchByAddressPrefix).toHaveBeenCalledWith('FLORA', null, null, 5);
  });

  // -------------------------------------------------------------------------
  // Cache headers
  // -------------------------------------------------------------------------

  it('should set a public cache header on successful responses', async () => {
    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=Flora' });

    expect(response.headers['cache-control']).toContain('public');
    expect(response.headers['cache-control']).toContain('max-age=3600');
  });

  // -------------------------------------------------------------------------
  // Response shape
  // -------------------------------------------------------------------------

  it('should return AddressModel fields in each result', async () => {
    const response = await app.inject({ method: 'GET', url: '/lookup/street?q=Flora' });

    const body = JSON.parse(response.body) as StreetSearchResponse;
    const first = body.results?.[0];
    expect(first).toHaveProperty('formattedAddress');
    expect(first).toHaveProperty('postcode');
    expect(first).toHaveProperty('postTown');
    expect(first).toHaveProperty('thoroughfare');
    expect(first).toHaveProperty('buildingNumber');
    expect(first).toHaveProperty('udprn');
    expect(first).toHaveProperty('umprn');
  });
});
