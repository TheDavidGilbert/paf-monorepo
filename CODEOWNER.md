# Service Ownership

## Maintainer

This project is maintained by **David Gilbert**
([@TheDavidGilbert](https://github.com/TheDavidGilbert)).

For questions, bug reports, or feature requests, open an issue on GitHub:
https://github.com/TheDavidGilbert/paf-monorepo/issues

## Responsibilities

- Reviewing and merging pull requests
- Keeping dependencies up to date (`pnpm audit`, `pnpm update`)
- Publishing releases and updating the changelog
- Updating the PAF dataset when new Royal Mail data is available
- Responding to security disclosures (see [SECURITY.md](SECURITY.md))

## Key Design Principles

- **Simplicity**: Favour simple solutions over complex ones
- **Performance**: Optimise for read performance (in-memory binary lookups)
- **Reliability**: Fail gracefully, never corrupt data
- **Backward Compatibility**: Avoid breaking API changes when possible
- **Testability**: Maintain high test coverage

## Key Architectural Decisions

- **Binary storage format**: Chosen for performance and memory efficiency
- **In-memory dataset**: Trade memory for zero-latency lookups
- **Fastify over Express**: Performance and TypeScript support
- **Jest over Vitest**: ESM compatibility

## Useful Commands

```bash
pnpm install            # Install dependencies
pnpm build:builder      # Build dataset from CSV
pnpm dev:api            # Run API in development mode
pnpm test               # Run all tests
pnpm test:coverage      # Run tests with coverage report
pnpm audit              # Check for dependency vulnerabilities
```

## Key Files

| File                               | Purpose                  |
| ---------------------------------- | ------------------------ |
| `packages/builder/src/build.ts`    | Dataset builder          |
| `packages/api/src/server.ts`       | Fastify server entry     |
| `packages/api/src/routes/match.ts` | Match endpoint           |
| `eslint.config.js`                 | ESLint configuration     |
| `.prettierrc.json`                 | Prettier configuration   |
| `jest.config.cjs`                  | Test configuration       |
| `tsconfig.base.json`               | Shared TypeScript config |
