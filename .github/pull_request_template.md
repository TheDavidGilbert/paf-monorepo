# Pull Request

## Description

<!-- Provide a clear description of what this PR does -->

## Motivation

<!-- Why is this change needed? What problem does it solve? -->
<!-- Link to related issue: Fixes #123 -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality
      to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🧪 Test improvement
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🔧 Configuration change
- [ ] 🎨 Code style/formatting

## Changes Made

<!-- List the key changes -->

- Change 1
- Change 2
- Change 3

## Testing

<!-- Describe how you tested your changes -->

### Test Coverage

```bash
# Run tests
pnpm test

# Coverage report
pnpm test:coverage
```

**Coverage:** [e.g., 97.5%]

### Manual Testing

<!-- What manual tests did you perform? -->

```bash
# Example commands you ran
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"
```

**Result:**

```json
{
  "status": 200,
  ...
}
```

## Checklist

<!-- Mark completed items with an 'x' -->

### Code Quality

- [ ] Code follows the project's style guidelines (see CONTRIBUTOR.md)
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My code follows TypeScript strict mode requirements
- [ ] No console.log or debugging code left in

### Testing

- [ ] All existing tests pass: `pnpm test`
- [ ] New tests added for new functionality
- [ ] Test coverage is maintained (>95%)
- [ ] Edge cases are tested
- [ ] Manual testing completed

### Documentation

- [ ] Documentation updated (README.md, CONSUMER.md, etc.)
- [ ] JSDoc comments added for public APIs
- [ ] CHANGELOG.md updated (if applicable)
- [ ] API changes documented in CONSUMER.md
- [ ] Breaking changes clearly documented

### Dependencies

- [ ] No new dependencies added, OR
- [ ] New dependencies justified and documented
- [ ] `pnpm audit` shows no vulnerabilities
- [ ] Package versions pinned appropriately

### Compatibility

- [ ] Changes are backward compatible, OR
- [ ] Breaking changes documented with migration guide
- [ ] API version bumped if needed

## Performance Impact

<!-- Does this change affect performance? -->

- [ ] No performance impact
- [ ] Performance improved (include benchmarks)
- [ ] Performance degraded (justified and documented)

**Benchmarks (if applicable):**

```
Before: X ms
After: Y ms
```

## Security Considerations

<!-- Any security implications? -->

- [ ] No security impact
- [ ] Security review required
- [ ] Secrets properly managed
- [ ] Input validation added
- [ ] CORS configuration reviewed

## Screenshots (if applicable)

<!-- Add screenshots for UI changes or API response changes -->

**Before:**

**After:**

## Deployment Notes

<!-- Any special deployment considerations? -->

- [ ] No special deployment needed
- [ ] Database migration required
- [ ] Configuration change required
- [ ] Dataset rebuild required

**Deployment steps:**

1. Step 1
2. Step 2

## Rollback Plan

<!-- How to rollback if this causes issues? -->

## Related Issues

<!-- Link related issues -->

Fixes # Related to #

## Reviewers

<!-- Tag specific people if needed -->

@owner1 @owner2

## Additional Notes

<!-- Any other information for reviewers -->

---

<!--
For contributors: Thank you for your contribution!
Please ensure all checks pass before requesting review.
Review CONTRIBUTOR.md and CODE_OF_CONDUCT.md for guidelines.

For reviewers: See CODEOWNER.md for review guidelines.
-->
