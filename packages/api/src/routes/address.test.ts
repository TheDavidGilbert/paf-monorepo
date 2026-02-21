import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import type { SearchResponse } from '../models/searchResponse.js';

// Mock the dataset module
const mockFindPostcodeRange = jest.fn((key: string) => {
  if (key === 'PL11LR ') return [0, 2];
  if (key === 'PL11AE ') return [2, 4];
  return null;
});

const mockDecodeRow = jest.fn((index: number) => ({
  postcode: index === 0 || index === 1 ? 'PL1 1LR' : 'PL1 1AE',
  postTown: 'PLYMOUTH',
  dependentLocality: '',
  doubleDependentLocality: '',
  thoroughfare: 'Test Street',
  dependentThoroughfare: '',
  buildingNumber: String(index * 10),
  buildingName: '',
  subBuildingName: '',
  poBox: '',
  departmentName: '',
  organisationName: '',
  udprn: String(12345 + index),
  postcodeType: 'S',
  suOrganisationIndicator: '',
  deliveryPointSuffix: '1A',
}));

jest.unstable_mockModule('../dataset.js', () => ({
  findPostcodeRange: mockFindPostcodeRange,
  decodeRow: mockDecodeRow,
  // MR functions — return no-MR-data defaults (simulates a PAF-only build)
  hasMRData: jest.fn(() => false),
  findMRRange: jest.fn(() => null),
  padUdprn: jest.fn((u: string) => u.padStart(8, '0')),
  decodeMRRow: jest.fn(() => ({
    buildingNumber: '',
    buildingName: '',
    subBuildingName: '',
    umprn: '',
  })),
}));

const { addressRoute } = await import('./address.js');

describe('addressRoute', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(addressRoute);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 400 when postcode is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.message).toContain('Postcode is required');
  });

  it('should return 200 for test status code XXX X200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=XXX%20X200',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.message).toBe('Test success response');
    expect(body.results).toHaveLength(1);
    expect(body.results[0].buildingNumber).toBe('1');
  });

  it('should return 404 for test status code XXXX404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=XXXX404',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.message).toBe('Test not found');
    expect(body.results).toHaveLength(0);
  });

  it('should return 400 for test status code XXX X400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=XXX%20X400',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.message).toBe('Test bad request');
  });

  it('should return 422 for test status code XXXX422', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=XXXX422',
    });

    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.message).toBe('Test unprocessable entity');
  });

  it('should return 400 for invalid UK postcode format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=INVALID',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.message).toContain('Invalid UK postcode format');
  });

  it('should return 200 with addresses for valid postcode', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=PL1%201LR',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.status).toBe(200);
    expect(body.message).toBe('Success');
    expect(body.postCode).toBe('PL1 1LR');
    expect(body.countryCode).toBe('GB');
    expect(body.country).toBe('United Kingdom');
    expect(body.provider).toBe('PAF');
    expect(body.results).toHaveLength(2);
  });

  it('should return 404 for valid format but non-existent postcode', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=SW1A%201AA',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.message).toBe('Postcode not found');
  });

  it('should handle postcodes without spaces', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=PL11LR',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.results).toHaveLength(2);
  });

  it('should include fullAddress flag as true', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=PL1%201LR',
    });

    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.fullAddress).toBe(true);
  });

  it('should always return countryCode GB and United Kingdom', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/lookup/address?postcode=PL1%201LR',
    });

    const body = JSON.parse(response.body) as SearchResponse;
    expect(body.countryCode).toBe('GB');
    expect(body.country).toBe('United Kingdom');
  });
});
