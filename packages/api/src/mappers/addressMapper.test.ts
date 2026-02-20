import { describe, it, expect } from '@jest/globals';

import type { Address } from '../types.js';

import { mapToAddressModel } from './addressMapper.js';

describe('mapToAddressModel', () => {
  it('should map PAF address with building number and street', () => {
    const pafAddress: Address = {
      postcode: 'PL1 1LR',
      postTown: 'PLYMOUTH',
      dependentLocality: '',
      doubleDependentLocality: '',
      thoroughfare: 'Cornwall Street',
      dependentThoroughfare: '',
      buildingNumber: '88',
      buildingName: '',
      subBuildingName: '',
      udprn: '12345',
      deliveryPointSuffix: '1A',
    };

    const result = mapToAddressModel(pafAddress);

    expect(result.buildingNumber).toBe('88');
    expect(result.thoroughfare).toBe('Cornwall Street');
    expect(result.townOrCity).toBe('PLYMOUTH');
    expect(result.line1).toBe('88 Cornwall Street');
    expect(result.formattedAddress).toEqual(['88 Cornwall Street', 'PLYMOUTH', 'PL1 1LR']);
  });

  it('should map PAF address with sub-building and building name', () => {
    const pafAddress: Address = {
      postcode: 'PL1 1AE',
      postTown: 'PLYMOUTH',
      dependentLocality: '',
      doubleDependentLocality: '',
      thoroughfare: 'Old Town Street',
      dependentThoroughfare: '',
      buildingNumber: '',
      buildingName: '2a',
      subBuildingName: 'Flat 1',
      udprn: '53879040',
      deliveryPointSuffix: '1A',
    };

    const result = mapToAddressModel(pafAddress);

    expect(result.subBuildingName).toBe('Flat 1');
    expect(result.buildingName).toBe('2a');
    expect(result.line1).toBe('Flat 1, 2a');
    expect(result.line2).toBe('Old Town Street');
    expect(result.formattedAddress).toContain('Flat 1');
    expect(result.formattedAddress).toContain('2a');
  });

  it('should handle dependent locality', () => {
    const pafAddress: Address = {
      postcode: 'TEST 123',
      postTown: 'TEST TOWN',
      dependentLocality: 'Test Village',
      doubleDependentLocality: '',
      thoroughfare: 'Test Street',
      dependentThoroughfare: '',
      buildingNumber: '1',
      buildingName: '',
      subBuildingName: '',
      udprn: '99999',
      deliveryPointSuffix: '1A',
    };

    const result = mapToAddressModel(pafAddress);

    expect(result.locality).toBe('Test Village');
    expect(result.line3).toBe('Test Village');
    expect(result.formattedAddress).toContain('Test Village');
  });

  it('should handle empty fields gracefully', () => {
    const pafAddress: Address = {
      postcode: 'TEST 123',
      postTown: 'TEST TOWN',
      dependentLocality: '',
      doubleDependentLocality: '',
      thoroughfare: '',
      dependentThoroughfare: '',
      buildingNumber: '',
      buildingName: '',
      subBuildingName: '',
      udprn: '',
      deliveryPointSuffix: '',
    };

    const result = mapToAddressModel(pafAddress);

    expect(result.buildingNumber).toBe('');
    expect(result.thoroughfare).toBe('');
    expect(result.line1).toBe('');
    expect(result.line2).toBe('');
    expect(result.formattedAddress).toEqual(['TEST TOWN', 'TEST 123']);
  });

  it('should always include empty county, district, state fields for UK', () => {
    const pafAddress: Address = {
      postcode: 'PL1 1LR',
      postTown: 'PLYMOUTH',
      dependentLocality: '',
      doubleDependentLocality: '',
      thoroughfare: 'Test St',
      dependentThoroughfare: '',
      buildingNumber: '1',
      buildingName: '',
      subBuildingName: '',
      udprn: '12345',
      deliveryPointSuffix: '1A',
    };

    const result = mapToAddressModel(pafAddress);

    expect(result.county).toBe('');
    expect(result.district).toBe('');
    expect(result.state).toBe('');
    expect(result.stateCode).toBe('');
  });
});
