# Contribution Guide

Welcome! We're excited that you're interested in contributing to the PAF Address
Lookup Service. This guide will help you get started with contributing to our
innersource project.

## Table of Contents

- [About Innersource](#about-innersource)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Communication](#communication)
- [Recognition](#recognition)
- [Code of Conduct](#code-of-conduct)

## About Innersource

This project follows the **innersource** model: it's open for collaboration
across our organization, allowing teams to contribute improvements while core
owners maintain the project.

### Benefits of Contributing

- **Fix bugs** that affect your team immediately
- **Add features** your team needs
- **Improve documentation** based on your experience
- **Learn** from code reviews and collaboration
- **Build** your reputation as a contributor
- **Influence** the roadmap and technical decisions

### Innersource Principles

1. **Shared Ownership**: Everyone can contribute, owners maintain quality
2. **Transparency**: Development happens in the open
3. **Meritocracy**: Good ideas win, regardless of source
4. **Documentation**: Everything is documented for newcomers
5. **Welcoming**: We support and mentor contributors

## Ways to Contribute

You don't need to write code to contribute! Here are many ways to help:

### 🐛 Report Bugs

Found a bug? Create an issue with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behaviour
- Service version and environment
- Example postcode that demonstrates the issue

[Create a bug report →](../../issues/new?template=bug_report.md)

### 💡 Suggest Features

Have an idea? Create a feature request with:

- Use case: What problem does this solve?
- Proposed solution: How should it work?
- Alternatives considered: What else did you think about?
- Impact: Which teams would benefit?

[Request a feature →](../../issues/new?template=feature_request.md)

### 📝 Improve Documentation

Documentation contributions are highly valued:

- Fix typos or clarify confusing sections
- Add examples from your integration experience
- Improve the API documentation in CONSUMER.md
- Update the README with better explanations
- Add troubleshooting tips you've discovered

### 🧪 Write Tests

Help improve code quality:

- Add test cases for edge cases
- Improve test coverage (goal: >95%)
- Add integration test examples
- Performance benchmarks

### 🎨 Code Contributions

Fix bugs or implement features:

- Small fixes: Just submit a PR
- Large features: Discuss with owners first
- Performance improvements: Include benchmarks
- Refactoring: Explain the benefits

### 👀 Review Pull Requests

Help review others' contributions:

- Test the changes locally
- Check code quality and standards
- Provide constructive feedback
- Approve when ready

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 9.x or higher
- **Git** with company credentials configured
- A code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd paf-monorepo
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build the dataset**

   ```bash
   # Place a PAF CSV file in packages/builder/input/ or use the sample
   pnpm build:builder
   ```

4. **Run tests**

   ```bash
   pnpm test
   ```

   All tests should pass ✓

5. **Start the API locally**

   ```bash
   pnpm dev:api
   ```

   Visit http://localhost:3000/health

6. **Verify everything works**
   ```bash
   curl "http://localhost:3000/address?country=GB&postcode=SW1A%201AA"
   ```

### Project Structure

```
paf-monorepo/
├── packages/
│   ├── builder/          # Dataset builder
│   │   ├── src/          # TypeScript source
│   │   │   ├── build.ts       # Main build logic
│   │   │   ├── config.ts      # CLI config
│   │   │   ├── postcode.ts    # Postcode utilities
│   │   │   ├── checksum.ts    # File checksums
│   │   │   ├── io.ts          # Binary I/O
│   │   │   └── *.test.ts      # Unit tests
│   │   ├── input/        # Input CSV files
│   │   └── package.json
│   └── api/              # REST API
│       ├── src/          # TypeScript source
│       │   ├── server.ts      # Fastify server
│       │   ├── dataset.ts     # Dataset loader
│       │   ├── postcode.ts    # Postcode validation
│       │   ├── types.ts       # Type definitions
│       │   ├── models/        # Response models
│       │   ├── mappers/       # Data mappers
│       │   ├── routes/        # API routes
│       │   └── *.test.ts      # Unit tests
│       ├── data/         # Binary dataset (generated)
│       └── package.json
├── docs/                 # Additional documentation
├── README.md            # Developer guide
├── CONSUMER.md          # API consumer guide
├── CODEOWNER.md         # Ownership guide
└── CONTRIBUTOR.md       # This file
```

### Understanding the Codebase

**Builder Package** (`packages/builder/`)

- Reads Royal Mail PAF CSV files
- Extracts 11 B2C-relevant fields
- Groups addresses by postcode
- Sorts by building number (alpha then numeric)
- Generates compact binary files with indexes

**API Package** (`packages/api/`)

- Loads binary files into memory on startup
- Provides REST endpoints for postcode lookups
- Uses binary search for O(log m) performance
- Returns backward-compatible response format
- Includes CORS support for allowed origins

**Key Technologies:**

- **TypeScript 5**: Type safety and modern JavaScript
- **Jest**: Testing framework with 97% coverage
- **Fastify 4**: High-performance web framework
- **pnpm**: Fast, disk-efficient package manager
- **ESM**: Pure ES modules (no CommonJS)

## Development Workflow

### 1. Find or Create an Issue

Before starting work:

- Check [existing issues](../../issues) for what you want to do
- If none exists, create one describing your proposal
- For large changes, discuss with owners first
- Get agreement on approach before coding

### 2. Create a Branch

Use descriptive branch names:

```bash
# Feature branches
git checkout -b feature/add-address-validation

# Bug fix branches
git checkout -b fix/postcode-normalization-edge-case

# Documentation branches
git checkout -b docs/improve-integration-examples

# Test branches
git checkout -b test/add-lookup-route-coverage
```

### 3. Make Your Changes

**Follow these guidelines:**

- Write clean, readable code
- Follow existing code style (see Coding Standards)
- Add/update tests for your changes
- Update documentation if needed
- Keep commits focused and atomic
- Write clear commit messages

**Commit Message Format:**

```
<type>: <short description>

<longer description if needed>

Fixes #123
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

Examples:

```
feat: add postcode format validation to builder

Add validation to ensure input CSV contains valid UK postcodes
before processing. Invalid postcodes are logged and skipped.

Fixes #45
```

```
fix: handle missing building numbers in address mapper

Building number field is now optional, falling back to building
name if number is empty. This matches Royal Mail PAF spec.

Fixes #67
```

### 4. Test Your Changes

**Run the full test suite:**

```bash
pnpm test
```

**Run specific package tests:**

```bash
pnpm --filter @paf/builder test
pnpm --filter @paf/api test
```

**Generate coverage report:**

```bash
pnpm test:coverage
```

Ensure coverage stays above 95%

**Manual testing:**

```bash
# Rebuild if you changed the builder
pnpm build:builder

# Start API and test manually
pnpm dev:api

# In another terminal
curl http://localhost:3000/health
curl "http://localhost:3000/address?country=GB&postcode=SW1A%201AA"
```

### 5. Update Documentation

If your change affects:

- **API behaviour**: Update CONSUMER.md
- **Setup/usage**: Update README.md
- **Architecture**: Create/update ADR in docs/adr/
- **Tests**: Update test documentation
- **Dependencies**: Update package.json and document why

### 6. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR via GitHub/GitLab UI
```

## Coding Standards

### TypeScript Guidelines

**Use strict TypeScript:**

```typescript
// ✅ Good: Explicit types
function normalisePostcode(postcode: string): string {
  return postcode.toUpperCase().replace(/\s/g, '');
}

// ❌ Bad: Implicit any
function normalisePostcode(postcode) {
  return postcode.toUpperCase().replace(/\s/g, '');
}
```

**Avoid `any`:**

```typescript
// ✅ Good: Specific types
const config: BuildConfig = parseConfig();

// ❌ Bad: Using any
const config: any = parseConfig();
```

**Use interfaces for objects:**

```typescript
// ✅ Good: Explicit interface
interface Address {
  postcode: string;
  buildingNumber: string;
  thoroughfare: string;
}

// ❌ Bad: Inline types
function processAddress(address: {
  postcode: string;
  buildingNumber: string;
}) {}
```

### Code Style

**Follow existing patterns:**

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline
- Max line length: 100 characters

**Use meaningful names:**

```typescript
// ✅ Good: Descriptive names
const normalisedPostcode = normalisePostcodeForKey(rawPostcode);
const addressCount = addresses.length;

// ❌ Bad: Unclear abbreviations
const pc = norm(raw);
const cnt = arr.length;
```

**Keep functions small:**

```typescript
// ✅ Good: Single responsibility
function buildRowBuffer(address: Address): Buffer {
  const fields = extractFields(address);
  const lengths = calculateLengths(fields);
  return createBuffer(lengths, fields);
}

// ❌ Bad: Too much in one function
function processEverything(data: any) {
  // 200 lines of code...
}
```

**Comment when necessary:**

```typescript
// ✅ Good: Explain why, not what
// Pad to 7 bytes to match Royal Mail PAF key format
const key = postcode.padEnd(7, ' ');

// ❌ Bad: Obvious comment
// Pad postcode
const key = postcode.padEnd(7, ' ');

// ✅ Good: Document complex logic
// Binary search on sorted postcode keys
// Returns [startIndex, endIndex) range or null if not found
function findPostcodeRange(key: string): [number, number] | null {
  // ...
}
```

### File Organization

**Import order:**

```typescript
// 1. Node.js built-ins
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 2. External dependencies
import Fastify from 'fastify';

// 3. Internal imports (with .js extension)
import { normalisePostcode } from './postcode.js';
import type { Address } from './types.js';
```

**Export patterns:**

```typescript
// ✅ Good: Named exports
export function normalisePostcode(postcode: string): string {}
export interface Address {}

// ❌ Avoid: Default exports (except for config files)
export default function () {}
```

### ESM Module Requirements

**Always use `.js` extension:**

```typescript
// ✅ Good: .js extension
import { parseConfig } from './config.js';

// ❌ Bad: No extension
import { parseConfig } from './config';
```

**Use `import` not `require`:**

```typescript
// ✅ Good: ESM import
import { readFileSync } from 'node:fs';

// ❌ Bad: CommonJS require
const fs = require('fs');
```

## Testing Requirements

### Test Coverage

**Minimum coverage: 95%**

- All new code must have tests
- Don't decrease existing coverage
- Both positive and negative test cases
- Edge cases and error conditions

### Test Structure

**Use descriptive test names:**

```typescript
// ✅ Good: Clear description
describe('normalisePostcodeForKey', () => {
  it('should convert to uppercase and remove spaces', () => {
    expect(normalisePostcodeForKey('sw1a 1aa')).toBe('SW1A1AA');
  });

  it('should pad short postcodes to 7 characters', () => {
    expect(normalisePostcodeForKey('M1')).toBe('M1     ');
  });

  it('should handle empty strings', () => {
    expect(normalisePostcodeForKey('')).toBe('       ');
  });
});

// ❌ Bad: Unclear tests
it('test1', () => {
  expect(func('abc')).toBe('ABC');
});
```

### Test Categories

**Unit Tests**: Test individual functions

```typescript
import { normalisePostcodeForKey } from './postcode.js';

describe('normalisePostcodeForKey', () => {
  it('should normalise postcode format', () => {
    expect(normalisePostcodeForKey('SW1A 1AA')).toBe('SW1A1AA');
  });
});
```

**Integration Tests**: Test API routes

```typescript
import Fastify from 'fastify';
import { lookupRoute } from './lookup.js';

describe('lookupRoute', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(lookupRoute);
  });

  it('should return addresses for valid postcode', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/address?country=GB&postcode=SW1A 1AA',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

**Edge Cases**: Test boundary conditions

```typescript
it('should handle postcodes with extra whitespace', () => {
  expect(normalisePostcodeForKey('  SW1A   1AA  ')).toBe('SW1A1AA');
});

it('should handle maximum length postcodes', () => {
  expect(normalisePostcodeForKey('ABCD 1EF')).toBe('ABCD1EF');
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (during development)
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm --filter @paf/builder test -- postcode.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="normalise"
```

### Mocking

**Mock external dependencies:**

```typescript
import { jest } from '@jest/globals';

// Mock file system
const mockExistsSync = jest.fn<typeof import('node:fs').existsSync>();
jest.unstable_mockModule('node:fs', () => ({
  existsSync: mockExistsSync,
}));

const { parseConfig } = await import('./config.js');

describe('parseConfig', () => {
  it('should use default when file not found', () => {
    mockExistsSync.mockReturnValue(false);
    const config = parseConfig();
    expect(config.inputPath).toContain('rm-paf.csv');
  });
});
```

## Pull Request Process

### Before Submitting

**Checklist:**

- [ ] Tests pass: `pnpm test`
- [ ] Coverage maintained: `pnpm test:coverage` shows >95%
- [ ] Code builds: `pnpm -r build`
- [ ] Linting passes (if configured)
- [ ] Documentation updated
- [ ] Commits are clean and well-described
- [ ] Branch is up to date with main

### PR Description Template

```markdown
## Description

Brief description of what this PR does.

## Motivation

Why is this change needed? What problem does it solve?

## Changes

- Change 1
- Change 2
- Change 3

## Testing

How was this tested?

- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] Integration tests pass

## Screenshots (if applicable)

Show before/after for UI changes or API responses

## Related Issues

Fixes #123 Related to #456

## Checklist

- [ ] Tests pass locally
- [ ] Code coverage >95%
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Ready for review
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Coverage report generated
   - Build verification

2. **Code Review**
   - At least one owner must approve
   - Address all feedback
   - Update based on suggestions

3. **Approval Criteria**
   - All tests pass
   - Coverage meets standards
   - Code follows guidelines
   - Documentation is complete
   - No unresolved conversations

4. **Merge**
   - Owner will merge when approved
   - Squash commits for clean history
   - Delete branch after merge

### Review Timeline

- **Initial review**: Within 2 business days
- **Follow-up**: Within 1 business day
- **Approval**: When all criteria met

### If Your PR is Blocked

- Ask for clarification on feedback
- Ping reviewers in comments after 3 days
- Reach out in #paf-service channel
- Request pairing session for complex changes

## Communication

### Channels

| Channel            | Purpose               | When to Use         |
| ------------------ | --------------------- | ------------------- |
| **GitHub Issues**  | Bug reports, features | Formal tracking     |
| **Pull Requests**  | Code reviews          | All code changes    |
| **#paf-service**   | Questions, discussion | General help        |
| **#paf-incidents** | Urgent issues         | Production problems |
| **Email**          | Formal requests       | When required       |

### Asking Questions

**Good questions include:**

- What you're trying to do
- What you've tried already
- Specific error messages
- Code snippets (formatted)
- Your environment/setup

**Example:**

```markdown
I'm trying to add a new field to the AddressModel but tests are failing.

What I've done:

1. Added `county: string` to AddressModel interface
2. Updated addressMapper.ts to include county
3. Updated test expectations

Error:
```

TypeError: Cannot read property 'county' of undefined

```

Question: Do I need to update the binary format too, or just the mapper?
```

### Getting Help

**For general questions:**

- Check README.md and CONSUMER.md first
- Search existing GitHub issues
- Ask in #paf-service channel

**For technical issues:**

- Include full error messages
- Share relevant code snippets
- Describe steps to reproduce
- Mention your Node/pnpm versions

**For feature discussions:**

- Create RFC (Request for Comments) issue
- Explain use case and impact
- Propose solution with pros/cons
- Tag relevant owners

## Recognition

We value all contributions! Here's how we recognise contributors:

### Contributor List

All contributors are listed in:

- Repository contributors page
- CONTRIBUTORS.md file (if created)
- Release notes (for significant contributions)

### Contribution Levels

**🌟 First-time Contributor**

- First merged PR
- Welcome to the community!

**⭐ Regular Contributor**

- 5+ merged PRs or
- Significant feature contribution or
- Ongoing documentation improvements

**🏆 Core Contributor**

- 20+ merged PRs or
- Major architectural contribution or
- Consistently high-quality reviews

**👑 Trusted Committer**

- Invited by owners
- Can approve PRs
- Helps with project direction

### Quarterly Highlights

Each quarter, we highlight:

- Most active contributors
- Best community contribution
- Most helpful reviews
- Documentation improvements

### Career Benefits

Contributing to open source projects:

- Builds your technical portfolio
- Demonstrates collaboration skills
- Shows initiative and leadership
- Provides learning opportunities
- Increases visibility in the developer community

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code.

**Key Principles:**

- Be respectful and inclusive
- Collaborate openly and constructively
- Assume good intentions
- Focus on what's best for the community

**Unacceptable behaviour includes:**

- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing others' private information
- Deliberately introducing bugs or security issues

**To report issues:** Contact project owners or email conduct@company.com

For complete details, please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Quick Reference

### Common Tasks

**Setup development environment:**

```bash
git clone <repo>
cd paf-monorepo
pnpm install
pnpm build:builder
pnpm dev:api
```

**Run tests:**

```bash
pnpm test                    # All tests
pnpm test:watch              # Watch mode
pnpm test:coverage           # With coverage
```

**Create a contribution:**

```bash
git checkout -b feature/my-feature
# Make changes
pnpm test
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Create PR
```

### Need Help?

- 📖 **Documentation**: [README.md](README.md), [CONSUMER.md](CONSUMER.md)
- 💬 **Chat**: #paf-service Slack channel
- 🐛 **Issues**: [GitHub Issues](../../issues)
- 📧 **Email**: paf-owners@company.com
- 👥 **Owners**: See [CODEOWNER.md](CODEOWNER.md)

### Resources

**Project Documentation:**

- [README.md](README.md) - Developer setup and architecture
- [CONSUMER.md](CONSUMER.md) - API integration guide
- [CODEOWNER.md](CODEOWNER.md) - Service ownership and operations
- [HOSTING.md](HOSTING.md) - Performance and hosting requirements
- [SECURITY.md](SECURITY.md) - Security policy and vulnerability reporting
- [RUNBOOK.md](RUNBOOK.md) - Operational procedures and troubleshooting

**External Resources:**

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Innersource Commons](https://innersourcecommons.org/)

---

## Thank You! 🎉

Thank you for contributing to the PAF Address Lookup Service! Your contributions
make this service better for everyone.

Questions about this guide? Open an issue or ask in #paf-service.

**Last Updated:** February 20, 2026  
**Maintainers:** See [CODEOWNER.md](CODEOWNER.md)  
**License:** MIT License - see [LICENSE](LICENSE) for details
