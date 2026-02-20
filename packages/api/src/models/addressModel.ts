export interface AddressModel {
  formattedAddress: string[];
  thoroughfare: string;
  buildingName: string;
  subBuildingName: string;
  subBuildingNumber: string;
  buildingNumber: string;
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  locality: string;
  townOrCity: string;
  county: string;
  district: string;
  state: string;
  stateCode: string;
  /** UDPRN for standard PAF records; empty string for non-PAF sources. */
  udprn: string;
  /** UMPRN for Multiple Residence records; empty string for standard PAF records. */
  umprn: string;
}
