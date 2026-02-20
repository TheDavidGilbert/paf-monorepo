import type { Address } from '../types.js';
import type { AddressModel } from '../models/addressModel.js';

/**
 * Map PAF Address to AddressModel format
 */
export function mapToAddressModel(pafAddress: Address): AddressModel {
  const parts: string[] = [];

  // Build formatted address lines
  if (pafAddress.subBuildingName) parts.push(pafAddress.subBuildingName);
  if (pafAddress.buildingName) parts.push(pafAddress.buildingName);
  if (pafAddress.buildingNumber) {
    if (pafAddress.dependentThoroughfare) {
      parts.push(`${pafAddress.buildingNumber} ${pafAddress.dependentThoroughfare}`);
    } else if (pafAddress.thoroughfare) {
      parts.push(`${pafAddress.buildingNumber} ${pafAddress.thoroughfare}`);
    } else {
      parts.push(pafAddress.buildingNumber);
    }
  } else {
    if (pafAddress.dependentThoroughfare) parts.push(pafAddress.dependentThoroughfare);
    if (pafAddress.thoroughfare && pafAddress.thoroughfare !== pafAddress.dependentThoroughfare) {
      parts.push(pafAddress.thoroughfare);
    }
  }

  if (pafAddress.doubleDependentLocality) parts.push(pafAddress.doubleDependentLocality);
  if (pafAddress.dependentLocality) parts.push(pafAddress.dependentLocality);
  if (pafAddress.postTown) parts.push(pafAddress.postTown);
  if (pafAddress.postcode) parts.push(pafAddress.postcode);

  // Build line-based address
  let line1 = '';
  let line2 = '';
  let line3 = '';
  let line4 = '';

  // Line 1: Sub-building and/or building name
  if (pafAddress.subBuildingName && pafAddress.buildingName) {
    line1 = `${pafAddress.subBuildingName}, ${pafAddress.buildingName}`;
  } else if (pafAddress.subBuildingName) {
    line1 = pafAddress.subBuildingName;
  } else if (pafAddress.buildingName) {
    line1 = pafAddress.buildingName;
  }

  // Line 2: Building number and street
  if (pafAddress.buildingNumber && pafAddress.thoroughfare) {
    line2 = `${pafAddress.buildingNumber} ${pafAddress.thoroughfare}`;
  } else if (pafAddress.buildingNumber && pafAddress.dependentThoroughfare) {
    line2 = `${pafAddress.buildingNumber} ${pafAddress.dependentThoroughfare}`;
  } else if (pafAddress.thoroughfare) {
    line2 = pafAddress.thoroughfare;
  } else if (pafAddress.dependentThoroughfare) {
    line2 = pafAddress.dependentThoroughfare;
  }

  // If line1 is empty and we have line2, shift line2 to line1
  if (!line1 && line2) {
    line1 = line2;
    line2 = '';
  }

  // Line 3: Dependent locality or double dependent locality
  if (pafAddress.doubleDependentLocality) {
    line3 = pafAddress.doubleDependentLocality;
  } else if (pafAddress.dependentLocality) {
    line3 = pafAddress.dependentLocality;
  }

  // If we have both, combine differently
  if (pafAddress.doubleDependentLocality && pafAddress.dependentLocality) {
    line3 = pafAddress.doubleDependentLocality;
    line4 = pafAddress.dependentLocality;
  }

  return {
    formattedAddress: parts,
    thoroughfare: pafAddress.thoroughfare || '',
    buildingName: pafAddress.buildingName || '',
    subBuildingName: pafAddress.subBuildingName || '',
    subBuildingNumber: '', // Not in PAF data
    buildingNumber: pafAddress.buildingNumber || '',
    line1,
    line2,
    line3,
    line4,
    locality: pafAddress.dependentLocality || '',
    townOrCity: pafAddress.postTown || '',
    county: '', // Not in PAF basic data
    district: '', // Not in PAF basic data
    state: '', // Not applicable for UK
    stateCode: '', // Not applicable for UK
  };
}
