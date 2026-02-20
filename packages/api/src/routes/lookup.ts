import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { isValidUkPostcode, normalisePostcodeForKey } from '../postcode.js';
import { findPostcodeRange, decodeRow, findMRRange, decodeMRRow, padUdprn, hasMRData } from '../dataset.js';
import { createSearchResponse } from '../models/searchResponse.js';
import { mapToAddressModel, mapMRToAddressModel } from '../mappers/addressMapper.js';

interface QueryParams {
  postcode?: string;
}

// Security: Input validation constants
const MAX_POSTCODE_LENGTH = 10; // UK postcodes are max 7-8 chars, adding buffer
const VALID_POSTCODE_CHARS = /^[A-Z0-9\s]+$/i; // Alphanumeric and spaces only

/**
 * Check if postcode is a test pattern to generate specific HTTP status codes.
 * Format: XXX X{statusCode} (e.g., "XXX X404", "XXX X400", "XXX X422", "XXX X200")
 * Returns the status code if it's a test pattern, otherwise null.
 */
function getTestStatusCode(postcode: string): number | null {
  const normalized = postcode.toUpperCase().replace(/\s+/g, '');
  const match = /^XXX[A-Z]?(\d{3})$/.exec(normalized);
  if (match) {
    const code = parseInt(match[1], 10);
    // Only allow valid status codes that this API uses
    if ([200, 400, 404, 422, 500, 503].includes(code)) {
      return code;
    }
  }
  return null;
}

export function lookupRoute(fastify: FastifyInstance): void {
  fastify.get('/lookup/postcode', async (request: FastifyRequest, reply: FastifyReply) => {
    const { postcode } = request.query as QueryParams;

    // Set cache headers for successful lookups
    // Dataset rarely changes, safe to cache for 24 hours
    const setCacheHeaders = (status: number) => {
      if (status === 200 || status === 404) {
        reply.header('Cache-Control', 'public, max-age=86400, must-revalidate');
        reply.header('Vary', 'Accept-Encoding');
      } else {
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    };

    // Validate postcode presence
    if (!postcode) {
      setCacheHeaders(400);
      const response = createSearchResponse(400, 400, 'Postcode is required');
      response.countryCode = 'GB';
      response.country = 'United Kingdom';
      return reply.status(400).send(response);
    }

    // Security: Validate postcode length (prevent DoS via massive strings)
    if (postcode.length > MAX_POSTCODE_LENGTH) {
      setCacheHeaders(400);
      const response = createSearchResponse(400, 400, 'Postcode exceeds maximum length');
      response.postCode = postcode.substring(0, 20) + '...'; // Truncate in response
      response.countryCode = 'GB';
      response.country = 'United Kingdom';
      return reply.status(400).send(response);
    }

    // Security: Validate postcode characters (only allow alphanumeric + space)
    if (!VALID_POSTCODE_CHARS.test(postcode)) {
      setCacheHeaders(400);
      const response = createSearchResponse(400, 400, 'Postcode contains invalid characters');
      response.postCode = postcode;
      response.countryCode = 'GB';
      response.country = 'United Kingdom';
      return reply.status(400).send(response);
    }

    // Check for test status code pattern (e.g., "XXX X404")
    const testStatusCode = getTestStatusCode(postcode);
    if (testStatusCode !== null) {
      setCacheHeaders(testStatusCode);
      const messages: Record<number, string> = {
        200: 'Test success response',
        400: 'Test bad request',
        404: 'Test not found',
        422: 'Test unprocessable entity',
        500: 'Test internal server error',
        503: 'Test service unavailable',
      };

      const response = createSearchResponse(
        testStatusCode,
        testStatusCode,
        messages[testStatusCode] || 'Test response'
      );
      response.postCode = postcode;
      response.countryCode = 'GB';
      response.country = 'United Kingdom';

      // For 200 status, add mock address data
      if (testStatusCode === 200) {
        response.results = [
          {
            formattedAddress: ['Test Address', 'Test Street', 'Test Town', postcode],
            thoroughfare: 'Test Street',
            buildingName: '',
            subBuildingName: '',
            subBuildingNumber: '',
            buildingNumber: '1',
            line1: '1 Test Street',
            line2: '',
            line3: '',
            line4: '',
            locality: '',
            townOrCity: 'Test Town',
            county: '',
            district: '',
            state: '',
            stateCode: '',
            udprn: '',
            umprn: '',
          },
        ];
      }

      return reply.status(testStatusCode).send(response);
    }

    // Validate UK postcode format
    if (!isValidUkPostcode(postcode)) {
      setCacheHeaders(400);
      const response = createSearchResponse(400, 400, 'Invalid UK postcode format');
      response.postCode = postcode;
      response.countryCode = 'GB';
      response.country = 'United Kingdom';
      return reply.status(400).send(response);
    }

    // Normalise to 7-byte key
    const key7 = normalisePostcodeForKey(postcode);

    // Search in distinct postcode index
    const range = findPostcodeRange(key7);

    if (!range) {
      // Log lookup request (not found)
      console.log(JSON.stringify({ postcode: key7.trim(), count: 0, found: false }));

      setCacheHeaders(404);
      const response = createSearchResponse(404, 404, 'Postcode not found');
      response.postCode = postcode;
      response.countryCode = 'GB';
      response.country = 'United Kingdom';
      return reply.status(404).send(response);
    }

    // Decode all rows in the range and expand with MR data where available
    const [startRow, endRow] = range;
    const addressModels = [];

    for (let i = startRow; i < endRow; i++) {
      const pafAddress = decodeRow(i);

      // If this delivery point has Multiple Residence records, expand to individual units
      // and suppress the parent delivery point (per agreed behaviour).
      // hasMRData() guard avoids the binary search entirely when MR files were not built.
      if (pafAddress.udprn && hasMRData()) {
        const mrRange = findMRRange(padUdprn(pafAddress.udprn));
        if (mrRange) {
          const [mrStart, mrEnd] = mrRange;
          for (let j = mrStart; j < mrEnd; j++) {
            addressModels.push(mapMRToAddressModel(pafAddress, decodeMRRow(j)));
          }
          continue; // Parent DP suppressed
        }
      }

      // No MR data — return the standard PAF address
      addressModels.push(mapToAddressModel(pafAddress));
    }

    // Log lookup request
    console.log(JSON.stringify({ postcode: key7.trim(), count: addressModels.length, found: true }));

    // Create successful response
    setCacheHeaders(200);
    const response = createSearchResponse(200, 200, 'Success');
    response.postCode = postcode;
    response.countryCode = 'GB';
    response.country = 'United Kingdom';
    response.results = addressModels;

    return reply.status(200).send(response);
  });
}
