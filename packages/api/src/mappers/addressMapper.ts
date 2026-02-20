import type { Address, MRRecord } from '../types.js';
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
    udprn: pafAddress.udprn || '',
    umprn: '', // Standard PAF records have no UMPRN
  };
}

/**
 * Map a Multiple Residence record + its parent PAF address to an AddressModel.
 *
 * The MR record provides the individual unit identity (e.g. "FLAT 1").
 * The parent address provides the delivery-point-level fields (street, town, postcode).
 *
 * Mapping strategy:
 *   - If mr.subBuildingName is set: use it as subBuildingName, mr.buildingName as buildingName
 *   - If only mr.buildingName is set: use it as subBuildingName, parent.buildingName as buildingName
 *   - If only mr.buildingNumber is set: use it as subBuildingName
 *   - buildingNumber always inherited from parent (the owning delivery point)
 *   - All locality / town / postcode fields inherited from parent
 */
export function mapMRToAddressModel(parent: Address, mr: MRRecord): AddressModel {
  let syntheticSubBuilding: string;
  let syntheticBuilding: string;

  if (mr.subBuildingName) {
    // Most granular case: both subBuilding and building present on MR record
    syntheticSubBuilding = mr.subBuildingName;
    syntheticBuilding = mr.buildingName || parent.buildingName;
  } else if (mr.buildingName) {
    // Common case: MR buildingName is the flat/unit identifier (e.g. "FLAT 1")
    syntheticSubBuilding = mr.buildingName;
    syntheticBuilding = parent.buildingName;
  } else if (mr.buildingNumber) {
    // Unit identified by number only (e.g. "2")
    syntheticSubBuilding = mr.buildingNumber;
    syntheticBuilding = parent.buildingName;
  } else {
    // Fallback: no usable MR identifier, use parent fields unchanged
    syntheticSubBuilding = parent.subBuildingName;
    syntheticBuilding = parent.buildingName;
  }

  // Build a synthetic Address that merges MR unit info with parent street-level data,
  // then reuse the existing formatting logic in mapToAddressModel.
  const synthetic: Address = {
    postcode: parent.postcode,
    postTown: parent.postTown,
    dependentLocality: parent.dependentLocality,
    doubleDependentLocality: parent.doubleDependentLocality,
    thoroughfare: parent.thoroughfare,
    dependentThoroughfare: parent.dependentThoroughfare,
    buildingNumber: parent.buildingNumber, // Owning DP's door number
    buildingName: syntheticBuilding,
    subBuildingName: syntheticSubBuilding,
    udprn: parent.udprn,
    deliveryPointSuffix: parent.deliveryPointSuffix,
  };

  const model = mapToAddressModel(synthetic);

  // Override identifiers: keep parent UDPRN, add MR's UMPRN
  model.udprn = parent.udprn;
  model.umprn = mr.umprn;

  return model;
}
