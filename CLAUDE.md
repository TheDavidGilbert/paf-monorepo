# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Commands

```bash
pnpm install                        # install dependencies
pnpm build:builder                  # compile builder + run: CSV → binary data files in packages/api/data/
pnpm --filter @paf/api build        # compile API only
pnpm dev:api                        # compile API + start with --watch
pnpm start:api                      # run compiled API (production)
pnpm test                           # run all tests (both packages)
pnpm lint                           # ESLint across workspace
pnpm format:check                   # Prettier check
pnpm format                         # Prettier fix

# Run tests in a single package
pnpm --filter @paf/api test
pnpm --filter @paf/builder test

# Run a single test file
pnpm --filter @paf/api test -- src/routes/address.test.ts

# Run a single test by name
pnpm --filter @paf/api test -- src/routes/address.test.ts -t "should return 400"

# Coverage
pnpm --filter @paf/api test:coverage
```

## Architecture

Two pnpm workspace packages: `@paf/builder` (data build pipeline) and `@paf/api`
(Fastify REST API). Both are ESM TypeScript targeting Node 20.

### Builder (`packages/builder`)

Converts Royal Mail PAF CSV files to compact binary datasets consumed by the
API. Entry point: `src/build.ts`.

**Input:** `packages/builder/input/CSV PAF/CSV PAF.csv` (required). Optional
Multiple Residence CSV at
`packages/builder/input/CSV MULRES/CSV Multiple Residence.csv`.

**Process:** Parse CSV → group rows by 7-byte normalised postcode key
(`normalisePostcodeForKey()` in `postcode.ts`) → sort by building number → write
binary files to `packages/api/data/`.

**Binary output files:**

- `rows.bin` / `rowStart.bin` — main row store with per-row byte offsets
- `distinctPcKey.bin` / `pcStart.bin` / `pcEnd.bin` — sorted 7-byte postcode
  keys and row ranges for binary search
- `thoroughfareKeys.bin` / `thoroughfareStart.bin` / `thoroughfareEnd.bin` /
  `thoroughfareSortedRows.bin` — optional street index (enabled by
  `ENABLE_STREET_INDEX=true`)
- `schema.json` / `meta.json` — field schema and build metadata
- MR variants (`mrRows.bin`, `mrRowStart.bin`, `mrUdprn.bin`, `mrStart.bin`,
  `mrEnd.bin`) if MR CSV is present

Field order is governed by `packages/builder/fields.config.json` (16 fields,
indices match PAF CSV column positions).

### API (`packages/api`)

Fastify 5 REST API. Entry point: `src/server.ts`, which loads binary data into
memory at startup via `src/dataset.ts`, then registers routes.

**Data access pattern:** All binary files load into typed arrays in memory
(`loadDataset()`). Lookups use binary search on `distinctPcKey.bin` to find row
ranges, then `decodeRow()` reads field offsets from `rowStart.bin` and decodes
UTF-8 from `rows.bin`. No database.

**Routes:**

- `GET /lookup/address?postcode=` — Returns all delivery points for a postcode.
  Integrates MR expansion (suppresses parent record, injects individual units).
  Test codes `XXX X<code>` return synthetic HTTP statuses.
- `GET /lookup/postcode?q=&limit=` — Prefix search for autocomplete, searches
  sorted postcode key array.
- `GET /lookup/street?q=&town=&limit=` — Street-level search; requires
  `ENABLE_STREET_INDEX=true` at startup.
- `GET /health`, `/health/live`, `/health/ready`, `/health/memory` — Standard
  Kubernetes probes + diagnostics.

**CORS** is hardcoded in `src/server.ts` — update the allowed-origins list
before deploying to production.

**Environment variables:** `PORT` (default 3000), `DATA_DIR` (default
`packages/api/data`), `ENABLE_STREET_INDEX` (default false), `NODE_OPTIONS` (set
`--max-old-space-size=10240` for full ~40M-row PAF dataset which needs ~10 GB
heap).

### Testing

Jest 30 with ts-jest ESM preset. API tests use `app.inject()` (no real server)
and `jest.unstable_mockModule()` to mock `dataset.ts`. Builder tests cover
postcode normalisation, binary I/O helpers, checksum, and MR index building.
Coverage excludes the top-level entry points (`server.ts`, `build.ts`).

Pre-commit hooks (Husky) run `lint:fix`, `format`, and the full test suite
automatically.
