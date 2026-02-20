# Security Policy

## Reporting a Vulnerability

We take the security of the PAF Address Lookup Service seriously. If you
discover a security vulnerability, please report it responsibly.

### How to Report

**Do NOT create a public GitHub issue for security vulnerabilities.**

Instead, please report security issues through one of these channels:

1. **Email**: security@company.com
2. **Private Message**: Contact project owners directly in Slack (#paf-service)
3. **Security Team**: Contact your organization's security team, who will
   coordinate with us

### What to Include

When reporting a vulnerability, please include:

- **Description**: Clear description of the vulnerability
- **Impact**: Potential impact and severity assessment
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: Code snippet or curl command demonstrating the issue
- **Suggested Fix**: If you have ideas on how to fix it (optional)
- **Your Contact Info**: So we can follow up with questions

**Example Report:**

```
Subject: [SECURITY] Postcode Injection Vulnerability

Description: The /address endpoint doesn't properly validate postcode input,
allowing injection of special characters that could cause regex DoS.

Impact: High - Could cause service degradation or DoS

Steps to Reproduce:
1. Send request: curl "http://api/address?country=GB&postcode=SW1A((((((((((((1AA"
2. Server becomes unresponsive

Proof of Concept:
[attach code or curl command]

Environment: Production API v1.0.0
```

### Response Timeline

We aim to respond to security reports within:

| Priority     | Initial Response | Status Updates | Resolution Target |
| ------------ | ---------------- | -------------- | ----------------- |
| **Critical** | 24 hours         | Daily          | 7 days            |
| **High**     | 3 business days  | Weekly         | 30 days           |
| **Medium**   | 5 business days  | Bi-weekly      | 60 days           |
| **Low**      | 10 business days | Monthly        | 90 days           |

### What to Expect

1. **Acknowledgment**: We'll confirm receipt within the timeline above
2. **Assessment**: We'll assess the vulnerability and determine severity
3. **Updates**: Regular updates on progress toward a fix
4. **Fix & Disclosure**: We'll develop, test, and deploy a fix
5. **Credit**: We'll credit you in the security advisory (unless you prefer to
   remain anonymous)

### Disclosure Policy

- We practice **responsible disclosure**
- We'll work with you to understand and fix the issue
- We'll coordinate public disclosure timing with you
- We typically disclose vulnerabilities **30 days after a fix is deployed**
- Critical vulnerabilities may be disclosed sooner if actively exploited

### Security Advisories

When we fix a security issue:

1. We'll publish a security advisory in our repository
2. We'll notify all known users via email and Slack
3. We'll include:
   - CVE number (if applicable)
   - Severity rating (CVSS score)
   - Affected versions
   - Fixed versions
   - Mitigation steps
   - Credit to reporter(s)

## Supported Versions

We provide security updates for the following versions:

| Version        | Supported | End of Support |
| -------------- | --------- | -------------- |
| 1.x.x (latest) | ✅ Yes    | Current        |
| 0.x.x (beta)   | ❌ No     | Deprecated     |

**Recommendation**: Always run the latest version in production.

## Security Best Practices

### For Consumers

**API Integration:**

- Use HTTPS only (never HTTP in production)
- The API performs input validation (length limits, character whitelist, format
  check) but you can add additional client-side validation if desired
- Implement rate limiting on your side to prevent abuse
- Use API keys/authentication if available
- Don't expose the API publicly without protection

**Error Handling:**

- Don't expose stack traces to end users
- Log errors securely without leaking sensitive data
- Implement proper timeout handling

**CORS:**

- Only whitelist domains you control
- Don't use `*` wildcard in production

### For Contributors

**Code Security:**

- Never commit secrets, API keys, or passwords
- Use environment variables for sensitive configuration
- Follow the principle of least privilege
- Validate all user input
- Use parameterized queries (though we don't use SQL)
- Keep dependencies up to date

**Testing:**

- Write tests for security-critical code paths
- Test error handling and edge cases
- Validate input sanitization

**Dependencies:**

- Run `pnpm audit` regularly
- Update dependencies promptly when vulnerabilities are disclosed
- Review dependency changes in PRs

### For Owners/Maintainers

**Access Control:**

- Limit production access to authorised personnel only
- Use multi-factor authentication (MFA) for AWS console
- Rotate credentials regularly
- Review access logs quarterly

**Monitoring:**

- Monitor for unusual traffic patterns
- Alert on high error rates (could indicate attacks)
- Log and audit all production changes
- Track failed authentication attempts (if auth is added)

**Deployment:**

- Use infrastructure as code (IaC) with version control
- Conduct security reviews for significant changes
- Scan container images for vulnerabilities
- Use read-only file systems where possible

**Data Protection:**

- The PAF dataset contains publicly available address data (low sensitivity)
- However, query patterns could reveal user behaviour - log responsibly
- Comply with data retention policies
- Don't log postcodes in a way that could identify individuals

## Known Security Considerations

### Current Security Posture

**Authentication:** ❌ None - Currently relies on CORS only

- **Risk**: Anyone on whitelisted domains can query the API
- **Mitigation**: CORS restricts browser-based access
- **Recommendation**: Consider adding API keys for production

**Rate Limiting:** ❌ None - No request throttling

- **Risk**: Service could be overwhelmed by excessive requests
- **Mitigation**: AWS ALB can provide basic rate limiting
- **Recommendation**: Implement application-level rate limiting

**Input Validation:** ⚠️ Basic - Query parameter validation only

- **Risk**: Malformed postcodes could cause errors
- **Current**: Basic string validation in route handler
- **Recommendation**: Add stricter regex validation

**Dependency Vulnerabilities:** ✅ Low Risk

- **Current**: Using latest stable versions
- **Process**: Run `pnpm audit` before each release
- **Auto-updates**: Consider Dependabot for automated PR

**Data Exposure:** ✅ Low Risk

- **Data Type**: Public PAF data (addresses and postcodes)
- **No PII**: No personally identifiable information
- **Logging**: Health checks and errors only

### Threat Model

**Potential Threats:**

1. **Denial of Service (DoS)**
   - **Attack**: Overwhelming the service with requests
   - **Mitigation**: Rate limiting, auto-scaling, CDN
   - **Owner Action**: Monitor request rates, configure WAF rules

2. **Data Extraction**
   - **Attack**: Scraping entire PAF dataset
   - **Impact**: Low (data is publicly available)
   - **Mitigation**: Rate limiting, require attribution

3. **Injection Attacks**
   - **Attack**: SQL/NoSQL injection (not applicable - no database)
   - **Attack**: RegEx DoS via malicious postcode patterns
   - **Mitigation**: Input validation (length limits, character whitelist, UK
     format check), timeout limits
   - **Protections**:
     - Maximum postcode length: 10 characters
     - Character whitelist: alphanumeric and spaces only
     - UK postcode format validation
     - No code execution or database queries

4. **Supply Chain Attacks**
   - **Attack**: Compromised npm packages
   - **Mitigation**: Lock file, audit, review dependencies
   - **Owner Action**: Regular `pnpm audit`, SCA tools

5. **Memory Exhaustion**
   - **Attack**: Causing OOM crashes
   - **Current**: Fixed dataset size, no user-controlled allocations
   - **Mitigation**: Memory limits in container, monitoring

## Compliance & Privacy

### Data Classification

**PAF Dataset:**

- **Classification**: Public
- **Source**: Royal Mail Postcode Address File (licensed data)
- **Sensitivity**: Low (publicly available addresses)
- **Regulations**: No GDPR concerns (no personal data)

### License Compliance

**Royal Mail PAF License:**

- Ensure proper licensing for PAF data usage
- Review license terms for permitted use cases
- Maintain audit trail of dataset versions
- Don't redistribute raw PAF data

### Logging & Privacy

**What We Log:**

- Health check requests
- Error responses (without postcode details)
- System metrics (CPU, memory, latency)

**What We DON'T Log:**

- Individual postcode lookups (privacy consideration)
- IP addresses (unless required for security)
- User identifiable information

**Recommendation for Consumers:**

- Don't log postcodes in a way that could identify individuals
- Aggregate metrics are fine (e.g., "1000 lookups today")
- Be cautious with user-level tracking

## Security Checklist for Production

Before deploying to production, verify:

- [ ] **HTTPS Only**: TLS/SSL properly configured
- [ ] **CORS**: Whitelisted domains only (no `*`)
- [ ] **Secrets**: No hardcoded credentials in code
- [ ] **Dependencies**: `pnpm audit` shows no high/critical vulnerabilities
- [ ] **Monitoring**: Alerts configured for errors and anomalies
- [ ] **Access Control**: Production access limited to authorised personnel
- [ ] **Backups**: Dataset and configuration backed up
- [ ] **Incident Response**: Team knows how to respond to security incidents
- [ ] **Logging**: Appropriate logging without sensitive data
- [ ] **Updates**: Process in place for security patches

## Security Contacts

**Reporting Security Issues:**

- **GitHub Security Advisories**: Use GitHub's private vulnerability reporting
- **Email**: Create an issue on GitHub or contact maintainers
- **Escalation**: See [CODEOWNER.md](CODEOWNER.md) for maintainer contacts

**Project Maintainers:**

- See [CODEOWNER.md](CODEOWNER.md) for current maintainer list
- **GitHub Issues**: For non-security questions

## Vulnerability Disclosure Examples

### Past Vulnerabilities

_None disclosed yet - this is the initial release._

When vulnerabilities are fixed, we'll document them here following this format:

```markdown
### CVE-YYYY-XXXXX: Description of Vulnerability

**Severity**: High (CVSS 7.5) **Affected Versions**: 1.0.0 - 1.2.3 **Fixed
Version**: 1.2.4 **Reported By**: Security Researcher Name **Reported Date**:
2026-01-15 **Fixed Date**: 2026-01-20 **Public Disclosure**: 2026-02-20

**Description**: [Brief description of the issue]

**Impact**: [What could happen if exploited]

**Mitigation**: Upgrade to version 1.2.4 or later

**Credit**: Thanks to [Reporter Name] for responsible disclosure
```

## Questions?

If you have questions about this security policy:

- Check [CONTRIBUTOR.md](CONTRIBUTOR.md) for contribution guidelines
- Open a GitHub issue for non-security questions
- Contact maintainers (see [CODEOWNER.md](CODEOWNER.md))

---

**Last Updated**: February 20, 2026  
**Next Review**: May 20, 2026 (quarterly review)  
**Policy Version**: 1.1  
**Contact**: See [CODEOWNER.md](CODEOWNER.md) for maintainer contacts
