import type { Address, MRRecord } from '../types.js';
import type { AddressModel } from '../models/addressModel.js';

/**
 * Map PAF Address to AddressModel format.
 *
 * Returns PAF fields directly, plus a `formattedAddress` string array built
 * according to Royal Mail formatting rules:
 *   1. Organisation Name (if present)
 *   2. Department Name (if present)
 *   3. Sub Building Name (if present)
 *   4. Building Name (if present)
 *   5a. For Large User records (poBox set): PO BOX {number}
 *   5b. For Small User records: Building Number + street, or street alone
 *   6. Double Dependent Locality (if present)
 *   7. Dependent Locality (if present)
 *   8. Post Town
 *   9. Postcode
 */
export function mapToAddressModel(pafAddress: Address): AddressModel {
  const parts: string[] = [];

  if (pafAddress.organisationName) parts.push(pafAddress.organisationName);
  if (pafAddress.departmentName)   parts.push(pafAddress.departmentName);
  if (pafAddress.subBuildingName)  parts.push(pafAddress.subBuildingName);
  if (pafAddress.buildingName)     parts.push(pafAddress.buildingName);

  if (pafAddress.poBox) {
    parts.push(`PO BOX ${pafAddress.poBox}`);
  } else if (pafAddress.buildingNumber) {
    const street = pafAddress.dependentThoroughfare || pafAddress.thoroughfare;
    parts.push(street ? `${pafAddress.buildingNumber} ${street}` : pafAddress.buildingNumber);
  } else {
    if (pafAddress.dependentThoroughfare) parts.push(pafAddress.dependentThoroughfare);
    if (pafAddress.thoroughfare && pafAddress.thoroughfare !== pafAddress.dependentThoroughfare) {
      parts.push(pafAddress.thoroughfare);
    }
  }

  if (pafAddress.doubleDependentLocality) parts.push(pafAddress.doubleDependentLocality);
  if (pafAddress.dependentLocality)       parts.push(pafAddress.dependentLocality);
  if (pafAddress.postTown)                parts.push(pafAddress.postTown);
  if (pafAddress.postcode)                parts.push(pafAddress.postcode);

  return {
    formattedAddress:        parts,
    organisationName:        pafAddress.organisationName        || '',
    departmentName:          pafAddress.departmentName          || '',
    poBox:                   pafAddress.poBox                   || '',
    subBuildingName:         pafAddress.subBuildingName         || '',
    buildingName:            pafAddress.buildingName            || '',
    buildingNumber:          pafAddress.buildingNumber          || '',
    dependentThoroughfare:   pafAddress.dependentThoroughfare   || '',
    thoroughfare:            pafAddress.thoroughfare            || '',
    doubleDependentLocality: pafAddress.doubleDependentLocality || '',
    dependentLocality:       pafAddress.dependentLocality       || '',
    postTown:                pafAddress.postTown                || '',
    postcode:                pafAddress.postcode                || '',
    postcodeType:            pafAddress.postcodeType            || '',
    suOrganisationIndicator: pafAddress.suOrganisationIndicator || '',
    deliveryPointSuffix:     pafAddress.deliveryPointSuffix     || '',
    udprn:                   pafAddress.udprn                   || '',
    umprn:                   '',
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
 *   - All locality / town / postcode / B2B fields inherited from parent
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
    postcode:                parent.postcode,
    postTown:                parent.postTown,
    dependentLocality:       parent.dependentLocality,
    doubleDependentLocality: parent.doubleDependentLocality,
    thoroughfare:            parent.thoroughfare,
    dependentThoroughfare:   parent.dependentThoroughfare,
    buildingNumber:          parent.buildingNumber, // Owning DP's door number
    buildingName:            syntheticBuilding,
    subBuildingName:         syntheticSubBuilding,
    poBox:                   parent.poBox,
    departmentName:          parent.departmentName,
    organisationName:        parent.organisationName,
    udprn:                   parent.udprn,
    postcodeType:            parent.postcodeType,
    suOrganisationIndicator: parent.suOrganisationIndicator,
    deliveryPointSuffix:     parent.deliveryPointSuffix,
  };

  const model = mapToAddressModel(synthetic);

  // Override identifiers: keep parent UDPRN, add MR's UMPRN
  model.udprn = parent.udprn;
  model.umprn = mr.umprn;

  return model;
}
