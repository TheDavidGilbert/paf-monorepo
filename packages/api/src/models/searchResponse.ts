import { AddressModel } from './addressModel.js';

export interface SearchResponse {
  message: string;
  code: number;
  status: number;
  provider: string;
  postCode: string;
  countryCode: string;
  country: string;
  fullAddress: boolean;
  results: AddressModel[];
}

export function createSearchResponse(
  status: number,
  code: number,
  message: string,
  provider = 'PAF'
): SearchResponse {
  return {
    status,
    code,
    message,
    provider,
    postCode: '',
    countryCode: '',
    country: '',
    fullAddress: true,
    results: [],
  };
}
