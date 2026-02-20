# PAF Address Lookup API - Consumer Guide

This guide provides everything you need to integrate with the PAF (Postcode
Address File) Address Lookup API.

> **Contributions welcome:** Found an issue or want a new feature? Contributions
> are welcome — see [CONTRIBUTOR.md](CONTRIBUTOR.md) for guidelines.

## Table of Contents

- [Quick Start](#quick-start)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [CORS Configuration](#cors-configuration)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Postcode Lookup](#postcode-lookup)
  - [Postcode Autocomplete](#postcode-autocomplete)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)
- [Rate Limiting](#rate-limiting)
- [Support](#support)

## Quick Start

### Basic Usage

```bash
# Check service health
curl http://localhost:3000/health

# Lookup addresses for a postcode
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"

# Autocomplete a partial postcode
curl "http://localhost:3000/lookup/autocomplete?q=SW1A"
```

### JavaScript Example

```javascript
const response = await fetch(
  'http://localhost:3000/lookup/postcode?postcode=SW1A%201AA'
);
const data = await response.json();

if (data.status === 200) {
  console.log(`Found ${data.results.length} addresses`);
  data.results.forEach((address) => {
    console.log(address.formattedAddress.join(', '));
  });
}
```

## Base URL

| Environment       | Base URL                             |
| ----------------- | ------------------------------------ |
| Local Development | `http://localhost:3000`              |
| Production        | _Configure based on your deployment_ |

**Note:** The default port is `3000`, but this can be configured via the `PORT`
environment variable.

## Authentication

Currently, the API does not require authentication. All endpoints are publicly
accessible.

## CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS). By default, only
`localhost` is allowed for local development.

**Default allowed origins:**

- **Local development**: `http://localhost:{port}` and
  `https://localhost:{port}` (any port)

**Adding Custom Domains:**

To allow requests from your own domains, edit `packages/api/src/server.ts` and
add your domain patterns to the CORS configuration. See the README for examples.

### CORS Headers

The API automatically includes the following CORS headers in responses:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Credentials`

Preflight requests (OPTIONS) are handled automatically.

## Endpoints

### Health Check

Check if the API is running and the dataset is loaded.

**Endpoint:** `GET /health`

**Response (200 OK):**

```json
{
  "status": "ok",
  "dataset": {
    "version": "paf-2026-02-07",
    "rows": 584266,
    "distinctPostcodes": 37150,
    "builtAt": "2026-02-07T10:30:45.123Z"
  }
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "error",
  "error": "Dataset not loaded"
}
```

**Use Cases:**

- Service monitoring
- Health checks in load balancers
- Deployment validation
- Dataset version verification

### Postcode Lookup

Retrieve addresses for a UK postcode.

**Endpoint:** `GET /lookup/postcode`

**Query Parameters:**

| Parameter  | Type   | Required | Description                                    | Example                 |
| ---------- | ------ | -------- | ---------------------------------------------- | ----------------------- |
| `postcode` | string | Yes      | UK postcode (case-insensitive, space optional) | `SW1A 1AA` or `SW1A1AA` |

**Example Requests:**

```bash
# With space (URL-encoded)
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"

# Without space
curl "http://localhost:3000/lookup/postcode?postcode=SW1A1AA"

# Lowercase (automatically normalised)
curl "http://localhost:3000/lookup/postcode?postcode=pl1%201lr"
```

## Response Format

All responses from `/lookup/postcode` follow the `SearchResponse` schema for
consistency with legacy address lookup systems.

### SearchResponse Object

```typescript
{
  status: number;           // HTTP status code
  code: number;             // Application error code (same as status)
  message: string;          // Human-readable message
  provider: string;         // Data provider (always "PAF")
  postCode: string;         // Normalised postcode from request
  countryCode: string;      // Country code from request
  country: string;          // Full country name
  fullAddress: boolean;     // Always true (complete address data)
  results: AddressModel[];  // Array of matching addresses
}
```

### AddressModel Object

Fields are returned in Royal Mail PAF format. All fields are always present;
optional PAF fields are empty strings when not applicable.

```typescript
{
  formattedAddress: string[];      // Address lines in display order (non-empty lines only)
  organisationName: string;        // Organisation name (B2B); empty for residential
  departmentName: string;          // Department name; empty when not applicable
  poBox: string;                   // PO Box number; present only for Large User records
  subBuildingName: string;         // Sub-building name (e.g., "FLAT 2")
  buildingName: string;            // Building name (e.g., "VICTORIA HOUSE")
  buildingNumber: string;          // Building number (e.g., "10", "12A")
  dependentThoroughfare: string;   // Secondary street name
  thoroughfare: string;            // Street name
  doubleDependentLocality: string; // Sub-area within a village
  dependentLocality: string;       // Village or area
  postTown: string;                // Royal Mail post town
  postcode: string;                // Full postcode
  postcodeType: string;            // 'S' (Small User) or 'L' (Large User / PO Box)
  suOrganisationIndicator: string; // 'Y' if Small User organisation; empty otherwise
  deliveryPointSuffix: string;     // Royal Mail delivery point suffix (e.g., "1A")
  udprn: string;                   // Unique Delivery Point Reference Number
  umprn: string;                   // Unique Multiple Residence Point Reference Number; empty for standard PAF
}
```

### Success Response Example

```json
{
  "status": 200,
  "code": 200,
  "message": "Success",
  "provider": "PAF",
  "postCode": "PL1 1LR",
  "countryCode": "GB",
  "country": "United Kingdom",
  "fullAddress": true,
  "results": [
    {
      "formattedAddress": ["88 Cornwall Street", "PLYMOUTH", "PL1 1LR"],
      "organisationName": "",
      "departmentName": "",
      "poBox": "",
      "subBuildingName": "",
      "buildingName": "",
      "buildingNumber": "88",
      "dependentThoroughfare": "",
      "thoroughfare": "Cornwall Street",
      "doubleDependentLocality": "",
      "dependentLocality": "",
      "postTown": "PLYMOUTH",
      "postcode": "PL1 1LR",
      "postcodeType": "S",
      "suOrganisationIndicator": "",
      "deliveryPointSuffix": "1A",
      "udprn": "12345678",
      "umprn": ""
    }
  ]
}
```

**Important Notes:**

- Results are sorted by building number: alphabetic first ("A", "B"), then
  numeric (1, 2, 10, 100)
- Some postcodes may return multiple addresses (e.g., flats, businesses)
- The `formattedAddress` array only includes non-empty lines

### Postcode Autocomplete

Return a list of full postcodes that match a partial input.

**Endpoint:** `GET /lookup/autocomplete`

**Query Parameters:**

| Parameter | Type   | Required | Description                                          | Example |
| --------- | ------ | -------- | ---------------------------------------------------- | ------- |
| `q`       | string | Yes      | Postcode prefix, 2–7 alphanumeric chars (normalised) | `SW1A`  |
| `limit`   | number | No       | Maximum results (1–100, default: 10)                 | `5`     |

**Example Requests:**

```bash
# Basic prefix search
curl "http://localhost:3000/lookup/autocomplete?q=SW1A"

# Limit results
curl "http://localhost:3000/lookup/autocomplete?q=SW1A&limit=5"

# Lowercase / with spaces (normalised automatically)
curl "http://localhost:3000/lookup/autocomplete?q=sw1a%201"
```

**Response (200 OK):**

```json
{
  "status": 200,
  "query": "SW1A",
  "countryCode": "GB",
  "country": "United Kingdom",
  "total": 2,
  "results": ["SW1A 1AA", "SW1A 2AA"]
}
```

**Error Responses:**

- **400 Bad Request** — missing, too short, too long, or invalid characters in
  `q`

  ```json
  { "status": 400, "error": "Query must be at least 2 characters" }
  ```

**Notes:**

- The query is uppercased and spaces are stripped before searching, so
  `"sw1a 1"` and `"SW1A1"` produce the same results.
- Results are sorted lexicographically (matching the binary index order).
- Responses are cached for 1 hour (`Cache-Control: public, max-age=3600`).

## Error Handling

### Error Response Format

All errors follow the same `SearchResponse` structure with an empty `results`
array.

### HTTP Status Codes

| Status Code | Meaning               | Common Cause                  |
| ----------- | --------------------- | ----------------------------- |
| 200         | Success               | Address(es) found             |
| 400         | Bad Request           | Invalid postcode format       |
| 404         | Not Found             | Valid postcode not in dataset |
| 500         | Internal Server Error | Server error                  |
| 503         | Service Unavailable   | Dataset not loaded            |

### Error Examples

#### 400 Bad Request - Invalid Postcode Format

```json
{
  "status": 400,
  "code": 400,
  "message": "Invalid UK postcode format",
  "provider": "PAF",
  "postCode": "",
  "countryCode": "GB",
  "country": "United Kingdom",
  "fullAddress": true,
  "results": []
}
```

**Triggers:**

- `postcode=INVALID`
- `postcode=12345`
- `postcode=`

#### 404 Not Found - Postcode Not in Dataset

```json
{
  "status": 404,
  "code": 404,
  "message": "Postcode not found",
  "provider": "PAF",
  "postCode": "",
  "countryCode": "GB",
  "country": "United Kingdom",
  "fullAddress": true,
  "results": []
}
```

**Triggers:**

- Valid postcode format but not in the dataset
- `postcode=ZZ99 9ZZ`

## Testing

### Health Check Testing

```bash
# Should return 200 OK with dataset metadata
curl -i http://localhost:3000/health

# Expected response
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "dataset": {
    "version": "paf-2026-02-07",
    "rows": 584266,
    "distinctPostcodes": 37150,
    "builtAt": "2026-02-07T10:30:45.123Z"
  }
}
```

### Test Status Code Generation

For integration testing, you can generate specific HTTP status codes using
special postcode patterns.

**Pattern:** `XXX X{code}` where `{code}` is a 3-digit HTTP status code

**Examples:**

```bash
# Generate 200 OK with mock data
curl "http://localhost:3000/lookup/postcode?postcode=XXX%20X200"

# Generate 400 Bad Request
curl "http://localhost:3000/lookup/postcode?postcode=XXX%20X400"

# Generate 404 Not Found
curl "http://localhost:3000/lookup/postcode?postcode=XXXX404"

# Generate 500 Internal Server Error
curl "http://localhost:3000/lookup/postcode?postcode=XXX%20X500"

# Generate 503 Service Unavailable
curl "http://localhost:3000/lookup/postcode?postcode=XXX%20X503"
```

**Test Response (200):**

```json
{
  "status": 200,
  "code": 200,
  "message": "Test response for status code 200",
  "provider": "PAF",
  "postCode": "XXX X200",
  "countryCode": "GB",
  "country": "United Kingdom",
  "fullAddress": true,
  "results": [
    {
      "formattedAddress": ["123 Test Street", "Test Town", "XXX X200"],
      "organisationName": "",
      "departmentName": "",
      "poBox": "",
      "subBuildingName": "",
      "buildingName": "Test Building",
      "buildingNumber": "123",
      "dependentThoroughfare": "",
      "thoroughfare": "Test Street",
      "doubleDependentLocality": "",
      "dependentLocality": "",
      "postTown": "Test Town",
      "postcode": "XXX X200",
      "postcodeType": "S",
      "suOrganisationIndicator": "",
      "deliveryPointSuffix": "1A",
      "udprn": "99999999",
      "umprn": ""
    }
  ]
}
```

**Use Cases:**

- Testing error handling in your application
- Verifying retry logic
- Simulating service failures
- Integration test automation

### Postcode Validation Testing

```bash
# Valid formats (all equivalent)
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"
curl "http://localhost:3000/lookup/postcode?postcode=SW1A1AA"
curl "http://localhost:3000/lookup/postcode?postcode=sw1a%201aa"

# Invalid formats (400 Bad Request)
curl "http://localhost:3000/lookup/postcode?postcode=INVALID"
curl "http://localhost:3000/lookup/postcode?postcode=12345"
curl "http://localhost:3000/lookup/postcode?postcode="

# Valid format but not found (404 Not Found)
curl "http://localhost:3000/lookup/postcode?postcode=ZZ99%209ZZ"
```

## Integration Examples

### JavaScript/TypeScript (Fetch API)

```typescript
interface SearchResponse {
  status: number;
  code: number;
  message: string;
  provider: string;
  postCode: string;
  countryCode: string;
  country: string;
  fullAddress: boolean;
  results: AddressModel[];
}

interface AddressModel {
  formattedAddress: string[];
  organisationName: string;
  departmentName: string;
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
  postcodeType: string;
  suOrganisationIndicator: string;
  deliveryPointSuffix: string;
  udprn: string;
  umprn: string;
}

async function lookupPostcode(postcode: string): Promise<SearchResponse> {
  const params = new URLSearchParams({
    postcode: postcode.trim(),
  });

  const response = await fetch(
    `http://localhost:3000/lookup/postcode?${params.toString()}`
  );

  const data: SearchResponse = await response.json();

  if (data.status !== 200) {
    throw new Error(`Lookup failed: ${data.message}`);
  }

  return data;
}

// Usage
try {
  const result = await lookupPostcode('SW1A 1AA');
  console.log(`Found ${result.results.length} addresses`);

  result.results.forEach((address) => {
    console.log(address.formattedAddress.join('\n'));
  });
} catch (error) {
  console.error('Address lookup failed:', error);
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

interface UsePostcodeLookup {
  lookup: (postcode: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  results: AddressModel[] | null;
}

function usePostcodeLookup(): UsePostcodeLookup {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AddressModel[] | null>(null);

  const lookup = useCallback(async (postcode: string) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const params = new URLSearchParams({
        postcode: postcode.trim(),
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/lookup/postcode?${params.toString()}`
      );

      const data: SearchResponse = await response.json();

      if (data.status !== 200) {
        setError(data.message);
      } else {
        setResults(data.results);
      }
    } catch (err) {
      setError('Failed to connect to address lookup service');
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error, results };
}

// Usage in component
function AddressLookup() {
  const { lookup, loading, error, results } = usePostcodeLookup();
  const [postcode, setPostcode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(postcode);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={postcode}
        onChange={(e) => setPostcode(e.target.value)}
        placeholder="Enter postcode"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>

      {error && <div className="error">{error}</div>}

      {results && (
        <ul>
          {results.map((address, i) => (
            <li key={address.udprn}>
              {address.formattedAddress.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
```

### Node.js (Axios)

```javascript
const axios = require('axios');

async function lookupPostcode(postcode) {
  try {
    const response = await axios.get('http://localhost:3000/lookup/postcode', {
      params: {
        postcode: postcode,
      },
    });

    if (response.data.status === 200) {
      return response.data.results;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data.message);
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server');
    } else {
      // Other errors
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Usage
lookupPostcode('SW1A 1AA')
  .then((addresses) => {
    console.log('Found addresses:', addresses.length);
    addresses.forEach((addr) => {
      console.log(addr.formattedAddress.join(', '));
    });
  })
  .catch((err) => {
    console.error('Lookup failed:', err.message);
  });
```

### Python (Requests)

```python
import requests
from typing import List, Dict, Optional

class AddressLookupClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')

    def health_check(self) -> Dict:
        """Check if the service is healthy."""
        response = requests.get(f"{self.base_url}/health")
        return response.json()

    def lookup_postcode(self, postcode: str) -> List[Dict]:
        """
        Lookup addresses for a UK postcode.

        Args:
            postcode: UK postcode (e.g., 'SW1A 1AA')

        Returns:
            List of address dictionaries

        Raises:
            ValueError: If postcode is invalid or not found
            requests.RequestException: If request fails
        """
        params = {
            'postcode': postcode.strip()
        }

        response = requests.get(
            f"{self.base_url}/lookup/postcode",
            params=params
        )

        data = response.json()

        if data['status'] != 200:
            raise ValueError(data['message'])

        return data['results']

# Usage
client = AddressLookupClient()

# Check health
health = client.health_check()
print(f"Service status: {health['status']}")
print(f"Dataset version: {health['dataset']['version']}")

# Lookup address
try:
    addresses = client.lookup_postcode('SW1A 1AA')
    print(f"Found {len(addresses)} addresses")

    for address in addresses:
        print('\n'.join(address['formattedAddress']))
        print()
except ValueError as e:
    print(f"Lookup failed: {e}")
```

## Best Practices

### Input Validation

Always validate and sanitize postcode input before sending to the API:

```javascript
function normalisePostcode(postcode) {
  // Remove extra whitespace
  postcode = postcode.trim().toUpperCase();

  // Validate format (basic check)
  const postcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}$/i;
  if (!postcodeRegex.test(postcode)) {
    throw new Error('Invalid UK postcode format');
  }

  return postcode;
}
```

### Error Handling

Always handle all possible error states:

```javascript
async function safePostcodeLookup(postcode) {
  try {
    const response = await fetch(
      `http://localhost:3000/lookup/postcode?postcode=${encodeURIComponent(postcode)}`
    );

    const data = await response.json();

    switch (data.status) {
      case 200:
        return { success: true, addresses: data.results };
      case 400:
        return { success: false, error: 'Invalid postcode format' };
      case 404:
        return { success: false, error: 'Postcode not found' };
      case 503:
        return { success: false, error: 'Service temporarily unavailable' };
      default:
        return { success: false, error: 'Unexpected error occurred' };
    }
  } catch (error) {
    return { success: false, error: 'Network error or service unavailable' };
  }
}
```

### Caching

Consider caching responses to reduce API calls:

```javascript
class PostcodeLookupCache {
  constructor(ttlMs = 3600000) {
    // 1 hour default
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  async lookup(postcode) {
    const key = postcode.toUpperCase().replace(/\s/g, '');
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const response = await fetch(
      `http://localhost:3000/lookup/postcode?postcode=${encodeURIComponent(postcode)}`
    );

    const data = await response.json();

    if (data.status === 200) {
      this.cache.set(key, {
        data: data,
        timestamp: Date.now(),
      });
    }

    return data;
  }

  clear() {
    this.cache.clear();
  }
}
```

### Timeout Configuration

Set appropriate timeouts for API requests:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  return await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('Request timeout');
  }
  throw error;
}
```

### Retry Logic

Implement retry logic for transient failures:

```javascript
async function lookupWithRetry(postcode, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `http://localhost:3000/lookup/postcode?postcode=${encodeURIComponent(postcode)}`
      );

      const data = await response.json();

      // Don't retry on client errors (4xx)
      if (data.status >= 400 && data.status < 500) {
        return data;
      }

      // Retry on server errors (5xx)
      if (data.status >= 500) {
        if (attempt === maxRetries) {
          return data;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }

      return data;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}
```

## Rate Limiting

**Current Status:** No rate limiting is currently enforced.

**Recommendations:**

- Implement client-side throttling to avoid overwhelming the service
- Cache frequently requested postcodes
- Batch requests when possible
- Contact the API maintainers if you need high-volume access

## Support

### Troubleshooting

**Service Unavailable (503)**

- Check if the service is running: `curl http://localhost:3000/health`
- Verify the dataset is loaded correctly
- Check server logs for errors

**CORS Errors**

- Ensure your domain matches the allowed origins
- Check that your request includes proper headers
- Verify you're using the correct protocol (http/https)

**Timeout Errors**

- Check network connectivity
- Verify the service is responsive via health endpoint
- Consider increasing timeout values
- Check for network proxy issues

### Contact

For issues, questions, or feature requests:

- Check the main [README.md](README.md) for developer documentation
- Review the API source code in `packages/api/src`
- Contact your development team for support

---

**Last Updated:** February 7, 2026  
**API Version:** 1.0.0  
**Data Provider:** Royal Mail PAF

## Additional Resources

- **[HOSTING.md](HOSTING.md)** - Performance characteristics, hosting
  requirements, and scaling recommendations
- **[SECURITY.md](SECURITY.md)** - Security policy and how to report
  vulnerabilities
- **[RUNBOOK.md](RUNBOOK.md)** - Operational procedures and troubleshooting (for
  service owners)
- **[CONTRIBUTOR.md](CONTRIBUTOR.md)** - How to contribute improvements or fixes
  to this service
- **[CODEOWNER.md](CODEOWNER.md)** - Service ownership, SLOs, and support
  contacts
- **[README.md](README.md)** - Developer setup and technical documentation
