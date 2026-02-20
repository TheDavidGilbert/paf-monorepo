import { describe, it, expect } from '@jest/globals';

import { createSearchResponse } from './searchResponse.js';

describe('createSearchResponse', () => {
  it('should create response with default values', () => {
    const response = createSearchResponse(200, 200, 'Success');

    expect(response.status).toBe(200);
    expect(response.code).toBe(200);
    expect(response.message).toBe('Success');
    expect(response.provider).toBe('PAF');
    expect(response.postCode).toBe('');
    expect(response.countryCode).toBe('');
    expect(response.country).toBe('');
    expect(response.fullAddress).toBe(true);
    expect(response.results).toEqual([]);
  });

  it('should create response with custom provider', () => {
    const response = createSearchResponse(404, 404, 'Not found', 'CustomProvider');

    expect(response.provider).toBe('CustomProvider');
    expect(response.status).toBe(404);
    expect(response.code).toBe(404);
    expect(response.message).toBe('Not found');
  });

  it('should create error responses', () => {
    const response = createSearchResponse(400, 400, 'Bad Request');

    expect(response.status).toBe(400);
    expect(response.code).toBe(400);
    expect(response.message).toBe('Bad Request');
    expect(response.results).toEqual([]);
  });

  it('should allow results to be populated', () => {
    const response = createSearchResponse(200, 200, 'Success');

    response.results.push({
      formattedAddress: ['Test'],
      thoroughfare: 'Test St',
      buildingName: '',
      subBuildingName: '',
      subBuildingNumber: '',
      buildingNumber: '1',
      line1: '1 Test St',
      line2: '',
      line3: '',
      line4: '',
      locality: '',
      townOrCity: 'Test',
      county: '',
      district: '',
      state: '',
      stateCode: '',
      udprn: '',
      umprn: '',
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0].buildingNumber).toBe('1');
  });
});
