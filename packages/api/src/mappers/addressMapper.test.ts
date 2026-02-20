import { describe, it, expect } from '@jest/globals';

import type { Address, MRRecord } from '../types.js';

import { mapToAddressModel, mapMRToAddressModel } from './addressMapper.js';

// Minimal helper: base Address with all new PAF fields set to empty strings
function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    postcode: '',
    postTown: '',
    dependentLocality: '',
    doubleDependentLocality: '',
    thoroughfare: '',
    dependentThoroughfare: '',
    buildingNumber: '',
    buildingName: '',
    subBuildingName: '',
    poBox: '',
    departmentName: '',
    organisationName: '',
    udprn: '',
    postcodeType: 'S',
    suOrganisationIndicator: '',
    deliveryPointSuffix: '',
    ...overrides,
  };
}

describe('mapToAddressModel', () => {
  it('should map PAF address with building number and street', () => {
    const pafAddress = makeAddress({
      postcode: 'PL1 1LR',
      postTown: 'PLYMOUTH',
      thoroughfare: 'Cornwall Street',
      buildingNumber: '88',
      udprn: '12345',
      deliveryPointSuffix: '1A',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.buildingNumber).toBe('88');
    expect(result.thoroughfare).toBe('Cornwall Street');
    expect(result.postTown).toBe('PLYMOUTH');
    expect(result.postcode).toBe('PL1 1LR');
    expect(result.formattedAddress).toEqual(['88 Cornwall Street', 'PLYMOUTH', 'PL1 1LR']);
  });

  it('should map PAF address with sub-building and building name', () => {
    const pafAddress = makeAddress({
      postcode: 'PL1 1AE',
      postTown: 'PLYMOUTH',
      thoroughfare: 'Old Town Street',
      buildingName: '2a',
      subBuildingName: 'Flat 1',
      udprn: '53879040',
      deliveryPointSuffix: '1A',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.subBuildingName).toBe('Flat 1');
    expect(result.buildingName).toBe('2a');
    expect(result.formattedAddress).toContain('Flat 1');
    expect(result.formattedAddress).toContain('2a');
    expect(result.formattedAddress).toContain('Old Town Street');
  });

  it('should handle dependent locality', () => {
    const pafAddress = makeAddress({
      postcode: 'TEST 123',
      postTown: 'TEST TOWN',
      dependentLocality: 'Test Village',
      thoroughfare: 'Test Street',
      buildingNumber: '1',
      udprn: '99999',
      deliveryPointSuffix: '1A',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.dependentLocality).toBe('Test Village');
    expect(result.formattedAddress).toContain('Test Village');
  });

  it('should handle empty fields gracefully', () => {
    const pafAddress = makeAddress({
      postcode: 'TEST 123',
      postTown: 'TEST TOWN',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.buildingNumber).toBe('');
    expect(result.thoroughfare).toBe('');
    expect(result.organisationName).toBe('');
    expect(result.departmentName).toBe('');
    expect(result.poBox).toBe('');
    expect(result.formattedAddress).toEqual(['TEST TOWN', 'TEST 123']);
  });

  it('should include udprn from the address and empty umprn for standard PAF', () => {
    const pafAddress = makeAddress({
      postcode: 'PL1 1LR',
      postTown: 'PLYMOUTH',
      thoroughfare: 'Cornwall Street',
      buildingNumber: '88',
      udprn: '12345678',
      deliveryPointSuffix: '1A',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.udprn).toBe('12345678');
    expect(result.umprn).toBe('');
  });

  it('should place organisation name first in formattedAddress', () => {
    const pafAddress = makeAddress({
      postcode: 'EC1A 1BB',
      postTown: 'LONDON',
      thoroughfare: 'HIGH HOLBORN',
      buildingNumber: '1',
      organisationName: 'ACME CORPORATION',
      suOrganisationIndicator: 'Y',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.organisationName).toBe('ACME CORPORATION');
    expect(result.formattedAddress[0]).toBe('ACME CORPORATION');
    expect(result.formattedAddress).toContain('1 HIGH HOLBORN');
  });

  it('should place department name after organisation name', () => {
    const pafAddress = makeAddress({
      postcode: 'EC1A 1BB',
      postTown: 'LONDON',
      thoroughfare: 'HIGH HOLBORN',
      buildingNumber: '1',
      organisationName: 'ACME CORPORATION',
      departmentName: 'FINANCE DEPARTMENT',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.departmentName).toBe('FINANCE DEPARTMENT');
    expect(result.formattedAddress[0]).toBe('ACME CORPORATION');
    expect(result.formattedAddress[1]).toBe('FINANCE DEPARTMENT');
  });

  it('should use PO BOX instead of street for Large User records', () => {
    const pafAddress = makeAddress({
      postcode: 'SW1A 1AA',
      postTown: 'LONDON',
      organisationName: 'HM REVENUE & CUSTOMS',
      poBox: '4000',
      postcodeType: 'L',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.poBox).toBe('4000');
    expect(result.postcodeType).toBe('L');
    expect(result.formattedAddress).toContain('PO BOX 4000');
    expect(result.formattedAddress).not.toContain('');
    // No street lines should appear
    const hasStreet = result.formattedAddress.some(
      (line) =>
        line !== 'HM REVENUE & CUSTOMS' &&
        line !== 'PO BOX 4000' &&
        line !== 'LONDON' &&
        line !== 'SW1A 1AA'
    );
    expect(hasStreet).toBe(false);
  });

  it('should pass through postcodeType and suOrganisationIndicator', () => {
    const pafAddress = makeAddress({
      postcode: 'PL1 1LR',
      postTown: 'PLYMOUTH',
      postcodeType: 'S',
      suOrganisationIndicator: 'Y',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.postcodeType).toBe('S');
    expect(result.suOrganisationIndicator).toBe('Y');
  });

  it('should pass through deliveryPointSuffix', () => {
    const pafAddress = makeAddress({
      postcode: 'PL1 1LR',
      postTown: 'PLYMOUTH',
      deliveryPointSuffix: '2B',
    });

    const result = mapToAddressModel(pafAddress);

    expect(result.deliveryPointSuffix).toBe('2B');
  });
});

// ---------------------------------------------------------------------------

const baseParent: Address = makeAddress({
  postcode: 'SW1A 1AA',
  postTown: 'LONDON',
  thoroughfare: 'ACACIA AVENUE',
  buildingNumber: '37',
  udprn: '00012345',
  deliveryPointSuffix: '1A',
});

describe('mapMRToAddressModel', () => {
  it('should use MR buildingName as subBuildingName (common case — flat identifier)', () => {
    const mr: MRRecord = {
      buildingNumber: '',
      buildingName: 'FLAT 1',
      subBuildingName: '',
      umprn: '99000001',
    };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.subBuildingName).toBe('FLAT 1');
    expect(result.buildingNumber).toBe('37');
    expect(result.thoroughfare).toBe('ACACIA AVENUE');
    expect(result.postTown).toBe('LONDON');
    expect(result.formattedAddress).toContain('FLAT 1');
    expect(result.formattedAddress).toContain('37 ACACIA AVENUE');
  });

  it('should use MR subBuildingName and buildingName when both are set', () => {
    const mr: MRRecord = {
      buildingNumber: '',
      buildingName: 'GROUND FLOOR',
      subBuildingName: 'UNIT A',
      umprn: '99000002',
    };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.subBuildingName).toBe('UNIT A');
    expect(result.buildingName).toBe('GROUND FLOOR');
  });

  it('should use MR buildingNumber as subBuildingName when only buildingNumber is set', () => {
    const mr: MRRecord = {
      buildingNumber: '2',
      buildingName: '',
      subBuildingName: '',
      umprn: '99000003',
    };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.subBuildingName).toBe('2');
  });

  it('should set umprn from MR record and udprn from parent', () => {
    const mr: MRRecord = {
      buildingNumber: '',
      buildingName: 'FLAT 2',
      subBuildingName: '',
      umprn: '99000004',
    };
    const result = mapMRToAddressModel(baseParent, mr);

    expect(result.umprn).toBe('99000004');
    expect(result.udprn).toBe('00012345');
  });

  it('should inherit parent buildingName as buildingName when MR only has buildingName (used as subBuilding)', () => {
    const parentWithBuilding = makeAddress({
      ...baseParent,
      buildingNumber: '',
      buildingName: 'VICTORIA HOUSE',
    });
    const mr: MRRecord = {
      buildingNumber: '',
      buildingName: 'FLAT 3',
      subBuildingName: '',
      umprn: '99000005',
    };
    const result = mapMRToAddressModel(parentWithBuilding, mr);

    expect(result.subBuildingName).toBe('FLAT 3');
    expect(result.buildingName).toBe('VICTORIA HOUSE');
    expect(result.formattedAddress).toContain('FLAT 3');
    expect(result.formattedAddress).toContain('VICTORIA HOUSE');
  });

  it('should preserve locality and postcode from parent', () => {
    const parentWithLocality = makeAddress({
      ...baseParent,
      dependentLocality: 'MAYFAIR',
    });
    const mr: MRRecord = {
      buildingNumber: '',
      buildingName: 'FLAT 1',
      subBuildingName: '',
      umprn: '99000006',
    };
    const result = mapMRToAddressModel(parentWithLocality, mr);

    expect(result.dependentLocality).toBe('MAYFAIR');
    expect(result.formattedAddress).toContain('SW1A 1AA');
  });

  it('should inherit B2B fields from parent', () => {
    const parentWithOrg = makeAddress({
      ...baseParent,
      organisationName: 'ACME LTD',
      departmentName: 'ACCOUNTS',
    });
    const mr: MRRecord = {
      buildingNumber: '',
      buildingName: 'SUITE 1',
      subBuildingName: '',
      umprn: '99000007',
    };
    const result = mapMRToAddressModel(parentWithOrg, mr);

    expect(result.organisationName).toBe('ACME LTD');
    expect(result.departmentName).toBe('ACCOUNTS');
  });
});
