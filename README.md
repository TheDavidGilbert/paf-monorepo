# PAF Monorepo — Self-Hosted UK Postcode & Address Lookup API

[![CI](https://github.com/TheDavidGilbert/paf-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/TheDavidGilbert/paf-monorepo/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.7-black)](https://www.fastify.io/)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Linter: ESLint](https://img.shields.io/badge/linter-ESLint-4B32C3)](https://eslint.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Node.js monorepo for processing Royal Mail PAF (Postcode Address File) CSV
data and serving postcode lookups via a REST API.

## Licence & Data Requirements

<!-- prettier-ignore -->
> [!IMPORTANT]
> **You must hold a valid Royal Mail PAF licence before using this project with the full Royal Mail PAF dataset either internally or in a production setting.**
>
> This project does **not** include any Royal Mail data. It is a framework for
> processing and serving PAF data that you supply yourself. You are solely
> responsible for obtaining the correct licence for your use case and ensuring
> ongoing compliance with Royal Mail's terms of use.
>
> - [PAF information and licensing](https://www.poweredbypaf.com/)
> - [Register to download sample data](https://www.poweredbypaf.com/download-sample-data/)
> - [Developer resources](https://www.poweredbypaf.com/resources/)

## About This Project

This project is free to use, fork, and build on. It is designed for developers
who need a fast, self-hosted UK address lookup service and already have access
to Royal Mail PAF data.

There is **no database**. All address data is loaded into memory at startup from
binary files pre-built from your PAF CSV data. This means zero query latency at
the cost of RAM — RAM requirements range from ~230 MB for the sample dataset up
to ~9 GB for the full 40 million record PAF (12 GB recommended allocation). See
[HOSTING.md](HOSTING.md) for the full breakdown by dataset size.

You are responsible for:

- Obtaining your own Royal Mail PAF licence
- Providing your own PAF CSV data files
- Building the binary dataset files using `@paf/builder`
- Ensuring your deployment complies with Royal Mail's terms

<!-- prettier-ignore -->
> [!NOTE]
> You may download this project and test against the sample PAF data provided by
> Royal Mail.  This is the best way to determine if this project is suitable for 
> your needs.

## Use Cases

This project is a good fit if you need to:

- Build a **UK address lookup** or **postcode finder** into your own application
- Self-host a **postcode-to-address API** without relying on a third-party
  service
- Run **UK address validation** entirely on your own infrastructure with no
  per-lookup fees
- Replace a commercial address lookup API (e.g. in e-commerce checkout flows or
  CRM systems)
- Process and query the **full Royal Mail PAF dataset** (~40 million delivery
  points) with sub-millisecond response times
- Embed a **postcode autocomplete** feature backed by live PAF data

It is not a fit if you do not hold (or cannot obtain) a Royal Mail PAF licence.

## Documentation

- **[openapi.yaml](openapi.yaml)** - OpenAPI 3.1 specification (import into
  Postman, Swagger UI, Redoc, or any OpenAPI-compatible tool)
- **[CONSUMER.md](CONSUMER.md)** - API integration guide for service consumers
- **[CONTRIBUTOR.md](CONTRIBUTOR.md)** - How to contribute
- **[CODEOWNER.md](CODEOWNER.md)** - Service ownership and maintenance guide
- **[HOSTING.md](HOSTING.md)** - Performance and hosting
  requirements/recommendations
- **[SECURITY.md](SECURITY.md)** - Security policy and vulnerability reporting
- **[RUNBOOK.md](RUNBOOK.md)** - Operational procedures and troubleshooting
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community standards and
  behaviour guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes

## Overview

This project consists of two packages:

- **`@paf/builder`**: A build tool that reads Royal Mail PAF CSV files, extracts
  relevant fields, and generates compact binary row stores with lookup indexes.
  Results are sorted by building number (alphabetic first, then numeric) for
  consistent ordering.
- **`@paf/api`**: A Fastify REST API that loads binary assets into memory and
  serves fast postcode lookups with CORS support.

### Key Features

- **Fast lookups**: Binary search on sorted postcodes with O(log m) complexity
- **Postcode autocomplete**: `GET /lookup/postcode` returns matching postcodes
  for partial input (e.g. "SW1A" or "SW1A 1")
- **Street search** _(optional)_: `GET /lookup/street` searches by thoroughfare
  prefix and building number — enable with `ENABLE_STREET_INDEX=true`
- **Compact storage**: Custom binary format optimised for memory efficiency
- **Sorted results**: Addresses sorted by building number (alpha first, then
  numeric)
- **CORS enabled**: Configured for localhost by default (easily customisable)
- **Type-safe**: Full TypeScript implementation with strict mode
- **Well-tested**: Jest test suite covering all routes, mappers, and dataset
  logic (106 tests)
- **Test helpers**: Special postcode patterns for generating test HTTP responses
- **Production-ready**: Graceful shutdown, health checks, HTTP caching, and
  operational runbooks
- **Code quality**: ESLint, Prettier, and Husky pre-commit hooks configured

## Requirements

- **Node.js** 20+
- **pnpm** 9+

## Project Structure

```
paf-monorepo/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── .gitignore
├── .editorconfig
└── packages/
    ├── builder/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── fields.config.json
    │   ├── src/
    │   │   ├── build.ts
    │   │   ├── config.ts
    │   │   ├── postcode.ts
    │   │   ├── checksum.ts
    │   │   └── io.ts
    │   ├── input/
    │   │   ├── CSV PAF/
    │   │   │   └── CSV PAF.csv          (required: main PAF delivery points)
    │   │   └── CSV MULRES/
    │   │       └── CSV Multiple Residence.csv  (optional: MR unit data)
    │   └── out/                        (default output directory)
    └── api/
        ├── package.json
        ├── tsconfig.json
        ├── src/
        │   ├── server.ts
        │   ├── dataset.ts
        │   ├── postcode.ts
        │   ├── types.ts
        │   └── routes/
        │       ├── address.ts
        │       ├── postcode.ts
        │       └── street.ts
        └── data/                       (binary assets location)
```

## Setup

### 1. Install dependencies

```bash
cd paf-monorepo
pnpm install
```

### 2. Place your Royal Mail PAF CSV files

Place your PAF CSV files in the builder input directory:

```
packages/builder/input/CSV PAF/CSV PAF.csv               (required)
packages/builder/input/CSV MULRES/CSV Multiple Residence.csv  (optional)
```

See [packages/builder/input/README.md](packages/builder/input/README.md) for
full details on licensing requirements and file placement.

The main PAF CSV uses the Royal Mail standard format. All 16 fields are
extracted into the binary output:

- Postcode (0)
- Post Town (1)
- Dependent Locality (2)
- Double Dependent Locality (3)
- Thoroughfare & Descriptor (4)
- Dependent Thoroughfare & Descriptor (5)
- Building Number (6)
- Building Name (7)
- Sub Building Name (8)
- PO Box (9)
- Department Name (10)
- Organisation Name (11)
- UDPRN (12)
- Postcode Type (13) — `S` Small User / `L` Large User
- SU Organisation Indicator (14)
- Delivery Point Suffix (15)

## Usage

### Building Binary Assets

Run the builder to process the CSV and generate binary files:

```bash
pnpm build:builder
```

This will:

1. Read `packages/builder/input/CSV PAF/CSV PAF.csv`
2. Extract all 16 PAF fields and generate binary files in `packages/api/data/`:
   - `rows.bin` — Compact row store
   - `rowStart.bin` — Row offset index
   - `distinctPcKey.bin` — Distinct postcode keys (sorted)
   - `pcStart.bin` — Postcode range start indexes
   - `pcEnd.bin` — Postcode range end indexes
   - `schema.json` — Field schema
   - `meta.json` — Metadata with checksums
   - `thoroughfareKeys.bin` — Sorted thoroughfare keys (street search index)
   - `thoroughfareStart.bin` — Thoroughfare range start indexes
   - `thoroughfareEnd.bin` — Thoroughfare range end indexes
   - `thoroughfareSortedRows.bin` — Row indexes sorted by thoroughfare and
     building number
3. If `packages/builder/input/CSV MULRES/CSV Multiple Residence.csv` is present,
   also generate Multiple Residence binary files:
   - `mrRows.bin` - MR unit row store
   - `mrRowStart.bin` - MR row offset index
   - `mrUdprn.bin` - Sorted UDPRN keys
   - `mrStart.bin` - MR range start indexes per UDPRN
   - `mrEnd.bin` - MR range end indexes per UDPRN

#### Custom Builder Options

You can customise the builder with CLI flags:

```bash
pnpm --filter @paf/builder build -- --input path/to/your.csv --out path/to/output --version my-version
```

Options:

- `--input` (optional): Path to the Royal Mail PAF CSV file (default:
  `packages/builder/input/CSV PAF/CSV PAF.csv`)
- `--out` (optional): Output directory (default: `packages/api/data`)
- `--version` (optional): Version string for metadata (default:
  `paf-YYYY-MM-DD`)

### Running the API

#### Development Mode (with auto-reload)

```bash
pnpm dev:api
```

#### Production Mode

```bash
pnpm --filter @paf/api build
pnpm start:api
```

The API will:

1. Load binary assets from `packages/api/data/` (or `DATA_DIR` environment
   variable)
2. Start listening on port `3000` (or `PORT` environment variable)
3. Log dataset metadata

#### Environment Variables

- `PORT` - Server port (default: `3000`)
- `DATA_DIR` - Path to binary data directory (default: `packages/api/data`)
- `ENABLE_STREET_INDEX` - Load the thoroughfare index and enable
  `GET /lookup/street` (default: `false`)

Examples:

```bash
# Standard start (Unix / Git Bash)
PORT=8080 DATA_DIR=/path/to/data pnpm start:api

# Street search enabled (Unix / Git Bash)
ENABLE_STREET_INDEX=true pnpm start:api
ENABLE_STREET_INDEX=true pnpm dev:api

# Street search enabled (PowerShell)
$env:ENABLE_STREET_INDEX="true"; pnpm start:api
$env:ENABLE_STREET_INDEX="true"; pnpm dev:api

# Street search enabled (Command Prompt)
set ENABLE_STREET_INDEX=true && pnpm start:api
set ENABLE_STREET_INDEX=true && pnpm dev:api
```

### CORS Configuration

The API is configured with Cross-Origin Resource Sharing (CORS) support. By
default, only `localhost` is allowed for local development.

**Default allowed origins:**

- `http://localhost:{port}` - Local development (any port)
- `https://localhost:{port}` - Local development with HTTPS (any port)

**Adding Custom Domains:**

To allow requests from your own domains in production, edit the CORS
configuration in `packages/api/src/server.ts`:

```typescript
await fastify.register(cors, {
  origin: [
    /^https?:\/\/localhost:\d+$/, // localhost (default)
    /\.yourdomain\.com$/, // Add: *.yourdomain.com
    'https://www.example.com', // Add: exact origin match
  ],
  credentials: true,
});
```

**Pattern examples:**

- `/\.yourdomain\.com$/` - Matches all subdomains of yourdomain.com
- `'https://www.example.com'` - Exact origin match (string)
- `/^https:\/\/[\w-]+\.example\.com$/` - Custom regex pattern

**Preflight requests** (OPTIONS) are handled automatically by the
`@fastify/cors` plugin.

## API Endpoints

> **Detailed API Documentation:** See [CONSUMER.md](CONSUMER.md) for
> comprehensive endpoint documentation, integration examples, and best
> practices.

### Health Checks

**Combined Health Check:**

```bash
GET /health
```

Returns dataset status, uptime, and memory usage.

**Response (200 OK):**

```json
{
  "status": "ok",
  "uptime": 12345,
  "dataset": {
    "version": "paf-POC",
    "rows": 123456,
    "distinctPostcodes": 45678,
    "builtAt": "2026-02-07T12:34:56.789Z"
  },
  "memory": {
    "heapUsed": 2048,
    "heapTotal": 4096,
    "rss": 4500
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

**Liveness Probe** (Kubernetes/ECS):\*\*

```bash
GET /health/live
```

Always returns 200 if the process is running. Used to determine if container
should be restarted.

**Response (200 OK):**

```json
{
  "status": "alive",
  "uptime": 12345,
  "timestamp": "2026-02-07T12:34:56.789Z"
}
```

**Readiness Probe** (Kubernetes/ECS):\*\*

```bash
GET /health/ready
```

Returns 200 only when service is ready to serve traffic (dataset loaded, memory
usage healthy).

**Response (200 OK):**

```json
{
  "status": "ready",
  "dataset": {
    "rows": 123456,
    "distinctPostcodes": 45678
  },
  "memory": {
    "heapUsagePercent": 65
  }
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "not_ready",
  "reason": "Dataset not loaded",
  "error": "Cannot read property 'meta' of undefined"
}
```

**Memory Statistics:**

```bash
GET /health/memory
```

Returns detailed memory usage statistics including heap, process memory, heap
spaces, and V8 statistics.

**Response (200 OK):**

```json
{
  "uptime": 12345,
  "heap": {
    "usedMB": 2048,
    "totalMB": 4096,
    "limitMB": 10240,
    "availableMB": 8192,
    "usedPercent": 50.0,
    "totalUsedPercent": 20.0
  },
  "process": {
    "rssMB": 4500,
    "externalMB": 100,
    "arrayBuffersMB": 50
  },
  "heapSpaces": [
    {
      "name": "new_space",
      "sizeMB": 16,
      "usedMB": 8,
      "availableMB": 8,
      "physicalMB": 16
    },
    {
      "name": "old_space",
      "sizeMB": 3072,
      "usedMB": 1536,
      "availableMB": 1536,
      "physicalMB": 3072
    }
  ],
  "statistics": {
    "totalHeapSizeMB": 4096,
    "totalHeapSizeExecutableMB": 512,
    "totalPhysicalSizeMB": 4096,
    "totalAvailableSizeMB": 8192,
    "mallocedMemoryMB": 100,
    "peakMallocedMemoryMB": 150,
    "doesZapGarbage": 0
  }
}
```

### Postcode Lookup

```bash
GET /lookup/address?postcode=<postcode>
```

**Query Parameters:**

- `postcode` (required): UK postcode (case-insensitive, optional space)

**Example:**

```bash
curl "http://localhost:3000/lookup/address?postcode=PL1%201RZ"
```

**Response Format:**

The API returns a `SearchResponse` object containing an array of `AddressModel`
objects. This format is designed for backward compatibility with existing
address lookup consumers.

**Response (200 OK):**

```json
{
  "status": 200,
  "code": 200,
  "message": "Success",
  "provider": "PAF",
  "postCode": "PL1 1RZ",
  "countryCode": "GB",
  "country": "United Kingdom",
  "fullAddress": true,
  "results": [
    {
      "formattedAddress": ["0 TEST STREET", "PLYMOUTH", "PL1 1RZ"],
      "organisationName": "",
      "departmentName": "",
      "poBox": "",
      "subBuildingName": "",
      "buildingName": "",
      "buildingNumber": "0",
      "dependentThoroughfare": "",
      "thoroughfare": "TEST STREET",
      "doubleDependentLocality": "",
      "dependentLocality": "",
      "postTown": "PLYMOUTH",
      "postcode": "PL1 1RZ",
      "postcodeType": "S",
      "suOrganisationIndicator": "",
      "deliveryPointSuffix": "1A",
      "udprn": "12345678",
      "umprn": ""
    }
  ]
}
```

**Note:** Results are automatically sorted by building number with alphabetic
values first (e.g., "A", "B"), followed by numeric values in ascending order
(e.g., "1", "2", "10", "100").

**Error Responses:**

- **400 Bad Request** - Invalid postcode format

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

- **404 Not Found** - Postcode not in dataset

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

### Postcode Autocomplete

```bash
GET /lookup/postcode?q=<prefix>&limit=<n>
```

**Query Parameters:**

- `q` (required): Postcode prefix, 2–7 alphanumeric characters
  (case-insensitive, spaces stripped automatically)
- `limit` (optional): Maximum results to return (1–100, default: 10)

**Example:**

```bash
curl "http://localhost:3000/lookup/postcode?q=SW1A&limit=5"
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

**Note:** Results are cached for 1 hour. The query is normalised to uppercase
with spaces removed before searching, so `"sw1a 1"` and `"SW1A1"` produce the
same results.

### Street Search _(optional feature)_

Requires `ENABLE_STREET_INDEX=true` and a rebuilt dataset. Returns 503 when not
enabled.

```bash
GET /lookup/street?q=<query>&town=<town>&limit=<n>
```

**Query Parameters:**

- `q` (required): Free-text query — building number + thoroughfare prefix (e.g.
  `"38 Flora"`, `"Flora Court"`)
- `town` (optional): Post town to filter results (e.g. `PLYMOUTH`)
- `limit` (optional): Maximum results (1–50, default: 20)

**Parsing rule:** if the first token is a building number (`38`, `38A`), it is
used as a filter; the remainder is the thoroughfare prefix (minimum 3
characters).

**Example:**

```bash
curl "http://localhost:3000/lookup/street?q=38+Flora&town=PLYMOUTH"
```

**Response (200 OK):**

```json
{
  "status": 200,
  "query": "38 Flora",
  "countryCode": "GB",
  "country": "United Kingdom",
  "total": 1,
  "results": [
    {
      "formattedAddress": ["38 FLORA COURT", "PLYMOUTH", "PL1 1LR"],
      "buildingNumber": "38",
      "thoroughfare": "FLORA COURT",
      "postTown": "PLYMOUTH",
      "postcode": "PL1 1LR",
      "postcodeType": "S",
      "udprn": "12345678",
      "umprn": ""
    }
  ]
}
```

> **Note:** PAF stores full street descriptors (`ROAD`, `STREET`, `AVENUE`,
> `CLOSE`) — abbreviations will not match.

## Binary Format

### Format: `compact-rows/v1`

All binary files use **little-endian** byte order.

#### `rows.bin`

Each row consists of:

1. **Header** (32 bytes): Sixteen `uint16` values representing field lengths in
   bytes
2. **Payload**: Concatenated UTF-8 field bytes in fixed order

Field order:

1. postcode
2. postTown
3. dependentLocality
4. doubleDependentLocality
5. thoroughfare
6. dependentThoroughfare
7. buildingNumber
8. buildingName
9. subBuildingName
10. poBox
11. departmentName
12. organisationName
13. udprn
14. postcodeType
15. suOrganisationIndicator
16. deliveryPointSuffix

#### `rowStart.bin`

`Uint32Array` of byte offsets into `rows.bin`, one per row.

#### `distinctPcKey.bin`

Buffer of 7-byte postcode keys (normalised, sorted lexicographically).

- Normalisation: uppercase, no spaces, padded to 7 bytes
- Example: `PL1 1RZ` → `PL11RZ·` (· represents space padding)

#### `pcStart.bin` & `pcEnd.bin`

`Uint32Array` pairs defining row index ranges `[start, end)` for each distinct
postcode.

#### `schema.json`

Field schema with ordered field keys:

```json
{
  "format": "compact-rows/v1",
  "fieldOrder": ["postcode", "postTown", ...],
  "fields": [...]
}
```

#### `meta.json`

Metadata:

```json
{
  "version": "paf-POC",
  "builtAt": "2026-02-07T12:34:56.789Z",
  "format": "compact-rows/v1",
  "rows": 123456,
  "distinctPostcodes": 45678,
  "fieldOrder": [...],
  "checksums": {
    "rows.bin": "abc123...",
    "rowStart.bin": "def456...",
    ...
  }
}
```

## Testing

### Automated Tests

The project uses **Jest** for testing with comprehensive coverage.

#### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage reports
pnpm test:coverage
```

#### Package-Specific Tests

```bash
# Test builder only
pnpm --filter @paf/builder test

# Test API only
pnpm --filter @paf/api test
```

#### Coverage

- **Builder**: 30 tests — postcode normalisation, configuration parsing,
  checksum computation, binary I/O, MR index building
- **API**: 76 tests — postcode validation, address mapping, response formatting,
  all three routes with mocked dataset (including street search)

**Total: 106 tests**

### Manual API Testing

After starting the API, test with:

```bash
# Health check
curl http://localhost:3000/health

# Memory statistics
curl http://localhost:3000/health/memory

# Valid postcode lookup
curl "http://localhost:3000/lookup/address?postcode=PL1%201RZ"

# Invalid postcode format
curl "http://localhost:3000/lookup/address?postcode=INVALID"

# Postcode not found
curl "http://localhost:3000/lookup/address?postcode=ZZ99%209ZZ"

# Autocomplete prefix search
curl "http://localhost:3000/lookup/postcode?q=PL1"

# Street search (requires ENABLE_STREET_INDEX=true)
curl "http://localhost:3000/lookup/street?q=38+Flora&town=PLYMOUTH"
```

### Test Response Generation

For integration testing, the API supports generating specific HTTP status codes
on demand using special postcode patterns:

**Format:** `XXX X{code}` where `{code}` is the desired HTTP status code (3
digits)

**Examples:**

```bash
# Generate 200 OK with mock data
curl "http://localhost:3000/lookup/address?postcode=XXX%20X200"

# Generate 404 Not Found
curl "http://localhost:3000/lookup/address?postcode=XXXX404"

# Generate 400 Bad Request
curl "http://localhost:3000/lookup/address?postcode=XXX%20X400"

# Generate 500 Internal Server Error
curl "http://localhost:3000/lookup/address?postcode=XXX%20X500"

# Generate 503 Service Unavailable
curl "http://localhost:3000/lookup/address?postcode=XXX%20X503"
```

This feature is useful for testing error handling in client applications without
requiring special test environments.

## Troubleshooting

### Common Issues

**"Dataset not loaded" error on startup**

- Ensure you've run `pnpm build:builder` first
- Check that binary files exist in `packages/api/data/`
- Verify `DATA_DIR` environment variable if using custom path

**Jest tests failing with ESM errors**

- Tests use experimental VM modules (Node.js flag required)
- This is handled automatically in package.json scripts
- If running Jest directly, use:
  `node --experimental-vm-modules node_modules/jest/bin/jest.js`

**TypeScript compilation errors**

- Ensure you're using Node.js 20+
- Check that all dependencies are installed: `pnpm install`
- Clear build cache: `rm -rf packages/*/dist`

**CORS errors in browser**

- Verify your domain is in the allowed origins list
- Check server logs to confirm CORS headers are being sent

**Binary file corruption**

- Re-run the builder: `pnpm build:builder`
- Check checksums in `packages/api/data/meta.json`
- Verify input CSV file is not corrupted

**Port already in use**

- Change the port: `PORT=8080 pnpm start:api`
- Check for other processes: `lsof -i :3000` (macOS/Linux) or
  `netstat -ano | findstr :3000` (Windows)

### Performance Optimization

**Slow startup:**

- Dataset loading is synchronous and proportional to file size
- Sample dataset: 2-5 seconds startup time
- **Production (40M records): 8-12 seconds startup time**
- Startup time is a one-time cost for long-running service

**Memory usage:**

- All data is loaded into memory for fast lookups
- Development (sample dataset ~600K addresses): ~350 MB RAM
- **Production (40M Royal Mail PAF records): ~8-10 GB RAM**
- Recommended allocation: 2 GB (dev), 12 GB (production)
- See [HOSTING.md](HOSTING.md) for detailed memory requirements and instance
  sizing

**Lookup performance:**

- Binary search: O(log m) where m = distinct postcodes
- Expected lookup time: <1ms for indexed postcodes
- Multiple addresses per postcode: O(k) where k = addresses

## Architecture

### Builder Package

```
CSV Input → Parse Rows → Group by Postcode → Sort by Building Number
  ↓
Generate Binary Files:
  - rows.bin (compact row storage)
  - rowStart.bin (row offsets)
  - distinctPcKey.bin (sorted postcode keys)
  - pcStart.bin, pcEnd.bin (postcode range indexes)
  - thoroughfareKeys.bin (sorted thoroughfare keys — street search index)
  - thoroughfareStart.bin, thoroughfareEnd.bin, thoroughfareSortedRows.bin
  - schema.json, meta.json (metadata + checksums)
```

**Key Design Decisions:**

- In-memory grouping for sorting (trade-off: memory for correctness)
- Binary format for compact storage and fast reads
- UTF-8 encoding for international character support
- Checksums for data integrity verification

### API Package

```
Startup: Load Binary Files → Build In-Memory Indexes
  ↓
Request → Normalise Postcode → Binary Search → Decode Rows → Map to Response
```

**Key Design Decisions:**

- Synchronous loading for simplicity (dataset is static)
- Binary search on sorted keys for O(log m) lookups
- Buffer slicing for zero-copy row access
- Response format matches legacy API for backward compatibility

## Deployment

> **Infrastructure Requirements**: Production deployments with large datasets
> (40M+ records) require substantial memory (12+ GB RAM). See
> [HOSTING.md](HOSTING.md) for complete infrastructure requirements, instance
> sizing, and monitoring setup.

### Production Checklist

- [ ] Build production dataset: `pnpm build:builder`
- [ ] Compile TypeScript: `pnpm --filter @paf/api build`
- [ ] Run tests: `pnpm test`
- [ ] Verify test coverage: `pnpm test:coverage`
- [ ] Set environment variables (`PORT`, `DATA_DIR`, `NODE_OPTIONS`)
- [ ] Configure CORS origins for your production domains
- [ ] Verify binary data files are included in deployment artifact
- [ ] Set up infrastructure with adequate memory (12+ GB for full dataset)
- [ ] Configure health check monitoring
- [ ] Set up log aggregation
- [ ] Configure alerts (503 errors, memory, latency)
- [ ] Consider APM integration (New Relic, Datadog, etc.)

### Docker Example

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/

# Install pnpm and dependencies
RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/api ./packages/api
RUN pnpm --filter @paf/api build

# Copy pre-built binary data
COPY packages/api/data ./packages/api/data

# Expose port
EXPOSE 3000

# Health check (production: allow 20s initial delay for 40M record load)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Set memory limit for production (40M records)
ENV NODE_OPTIONS="--max-old-space-size=10240"

# Start server
CMD ["node", "packages/api/dist/server.js"]
```

**Production Docker run:**

```bash
# Development (sample dataset)
docker run -p 3000:3000 -m 2g paf-api:latest

# Production (40M records)
docker run -p 3000:3000 -m 12g paf-api:latest

# Production with street search enabled (~215 MB extra RAM)
docker run -p 3000:3000 -m 12g -e ENABLE_STREET_INDEX=true paf-api:latest
```

### Environment Variables

| Variable              | Default             | Description                                                                  |
| --------------------- | ------------------- | ---------------------------------------------------------------------------- |
| `PORT`                | `3000`              | HTTP server port                                                             |
| `DATA_DIR`            | `packages/api/data` | Path to binary data files                                                    |
| `NODE_ENV`            | —                   | Set to `production` for production deployments                               |
| `NODE_OPTIONS`        | —                   | Node.js options. Production: `--max-old-space-size=10240` (10 GB heap)       |
| `LOG_LEVEL`           | `info`              | Logging level (`info`, `warn`, `error`)                                      |
| `ENABLE_STREET_INDEX` | `false`             | Set to `true` to load the thoroughfare index and enable `GET /lookup/street` |

## Performance Characteristics

- **Startup**: Synchronous loading of binary assets (~O(n) for file size)
- **Lookup**:
  - Binary search on distinct postcodes: O(log m) where m = distinct postcodes
  - Row decoding: O(k) where k = addresses per postcode
  - No file I/O during requests
  - Minimal allocations (Buffer slicing, no parsing)

## Development

### Project Structure

- TypeScript 5+ with strict mode enabled
- pnpm workspaces for monorepo management
- Jest for testing with 97% average coverage
- ESM modules throughout
- Fastify 4 for high-performance API
- ESLint + Prettier for code quality and consistency

### Code Quality

**Linting:**

```bash
# Check for linting errors
pnpm lint

# Auto-fix linting errors
pnpm lint:fix
```

**Formatting:**

```bash
# Check code formatting
pnpm format:check

# Auto-format all files
pnpm format
```

**Pre-commit hooks:**

Husky is configured to run the following automatically on every commit:

```bash
pnpm lint:fix
pnpm format
pnpm test
```

### Development Dependencies

| Package           | Version | Purpose                         |
| ----------------- | ------- | ------------------------------- |
| TypeScript        | 5.3.3   | Type safety and compilation     |
| Jest              | 30.2.0  | Testing framework               |
| ts-jest           | 29.4.6  | TypeScript support for Jest     |
| ESLint            | 9.17.0  | Code linting and quality checks |
| typescript-eslint | 8.18.2  | TypeScript support for ESLint   |
| Prettier          | 3.4.2   | Code formatting                 |
| @types/node       | 20.11.0 | Node.js type definitions        |
| @types/jest       | 30.0.0  | Jest type definitions           |
| Fastify           | 4.29.1  | Web framework (API package)     |
| @fastify/cors     | 8.5.0   | CORS support (API package)      |

### Building Individual Packages

```bash
# Build builder only
pnpm --filter @paf/builder build

# Build API only
pnpm --filter @paf/api build

# Build all packages
pnpm -r build
```

### Code Quality

- **Strict TypeScript**: All code uses strict mode with no implicit any
- **ESM Modules**: Pure ES modules (no CommonJS)
- **Type Safety**: Full type coverage with explicit return types
- **Test Coverage**: 97% statement coverage across both packages

### Contributing

When contributing to this project:

1. **Write tests** for new features (maintain >95% coverage)
2. **Run all tests** before committing: `pnpm test`
3. **Follow TypeScript strict mode** guidelines
4. **Use ESM imports** with `.js` extensions
5. **Document public APIs** with JSDoc comments
6. **Update CONSUMER.md** for any API changes

### File Naming Conventions

- Source files: `camelCase.ts`
- Test files: `camelCase.test.ts`
- Config files: `kebab-case.config.cjs` (CommonJS) or `.json`
- Type files: `PascalCase` for interfaces/types

## Contributing

This is an **open source project** - we welcome contributions from the
community!

**Quick Start for Contributors:**

1. Read [CONTRIBUTOR.md](CONTRIBUTOR.md) for detailed guidelines
2. Check [existing issues](../../issues) or create a new one
3. Fork and create a feature branch
4. Make your changes with tests (maintain >95% coverage)
5. Submit a pull request

**What We're Looking For:**

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🧪 Test coverage improvements
- 💡 Performance optimizations

See [CONTRIBUTOR.md](CONTRIBUTOR.md) for complete contribution guidelines,
coding standards, and PR process.

## License

MIT License - see [LICENSE](LICENSE) file for details.

**Royal Mail PAF Data:** This software processes Royal Mail Postcode Address
File (PAF) data. Users are responsible for obtaining their own Royal Mail PAF
license and ensuring compliance with Royal Mail's terms and conditions. This
software license does not grant any rights to use Royal Mail PAF data. Please
contact Royal Mail for licensing information.
