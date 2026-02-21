import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { hasThoroughfareIndex, searchByAddressPrefix } from '../dataset.js';
import { mapToAddressModel } from '../mappers/addressMapper.js';

interface StreetSearchQuery {
  q?: string;
  town?: string;
  limit?: string;
}

const MAX_QUERY_LENGTH = 80;
const MAX_TOWN_LENGTH = 60;
const MIN_THOROUGHFARE_PREFIX = 3;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Alphanumeric + space + hyphen + apostrophe — covers all PAF thoroughfare characters
const VALID_QUERY_CHARS = /^[A-Z0-9\s\-']+$/i;

/** Numeric-only or numeric + single trailing letter (e.g. "38", "38A"). */
const BUILDING_NUMBER_RE = /^\d+[A-Z]?$/i;

interface ParsedQuery {
  buildingNumber: string | null;
  thoroughfarePrefix: string;
}

/**
 * Split raw query into an optional building number and a thoroughfare prefix.
 *
 * Rule: if the first whitespace-separated token looks like a building number
 * (digits with optional trailing letter), treat it as such and join the rest
 * as the thoroughfare prefix. Otherwise the whole query is the prefix.
 *
 * Examples:
 *   "38 Flora"       → { buildingNumber: "38",  thoroughfarePrefix: "FLORA" }
 *   "38A High Stre"  → { buildingNumber: "38A", thoroughfarePrefix: "HIGH STRE" }
 *   "Flora Court"    → { buildingNumber: null,  thoroughfarePrefix: "FLORA COURT" }
 */
function parseStreetQuery(raw: string): ParsedQuery {
  const tokens = raw.trim().toUpperCase().split(/\s+/);

  if (tokens.length > 1 && BUILDING_NUMBER_RE.test(tokens[0])) {
    return {
      buildingNumber: tokens[0],
      thoroughfarePrefix: tokens.slice(1).join(' '),
    };
  }

  return { buildingNumber: null, thoroughfarePrefix: tokens.join(' ') };
}

/**
 * Street search route.
 *
 * GET /lookup/street?q=38+Flora&town=PLYMOUTH&limit=20
 *
 * Performs a prefix search across the thoroughfare index. The first token is
 * treated as a building number if it is purely numeric (with optional trailing
 * letter); the remaining tokens form the thoroughfare prefix. A minimum of
 * three thoroughfare prefix characters is required.
 *
 * Returns 503 when the street index has not been loaded
 * (ENABLE_STREET_INDEX is not set to "true").
 */
export function streetRoute(fastify: FastifyInstance): void {
  fastify.get('/lookup/street', async (request: FastifyRequest, reply: FastifyReply) => {
    // Feature guard — index not loaded
    if (!hasThoroughfareIndex()) {
      return reply.status(503).send({
        status: 503,
        message:
          'Street search is not enabled on this instance. ' +
          'Set ENABLE_STREET_INDEX=true and ensure the dataset was built with street index support.',
      });
    }

    const { q, town: townParam, limit: limitParam } = request.query as StreetSearchQuery;

    // Require query
    if (!q) {
      return reply.status(400).send({
        status: 400,
        message: 'Query parameter "q" is required',
      });
    }

    if (q.length > MAX_QUERY_LENGTH) {
      return reply.status(400).send({
        status: 400,
        message: `Query must not exceed ${MAX_QUERY_LENGTH} characters`,
      });
    }

    if (!VALID_QUERY_CHARS.test(q)) {
      return reply.status(400).send({
        status: 400,
        message:
          'Query contains invalid characters (alphanumeric, spaces, hyphens and apostrophes only)',
        query: q,
      });
    }

    const { buildingNumber, thoroughfarePrefix } = parseStreetQuery(q);

    if (thoroughfarePrefix.length < MIN_THOROUGHFARE_PREFIX) {
      return reply.status(400).send({
        status: 400,
        message: `Thoroughfare prefix must be at least ${MIN_THOROUGHFARE_PREFIX} characters (after removing the building number)`,
        query: q,
      });
    }

    // Optional town filter
    let town: string | null = null;
    if (townParam !== undefined) {
      if (townParam.length > MAX_TOWN_LENGTH) {
        return reply.status(400).send({
          status: 400,
          message: `Town must not exceed ${MAX_TOWN_LENGTH} characters`,
        });
      }
      if (!VALID_QUERY_CHARS.test(townParam)) {
        return reply.status(400).send({
          status: 400,
          message: 'Town contains invalid characters',
        });
      }
      town = townParam.trim().toUpperCase();
    }

    // Parse and clamp limit
    let limit = DEFAULT_LIMIT;
    if (limitParam !== undefined) {
      const parsed = parseInt(limitParam, 10);
      if (isNaN(parsed) || parsed < 1) {
        return reply.status(400).send({
          status: 400,
          message: 'Limit must be a positive integer',
        });
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    const addresses = searchByAddressPrefix(thoroughfarePrefix, buildingNumber, town, limit);
    const results = addresses.map(mapToAddressModel);

    reply.header('Cache-Control', 'public, max-age=3600, must-revalidate');
    reply.header('Vary', 'Accept-Encoding');

    return reply.status(200).send({
      status: 200,
      query: q,
      countryCode: 'GB',
      country: 'United Kingdom',
      total: results.length,
      results,
    });
  });
}
