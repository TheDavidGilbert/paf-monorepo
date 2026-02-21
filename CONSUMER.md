# PAF Address Lookup API - Consumer Guide

Everything you need to integrate with the PAF Address Lookup API.

## Table of Contents

- [Quick Start](#quick-start)
- [Base URL](#base-url)
- [Authentication & CORS](#authentication--cors)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Postcode Lookup](#postcode-lookup)
  - [Postcode Autocomplete](#postcode-autocomplete)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Test Postcodes](#test-postcodes)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Check service health
curl http://localhost:3000/health

# Lookup addresses for a postcode
curl "http://localhost:3000/lookup/address?postcode=SW1A%201AA"

# Autocomplete a partial postcode
curl "http://localhost:3000/lookup/postcode?q=SW1A"
```

```javascript
const response = await fetch(
  'http://localhost:3000/lookup/address?postcode=SW1A%201AA'
);
const data = await response.json();

if (data.status === 200) {
  data.results.forEach((address) => {
    console.log(address.formattedAddress.join(', '));
  });
}
```

## Base URL

| Environment | Base URL                           |
| ----------- | ---------------------------------- |
| Local       | `http://localhost:3000`            |
| Production  | Configure based on your deployment |

The default port is `3000`, configurable via the `PORT` environment variable.

## Authentication & CORS

The API has no authentication. All endpoints are open.

CORS is enforced: by default only `localhost` origins are allowed. To serve
browser-based clients from your own domain, update the CORS configuration in
`packages/api/src/server.ts`. See `README.md` for examples.

## Endpoints

### Health Check

Check whether the API is running and the dataset is loaded.

**`GET /health`**

**Response 200 OK:**

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

**Response 503 Service Unavailable:**

```json
{
  "status": "error",
  "error": "Dataset not loaded"
}
```

---

### Postcode Lookup

Retrieve all addresses for a UK postcode.

**`GET /lookup/address`**

**Query Parameters:**

| Parameter  | Type   | Required | Description                                       |
| ---------- | ------ | -------- | ------------------------------------------------- |
| `postcode` | string | Yes      | UK postcode — case-insensitive, space is optional |

**Examples:**

```bash
curl "http://localhost:3000/lookup/address?postcode=SW1A%201AA"
curl "http://localhost:3000/lookup/address?postcode=SW1A1AA"
curl "http://localhost:3000/lookup/address?postcode=pl1%201lr"
```

---

### Postcode Autocomplete

Return full postcodes matching a partial input.

**`GET /lookup/postcode`**

**Query Parameters:**

| Parameter | Type   | Required | Description                                    |
| --------- | ------ | -------- | ---------------------------------------------- |
| `q`       | string | Yes      | Postcode prefix — 2–7 alphanumeric chars       |
| `limit`   | number | No       | Maximum results to return (1–100, default: 10) |

**Examples:**

```bash
curl "http://localhost:3000/lookup/postcode?q=SW1A"
curl "http://localhost:3000/lookup/postcode?q=SW1A&limit=5"
curl "http://localhost:3000/lookup/postcode?q=sw1a%201"
```

**Response 200 OK:**

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

**Notes:**

- The query is uppercased and spaces stripped before searching — `"sw1a 1"` and
  `"SW1A1"` produce the same results
- Results are sorted lexicographically
- Responses are cached for 1 hour (`Cache-Control: public, max-age=3600`)

---

## Response Format

All `/lookup/address` responses follow the `SearchResponse` schema.

### SearchResponse

```typescript
{
  status: number;           // HTTP status code
  code: number;             // Same as status
  message: string;          // Human-readable message
  provider: string;         // Always "PAF"
  postCode: string;         // Normalised postcode
  countryCode: string;      // Always "GB"
  country: string;          // Always "United Kingdom"
  fullAddress: boolean;     // Always true
  results: AddressModel[];  // Array of matching addresses (empty on error)
}
```

### AddressModel

All fields are always present. Optional PAF fields are empty strings when not
applicable.

```typescript
{
  formattedAddress: string[];      // Address lines in display order (non-empty only)
  organisationName: string;        // Organisation name; empty for residential
  departmentName: string;          // Department; empty when not applicable
  poBox: string;                   // PO Box number; set only for Large User records
  subBuildingName: string;         // e.g. "FLAT 2"
  buildingName: string;            // e.g. "VICTORIA HOUSE"
  buildingNumber: string;          // e.g. "10", "12A"
  dependentThoroughfare: string;   // Secondary street name
  thoroughfare: string;            // Street name
  doubleDependentLocality: string; // Sub-area within a village
  dependentLocality: string;       // Village or area
  postTown: string;                // Royal Mail post town
  postcode: string;                // Full postcode
  postcodeType: string;            // "S" (Small User) or "L" (Large User / PO Box)
  suOrganisationIndicator: string; // "Y" if Small User organisation; empty otherwise
  deliveryPointSuffix: string;     // e.g. "1A"
  udprn: string;                   // Unique Delivery Point Reference Number
  umprn: string;                   // Unique Multiple Residence Reference Number; empty for standard PAF
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

Results are sorted by building number: alphabetic entries first ("A", "B"), then
numeric (1, 2, 10, 100).

## Error Handling

### HTTP Status Codes

| Status | Meaning               | Common Cause                  |
| ------ | --------------------- | ----------------------------- |
| 200    | Success               | Address(es) found             |
| 400    | Bad Request           | Invalid postcode format       |
| 404    | Not Found             | Valid postcode not in dataset |
| 500    | Internal Server Error | Server error                  |
| 503    | Service Unavailable   | Dataset not loaded            |

### 400 Bad Request

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

Triggered by: empty `postcode`, non-UK format (e.g. `12345`, `INVALID`).

### 404 Not Found

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

Triggered by: valid format but postcode not present in the dataset (e.g.
`ZZ99 9ZZ`).

## Test Postcodes

The API recognises special test postcodes that return predictable responses
without requiring real PAF data. Use these in integration tests.

**Pattern:** `XXX X{code}` where `{code}` is a 3-digit HTTP status code.

```bash
# 200 OK with mock address data
curl "http://localhost:3000/lookup/address?postcode=XXX%20X200"

# 400 Bad Request
curl "http://localhost:3000/lookup/address?postcode=XXX%20X400"

# 404 Not Found
curl "http://localhost:3000/lookup/address?postcode=XXXX404"

# 500 Internal Server Error
curl "http://localhost:3000/lookup/address?postcode=XXX%20X500"

# 503 Service Unavailable
curl "http://localhost:3000/lookup/address?postcode=XXX%20X503"
```

**Test 200 response:**

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
      "buildingNumber": "123",
      "thoroughfare": "Test Street",
      "postTown": "Test Town",
      "postcode": "XXX X200",
      "postcodeType": "S",
      "udprn": "99999999",
      "organisationName": "",
      "departmentName": "",
      "poBox": "",
      "subBuildingName": "",
      "buildingName": "Test Building",
      "dependentThoroughfare": "",
      "doubleDependentLocality": "",
      "dependentLocality": "",
      "suOrganisationIndicator": "",
      "deliveryPointSuffix": "1A",
      "umprn": ""
    }
  ]
}
```

## Integration Examples

### JavaScript / TypeScript (Fetch)

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

async function lookupPostcode(
  baseUrl: string,
  postcode: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({ postcode: postcode.trim() });
  const response = await fetch(`${baseUrl}/lookup/address?${params}`);
  return response.json() as Promise<SearchResponse>;
}

// Usage
const data = await lookupPostcode('http://localhost:3000', 'SW1A 1AA');

if (data.status === 200) {
  data.results.forEach((address) => {
    console.log(address.formattedAddress.join('\n'));
  });
} else if (data.status === 404) {
  console.log('Postcode not found');
} else if (data.status === 400) {
  console.log('Invalid postcode format');
}
```

### Node.js (backend)

```javascript
const BASE_URL = process.env.PAF_API_URL ?? 'http://localhost:3000';

async function lookupPostcode(postcode) {
  const url = `${BASE_URL}/lookup/address?postcode=${encodeURIComponent(postcode)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 200) return data.results;
  if (data.status === 404) return [];
  throw new Error(`PAF lookup failed: ${data.message} (${data.status})`);
}

// Usage
const addresses = await lookupPostcode('SW1A 1AA');
addresses.forEach((addr) => console.log(addr.formattedAddress.join(', ')));
```

## Best Practices

### Input validation

The API validates postcodes server-side, but validating before sending reduces
unnecessary requests:

```javascript
function isValidUkPostcode(postcode) {
  return /^[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}$/i.test(postcode.trim());
}
```

### Error handling

Always handle all status codes — do not assume every request returns 200:

```javascript
switch (data.status) {
  case 200:
    return data.results;
  case 400:
    throw new Error('Invalid postcode format');
  case 404:
    return []; // Postcode not in dataset — treat as no results
  case 503:
    throw new Error('PAF service temporarily unavailable');
  default:
    throw new Error(`Unexpected error: ${data.status}`);
}
```

### Caching

Postcode data changes infrequently. Cache responses client-side for at least an
hour to avoid redundant lookups, particularly for address form autocomplete
flows.

### Timeouts

The API responds in well under 100 ms under normal conditions. A 5-second
timeout is more than sufficient:

```javascript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timer);
  return await response.json();
} catch (err) {
  if (err.name === 'AbortError') throw new Error('PAF lookup timed out');
  throw err;
}
```

### Rate limiting

No rate limiting is enforced by the API. If you are running high-volume lookups,
cache aggressively and avoid hammering the service with burst requests.

---

**See also:** [HOSTING.md](HOSTING.md) | [SECURITY.md](SECURITY.md) |
[RUNBOOK.md](RUNBOOK.md) | [README.md](README.md)
