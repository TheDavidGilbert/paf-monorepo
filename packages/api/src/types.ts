export interface Address {
  postcode: string;
  postTown: string;
  dependentLocality: string;
  doubleDependentLocality: string;
  thoroughfare: string;
  dependentThoroughfare: string;
  buildingNumber: string;
  buildingName: string;
  subBuildingName: string;
  poBox: string;
  departmentName: string;
  organisationName: string;
  udprn: string;
  postcodeType: string;
  suOrganisationIndicator: string;
  deliveryPointSuffix: string;
}

/** A single Multiple Residence unit record (linked to a PAF delivery point via UDPRN). */
export interface MRRecord {
  buildingNumber: string;
  buildingName: string;
  subBuildingName: string;
  umprn: string;
}

export interface Schema {
  format: string;
  fieldOrder: string[];
  fields: {
    key: string;
    csvName: string;
    csvIndex: number;
  }[];
}

export interface Meta {
  version: string;
  builtAt: string;
  format: string;
  rows: number;
  distinctPostcodes: number;
  fieldOrder: string[];
  checksums: Record<string, string>;
  /** Present when the dataset was built with Multiple Residence data. */
  mulRes?: {
    rows: number;
    distinctUdprns: number;
    checksums: Record<string, string>;
  };
}
