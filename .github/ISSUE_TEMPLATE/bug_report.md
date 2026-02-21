---
name: Bug Report
about: Report a bug or issue with the PAF Address Lookup Service
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## To Reproduce

Steps to reproduce the behaviour:

1. Query endpoint '...'
2. With postcode '...'
3. Observe error '...'

## Expected Behaviour

A clear and concise description of what you expected to happen.

## Actual Behaviour

What actually happened instead.

## Example

**Request:**

```bash
curl "http://localhost:3000/lookup/address?postcode=SW1A%201AA"
```

**Response:**

```json
{
  "status": 500,
  "message": "..."
}
```

## Environment

- Service Version: [e.g., v1.2.0]
- Environment: [e.g., staging, production]
- Your Team: [e.g., Checkout Team]
- Node Version (if local): [e.g., 20.10.0]

## Impact

- [ ] Blocking production
- [ ] Blocking development
- [ ] Minor inconvenience

How many users/requests are affected?

## Additional Context

Add any other context about the problem here (logs, screenshots, etc.)

## Possible Solution (Optional)

If you have ideas on how to fix this, please share!
