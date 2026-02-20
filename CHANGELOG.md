# Changelog

All notable changes to the PAF Address Lookup Service will be documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0](https://github.com/TheDavidGilbert/paf-monorepo/compare/paf-monorepo-v1.1.0...paf-monorepo-v1.2.0) (2026-02-20)


### Features

* add Multiple Residence (MR) data support ([227bcc4](https://github.com/TheDavidGilbert/paf-monorepo/commit/227bcc4aa953bb4ad57512c175a34baa1d273cb5))
* add Multiple Residence (MR) data support ([2a2b053](https://github.com/TheDavidGilbert/paf-monorepo/commit/2a2b053b592c295d9b8464c94131cb510d33da52))
* **search:** implemented fuzzy lookahead search and other opts ([a1cdd66](https://github.com/TheDavidGilbert/paf-monorepo/commit/a1cdd66c1221fd4c1b2291ce2f655990e90975dc))
* **search:** implemented partial search endpoint and other opts ([05896fb](https://github.com/TheDavidGilbert/paf-monorepo/commit/05896fb37f69d04e63d42165317bb8e8c574185b))
* **versioning:** added release please ([f52355f](https://github.com/TheDavidGilbert/paf-monorepo/commit/f52355f218551b54cfe153d160852bb7ea8de90d))
* **versioning:** added release please ([b663704](https://github.com/TheDavidGilbert/paf-monorepo/commit/b663704a66d649bd0f325005c214091b45560860))


### Bug Fixes

* **ci:** removed version for action-setup ([e8ac583](https://github.com/TheDavidGilbert/paf-monorepo/commit/e8ac583ee3cac911ba87646ad62bdb8c52791443))
* **format:** formatting issues ([3d7e239](https://github.com/TheDavidGilbert/paf-monorepo/commit/3d7e239a30599501f80a1a195d38d01e8b1757a5))
* **spec:** added extra tests and updated openapi spec ([80108b6](https://github.com/TheDavidGilbert/paf-monorepo/commit/80108b6634f5176a9d231d1f45355a87600426c0))
* **tests:** schema misaligned with leftover field ([b768d8a](https://github.com/TheDavidGilbert/paf-monorepo/commit/b768d8a1c06db846a3aad98c86ed156b08a3a7d8))

## [1.1.0](https://github.com/TheDavidGilbert/paf-monorepo/compare/paf-monorepo-v1.0.0...paf-monorepo-v1.1.0) (2026-02-20)


### Features

* add Multiple Residence (MR) data support ([bee758c](https://github.com/TheDavidGilbert/paf-monorepo/commit/bee758c98d6d42d617422ac5e3c858cb6968d60f))
* add Multiple Residence (MR) data support ([984c256](https://github.com/TheDavidGilbert/paf-monorepo/commit/984c256ff4315bb33789684d36ff59c545e25d9a))
* **search:** implemented fuzzy lookahead search and other opts ([441275e](https://github.com/TheDavidGilbert/paf-monorepo/commit/441275eb61de8dc2bbf75a1f61a3a6d9bce1172d))
* **search:** implemented partial search endpoint and other opts ([f66c0ba](https://github.com/TheDavidGilbert/paf-monorepo/commit/f66c0bad6143bef05c243f88df45267be116789b))
* **versioning:** added release please ([3d7be14](https://github.com/TheDavidGilbert/paf-monorepo/commit/3d7be14c09c5543c8cc368c097b41f7c4124245d))
* **versioning:** added release please ([0d0bdab](https://github.com/TheDavidGilbert/paf-monorepo/commit/0d0bdab4cfc82d4421fa391c7e8dce2440456fba))


### Bug Fixes

* **ci:** removed version for action-setup ([8a90776](https://github.com/TheDavidGilbert/paf-monorepo/commit/8a907764461d0c5f13be3a4e0d1218bb3e578634))
* **format:** formatting issues ([1dc6dc7](https://github.com/TheDavidGilbert/paf-monorepo/commit/1dc6dc7b463ff1226a22dd18d7111159653d27ff))
* **spec:** added extra tests and updated openapi spec ([0d7b979](https://github.com/TheDavidGilbert/paf-monorepo/commit/0d7b979ff3461e8f9b861d8fbf161f23ea288f77))
* **tests:** schema misaligned with leftover field ([7c4a508](https://github.com/TheDavidGilbert/paf-monorepo/commit/7c4a508404cbef1508a105dcc741042bed156670))

## [1.0.0] - 2026-02-20

### Added

- Multiple Residence (MR) data support:
  - Builder auto-discovers `CSV MULRES/CSV Multiple Residence.csv` alongside the
    base PAF file
  - Builds a 5-file binary index (`mrRows.bin`, `mrRowStart.bin`, `mrUdprn.bin`,
    `mrStart.bin`, `mrEnd.bin`) keyed by zero-padded UDPRN for O(log n) binary
    search
  - Checksums written into `meta.json` under a `mulRes` key
  - API loads the MR index at startup (graceful no-op if files absent)
  - Postcode lookups suppress parent delivery points that have MR children and
    expand to individual unit records (e.g. "FLAT 1, 37 ACACIA AVENUE" instead
    of "37 ACACIA AVENUE")
  - `/health` response surfaces `dataset.mulRes` statistics when MR data is
    loaded
  - Fully backward-compatible: a build without the MR CSV produces no `mr*.bin`
    files and API behaviour is unchanged
- `udprn` and `umprn` string fields on `AddressModel` so consumers can identify
  and cross-reference individual delivery points and MR units
- README for Royal Mail input files explaining licensing requirements, expected
  directory structure, and setup instructions
- `/health/memory` endpoint with detailed memory statistics:
  - Heap usage (used, total, limit, available, percentages)
  - Process memory (RSS, external memory, array buffers)
  - V8 heap spaces breakdown
  - Garbage collection statistics
- ESLint import rules enforcement:
  - `import/no-default-export` to prevent default exports
  - `import/order` with `newlines-between: always` for consistent import
    ordering
  - `eslint-plugin-import` for import/export linting
- `coverage/` directory to .gitignore to exclude test coverage artifacts
- Jest testing framework with 97% code coverage (57 tests, updated from 55)
- CORS support for localhost (customizable for your own domains)
- Address sorting by building number (alphabetic then numeric)
- Test status code generation using special postcode patterns (XXX X200, etc.)
- Comprehensive documentation: CONSUMER.md, CONTRIBUTOR.md, CODEOWNER.md,
  HOSTING.md, SECURITY.md, RUNBOOK.md
- GitHub issue and PR templates for open source contributions
- CODE_OF_CONDUCT.md establishing community standards and behaviour guidelines
- SECURITY.md with vulnerability reporting procedures and security best
  practices
- RUNBOOK.md with operational procedures including:
  - Service restart and rollback procedures
  - Dataset update guide (step-by-step for 40M record updates)
  - Troubleshooting guide for common issues
- HOSTING.md with performance characteristics and hosting recommendations for
  memory-intensive deployment
  - AWS-specific infrastructure recommendations (ECS/EKS with r6g.xlarge
    instances)
  - Production sizing for 40 million Royal Mail PAF records (~9 GB RAM)
  - Container resource configurations for development and production
- Production readiness features:
  - Graceful shutdown handling (SIGTERM/SIGINT)
  - Enhanced health checks with separate liveness (`/health/live`) and readiness
    (`/health/ready`) endpoints
  - HTTP cache headers (24-hour caching for successful lookups and 404s)
  - Memory usage validation in readiness probe
  - Improved error handling for uncaught exceptions
  - Input validation security enhancements:
    - Maximum length check (10 characters) to prevent DoS via massive strings
    - Character whitelist validation (alphanumeric + spaces only)
- Code quality tooling:
  - ESLint configuration with TypeScript support
  - Prettier code formatter with consistent style rules
  - Pre-configured for monorepo with proper ignores

### Changed

- `.gitignore` updated to exclude `paf-documentation/` (proprietary Royal Mail
  PDF) and `.claude/` (Claude Code session data and worktrees)
- **License updated to MIT**: Changed to open source MIT license for public use
- CORS configuration now defaults to localhost only with documentation for
  adding custom domains
- Updated all documentation references from OWNER.md to CODEOWNER.md across:
  - README.md, CHANGELOG.md, CODE_OF_CONDUCT.md, CONSUMER.md, CONTRIBUTOR.md,
    HOSTING.md
  - .github/pull_request_template.md
- Removed `longitude` and `latitude` fields from SearchResponse API model
- Updated example postcodes in documentation from SW1A 1AA to PL1 1RZ (actual
  test data)
- Switched from Vitest to Jest for testing
- Updated response format to SearchResponse/AddressModel for backward
  compatibility
- Builder now sorts addresses by building number during build time

### Fixed

- All ESLint errors (52 total) across the codebase:
  - Type safety: Added type assertions for JSON.parse calls in dataset.ts and
    test files
  - Unused variables: Removed or prefixed with underscore per convention
  - Async functions: Removed unnecessary async declaration from lookupRoute
  - Nullish coalescing: Replaced logical OR (||) with nullish coalescing (??)
    operator
  - Promise handling: Added void operator for floating promises in event
    handlers
  - Non-null assertions: Replaced with explicit null checks in build.ts
  - Unused imports: Removed beforeAll from checksum.test.ts
  - Regex escapes: Fixed unnecessary escape in config.test.ts
- Import ordering: Auto-fixed with ESLint to enforce consistent grouping
- Binary file I/O coverage and error handling
- ESM module mocking in Jest tests

### Removed

- Royal Mail CSV data files removed from repository tracking; users must obtain
  their own Royal Mail PAF licence and supply data locally
- Internal company references removed from documentation to protect proprietary
  assets
- Tracked coverage files from git (38 files from packages/api/coverage and
  packages/builder/coverage)
- Coverage artifacts now regenerated on test runs and properly ignored

## [0.1.0] - 2026-02-07

### Added

- Initial release of PAF Address Lookup Service
- Binary builder for Royal Mail PAF CSV data
- Fastify REST API for postcode lookups
- Health check endpoint
- Postcode validation
- Binary search on sorted postcodes
- Comprehensive documentation

### Features

- Builder Package:
  - CSV parsing with Royal Mail PAF format
  - Binary row store generation
  - Postcode indexing with range queries
  - SHA-256 checksums for data integrity
  - 11 B2C-relevant fields extraction
- API Package:
  - GET /health endpoint
  - GET /address endpoint
  - Query parameters: country, postcode
  - SearchResponse format with AddressModel results
  - Error handling (400, 404, 422, 500, 503)
  - Fast in-memory lookups (O(log m))

### Technical Details

- TypeScript 5.3.3 with strict mode
- Node.js 20+ required
- pnpm workspaces monorepo
- ESM modules throughout
- Fastify 4.29.1
- Custom binary format: compact-rows/v1

---

## Version History Format

### [Version] - YYYY-MM-DD

#### Added

New features or capabilities

#### Changed

Changes in existing functionality

#### Deprecated

Features that will be removed in upcoming releases

#### Removed

Removed features or capabilities

#### Fixed

Bug fixes

#### Security

Security improvements or vulnerability fixes

---

## Contributing

When contributing, please:

1. Update this changelog in your PR
2. Add your changes under `[Unreleased]`
3. Follow the format above
4. Link to relevant issues/PRs
5. Credit contributors

See [CONTRIBUTOR.md](CONTRIBUTOR.md) for details.

---

## Links

- [Project Repository](https://github.com/TheDavidGilbert/paf-monorepo)
- [Issue Tracker](https://github.com/TheDavidGilbert/paf-monorepo/issues)
- [API Documentation](CONSUMER.md)
- [Contribution Guide](CONTRIBUTOR.md)
- [Ownership Guide](CODEOWNER.md)

---

<!-- version compare links — maintained automatically by release-please -->

[1.0.0]: https://github.com/TheDavidGilbert/paf-monorepo/releases/tag/v1.0.0
[0.1.0]: https://github.com/TheDavidGilbert/paf-monorepo/releases/tag/v0.1.0
