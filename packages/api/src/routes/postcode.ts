import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { searchPostcodePrefix } from '../dataset.js';

interface PostcodeSearchQuery {
  q?: string;
  limit?: string;
}

// Security: Input validation constants
const VALID_QUERY_CHARS = /^[A-Z0-9\s]+$/i; // Alphanumeric and spaces only
const MIN_QUERY_LENGTH = 2; // After normalisation (spaces stripped)
const MAX_QUERY_LENGTH = 7; // 7-byte binary key ceiling
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Postcode autocomplete route.
 *
 * GET /lookup/postcode?q=SW1A&limit=10
 *
 * Performs a prefix search across the loaded dataset's sorted postcode index.
 * The query is matched against the beginning of the stored postcode keys
 * (uppercase, spaces stripped), so "SW1A", "sw1a", and "SW1A 1" all work.
 *
 * Results are returned in alphabetical order and capped at `limit` (max 100).
 */
export function postcodeRoute(fastify: FastifyInstance): void {
  fastify.get('/lookup/postcode', async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, limit: limitParam } = request.query as PostcodeSearchQuery;

    // Validate query presence
    if (!q) {
      return reply.status(400).send({
        status: 400,
        message: 'Query parameter "q" is required',
      });
    }

    // Validate query characters (allow spaces — they are stripped before search)
    if (!VALID_QUERY_CHARS.test(q)) {
      return reply.status(400).send({
        status: 400,
        message: 'Query contains invalid characters',
        query: q,
      });
    }

    // Normalise: uppercase, strip spaces
    const normalizedQuery = q.toUpperCase().replace(/\s+/g, '');

    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      return reply.status(400).send({
        status: 400,
        message: `Query must be at least ${MIN_QUERY_LENGTH} characters`,
        query: q,
      });
    }

    if (normalizedQuery.length > MAX_QUERY_LENGTH) {
      return reply.status(400).send({
        status: 400,
        message: `Query must not exceed ${MAX_QUERY_LENGTH} characters`,
        query: q,
      });
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

    // Prefix search
    const postcodes = searchPostcodePrefix(normalizedQuery, limit);

    // Autocomplete results change only when the dataset is rebuilt; 1-hour cache is safe.
    reply.header('Cache-Control', 'public, max-age=3600, must-revalidate');
    reply.header('Vary', 'Accept-Encoding');

    return reply.status(200).send({
      status: 200,
      query: q,
      countryCode: 'GB',
      country: 'United Kingdom',
      total: postcodes.length,
      results: postcodes,
    });
  });
}
