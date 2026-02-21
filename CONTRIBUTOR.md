# Contribution Guide

This project is primarily intended to be forked and self-hosted. That said, bug
fixes, improvements, and documentation contributions are genuinely welcome.

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 9.x or higher
- A code editor (VS Code recommended)

### Setup

```bash
git clone https://github.com/TheDavidGilbert/paf-monorepo.git
cd paf-monorepo
pnpm install

# Place a PAF CSV file in packages/builder/input/ or use the existing sample
pnpm build:builder

# Run tests
pnpm test

# Start the API locally
pnpm dev:api
# Visit http://localhost:3000/health
```

## Ways to Contribute

- **Bug reports**: Open an issue with steps to reproduce, expected vs actual
  behaviour, and your environment
- **Feature requests**: Open an issue describing the use case
- **Documentation fixes**: Submit a PR directly
- **Code contributions**: For small fixes submit a PR; for larger changes open
  an issue first to discuss

## Coding Standards

### TypeScript

- Strict TypeScript — no `any`, explicit return types
- Use named exports; avoid default exports
- Use `.js` extensions on imports (ESM requirement)
- Node built-ins via `node:` prefix (e.g.
  `import { readFileSync } from 'node:fs'`)

### Style

- 2-space indentation, single quotes, semicolons required
- Trailing commas in multiline
- ESLint and Prettier are configured — run `pnpm lint` before submitting

### Tests

- All new code must have tests
- Coverage must stay above 95% (`pnpm test:coverage`)
- Use descriptive test names in the `describe / it` pattern
- Test both success paths and error/edge cases

## Development Workflow

```bash
# Create a branch
git checkout -b fix/your-description

# Make changes, then run tests
pnpm test

# Build to verify compilation
pnpm -r build

# Push and open a PR
git push origin fix/your-description
```

**Commit message format:**

```
<type>: <short description>

Types: feat, fix, docs, test, refactor, perf, chore
```

## Pull Request Process

Before submitting, verify:

- [ ] `pnpm test` passes
- [ ] `pnpm test:coverage` shows coverage above 95%
- [ ] `pnpm -r build` succeeds
- [ ] Documentation updated if behaviour changed
- [ ] Branch is up to date with `main`

PRs are reviewed by the maintainer. Address any feedback and the PR will be
merged when all checks pass.

## Project Structure

```
paf-monorepo/
├── packages/
│   ├── builder/          # CLI tool: converts PAF CSV to binary files
│   │   └── src/
│   └── api/              # Fastify REST API
│       ├── src/
│       │   ├── server.ts
│       │   ├── routes/
│       │   ├── models/
│       │   └── mappers/
│       └── data/         # Binary dataset output (generated)
├── eslint.config.js
├── .prettierrc.json
└── jest.config.cjs
```

## Questions?

Open a GitHub issue: https://github.com/TheDavidGilbert/paf-monorepo/issues

See [CODEOWNER.md](CODEOWNER.md) for maintainer details.
