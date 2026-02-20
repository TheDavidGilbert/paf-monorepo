import { describe, it, expect } from '@jest/globals';

import type { Address, MRRecord } from '../types.js';

import { mapToAddressModel, mapMRToAddressModel } from './addressMapper.js';

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

  it('should include udprn from the address and empty umprn for standard PAF', () => {
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
      udprn: '12345678',
      deliveryPointSuffix: '1A',
    };

    const result = mapToAddressModel(pafAddress);

    expect(result.udprn).toBe('12345678');
    expect(result.umprn).toBe('');
  });
});

// ---------------------------------------------------------------------------

const baseParent: Address = {
  postcode: 'SW1A 1AA',
  postTown: 'LONDON',
  dependentLocality: '',
  doubleDependentLocality: '',
  thoroughfare: 'ACACIA AVENUE',
  dependentThoroughfare: '',
  buildingNumber: '37',
  buildingName: '',
  subBuildingName: '',
  udprn: '00012345',
  deliveryPointSuffix: '1A',
};

describe('mapMRToAddressModel', () => {
  it('should use MR buildingName as subBuildingName (common case — flat identifier)', () => {
    const mr: MRRecord = { buildingNumber: '', buildingName: 'FLAT 1', subBuildingName: '', umprn: '99000001' };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.subBuildingName).toBe('FLAT 1');
    expect(result.buildingNumber).toBe('37');
    expect(result.thoroughfare).toBe('ACACIA AVENUE');
    expect(result.townOrCity).toBe('LONDON');
    expect(result.formattedAddress).toContain('FLAT 1');
    expect(result.formattedAddress).toContain('37 ACACIA AVENUE');
  });

  it('should use MR subBuildingName and buildingName when both are set', () => {
    const mr: MRRecord = { buildingNumber: '', buildingName: 'GROUND FLOOR', subBuildingName: 'UNIT A', umprn: '99000002' };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.subBuildingName).toBe('UNIT A');
    expect(result.buildingName).toBe('GROUND FLOOR');
  });

  it('should use MR buildingNumber as subBuildingName when only buildingNumber is set', () => {
    const mr: MRRecord = { buildingNumber: '2', buildingName: '', subBuildingName: '', umprn: '99000003' };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.subBuildingName).toBe('2');
  });

  it('should set umprn from MR record and udprn from parent', () => {
    const mr: MRRecord = { buildingNumber: '', buildingName: 'FLAT 2', subBuildingName: '', umprn: '99000004' };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.umprn).toBe('99000004');
    expect(result.udprn).toBe('00012345');
  });

  it('should inherit parent buildingName as buildingName when MR only has buildingName (used as subBuilding)', () => {
    const parentWithBuilding: Address = {
      ...baseParent,
      buildingNumber: '',
      buildingName: 'VICTORIA HOUSE',
    };
    const mr: MRRecord = { buildingNumber: '', buildingName: 'FLAT 3', subBuildingName: '', umprn: '99000005' };
    const result = mapMRToAddressModel(parentWithBuilding, mr);

    expect(result.subBuildingName).toBe('FLAT 3');
    expect(result.buildingName).toBe('VICTORIA HOUSE');
    expect(result.formattedAddress).toContain('FLAT 3');
    expect(result.formattedAddress).toContain('VICTORIA HOUSE');
  });

  it('should preserve locality and postcode from parent', () => {
    const parentWithLocality: Address = {
      ...baseParent,
      dependentLocality: 'MAYFAIR',
    };
    const mr: MRRecord = { buildingNumber: '', buildingName: 'FLAT 1', subBuildingName: '', umprn: '99000006' };
    const result = mapMRToAddressModel(parentWithLocality, mr);

    expect(result.locality).toBe('MAYFAIR');
    expect(result.formattedAddress).toContain('SW1A 1AA');
  });
});
