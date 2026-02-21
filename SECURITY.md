# Security Policy

## Reporting a Vulnerability

**Do not create a public GitHub issue for security vulnerabilities.**

Please report security issues via GitHub's private vulnerability reporting:
https://github.com/TheDavidGilbert/paf-monorepo/security/advisories/new

Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce
- A proof of concept (curl command or code snippet) if possible

The maintainer will acknowledge the report and work toward a fix. Fixed
vulnerabilities will be documented in a GitHub security advisory with credit to
the reporter (unless you prefer to remain anonymous).

## Supported Versions

| Version        | Supported |
| -------------- | --------- |
| 1.x.x (latest) | Yes       |
| 0.x.x          | No        |

Always run the latest version in production.

## Security Considerations

### Authentication

The API has no built-in authentication. It is intended to be deployed behind a
reverse proxy (nginx, Caddy, Traefik, etc.) that handles TLS termination and, if
needed, access control.

Do not expose the API directly on a public IP without a reverse proxy in front
of it.

### CORS

By default only `localhost` is allowed. Before deploying, update the CORS
configuration in `packages/api/src/server.ts` to whitelist only the domains you
control. Do not use a wildcard (`*`) in production.

### Input Validation

All query parameters are validated before use:

- `postcode` (`/lookup/address`): maximum 10 characters, alphanumeric and spaces
  only, UK format check
- `q` (`/lookup/postcode`): 2–7 alphanumeric characters (spaces stripped before
  matching)
- `q` (`/lookup/street`): maximum 80 characters, alphanumeric, spaces, hyphens
  and apostrophes only; thoroughfare portion must be at least 3 characters
- `town` (`/lookup/street`): maximum 60 characters, same character set as `q`
- `limit` (postcode and street routes): must be a positive integer; capped at
  100 and 50 respectively

There is no database, so SQL/NoSQL injection is not applicable. Input is not
executed or evaluated in any way.

### Rate Limiting

No rate limiting is enforced at the application level. If you are exposing the
service to untrusted clients, implement rate limiting at the reverse proxy
layer.

### Data Sensitivity

The PAF dataset contains publicly available UK address data. It does not include
personally identifiable information. There are no GDPR concerns specific to
serving postcode lookups.

Query parameters (postcodes) are not logged by default.

### Dependencies

Run `pnpm audit` regularly and update dependencies when vulnerabilities are
disclosed. Consider enabling Dependabot on your fork.

### Royal Mail PAF License

Ensure you hold an appropriate Royal Mail PAF licence for your use case. Do not
redistribute raw PAF data through this API.
