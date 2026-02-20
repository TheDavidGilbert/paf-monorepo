# Changelog

All notable changes to the PAF Address Lookup Service will be documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
