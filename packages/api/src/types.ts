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
  udprn: string;
  deliveryPointSuffix: string;
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
}
