export interface AddressModel {
  formattedAddress: string[];
  /** Organisation name (B2B). Empty string for residential addresses. */
  organisationName: string;
  /** Department name within the organisation. Empty string when not applicable. */
  departmentName: string;
  /** PO Box number. Present only for Large User (postcodeType = 'L') records. */
  poBox: string;
  subBuildingName: string;
  buildingName: string;
  buildingNumber: string;
  dependentThoroughfare: string;
  thoroughfare: string;
  doubleDependentLocality: string;
  dependentLocality: string;
  postTown: string;
  postcode: string;
  /** 'S' for Small User (residential/small business) or 'L' for Large User (PO Box). */
  postcodeType: string;
  /** 'Y' if the organisation at this address is a Small User organisation; empty otherwise. */
  suOrganisationIndicator: string;
  deliveryPointSuffix: string;
  /** UDPRN for standard PAF records; empty string for non-PAF sources. */
  udprn: string;
  /** UMPRN for Multiple Residence records; empty string for standard PAF records. */
  umprn: string;
}
