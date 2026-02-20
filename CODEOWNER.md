# Service Ownership Guide

This document outlines the responsibilities, processes, and best practices for
owning and maintaining the PAF Address Lookup Service as an open source project.

## Table of Contents

- [Ownership Model](#ownership-model)
- [Responsibilities](#responsibilities)
- [Service Level Objectives](#service-level-objectives)
- [Release Management](#release-management)
- [Security & Compliance](#security--compliance)
- [Monitoring & Alerting](#monitoring--alerting)
- [Support & Communication](#support--communication)
- [Architecture Decisions](#architecture-decisions)
- [Data Management](#data-management)
- [Onboarding New Owners](#onboarding-new-owners)
- [Deprecation & Breaking Changes](#deprecation--breaking-changes)

## Ownership Model

### Primary Owners

The PAF Address Lookup Service follows an open source ownership model where:

- **Primary Maintainers**: Core team responsible for long-term maintenance,
  architectural decisions, and releases
- **Contributors**: Developers who contribute improvements and fixes
- **Users**: Teams and individuals that use the service

### Current Owners

| Name | Role            | Focus Area             | Contact |
| ---- | --------------- | ---------------------- | ------- |
| TBD  | Lead Maintainer | Architecture, Releases | -       |
| TBD  | Maintainer      | API, Integrations      | -       |
| TBD  | Maintainer      | Data Pipeline, Builder | -       |

**To become a maintainer, contribute quality PRs and engage with the
community.**

### Owner Rotation

- Owners should commit to at least **6 months** of active ownership
- New owners should shadow for **1 month** before taking full responsibility
- Handoff includes: architecture walkthrough, deployment process, active issues
  review
- Document all tribal knowledge in this repository before rotating out

## Responsibilities

### Day-to-Day Operations

**Monitoring & Incidents** (Critical)

- [ ] Monitor service health dashboards daily
- [ ] Respond to alerts within SLA (see below)
- [ ] Investigate and resolve incidents
- [ ] Post incident reviews for P1/P2 incidents
- [ ] Maintain runbooks for common issues

**Support** (High)

- [ ] Respond to support requests in designated channels
- [ ] Triage and prioritise issues from consuming teams
- [ ] Provide guidance on integration best practices
- [ ] Update CONSUMER.md based on common questions

**Code Review** (High)

- [ ] Review pull requests within 2 business days
- [ ] Ensure PR guidelines are followed (see CONTRIBUTOR.md)
- [ ] Verify test coverage meets standards (>95%)
- [ ] Validate security and performance implications

### Weekly Tasks

- [ ] Review open issues and pull requests
- [ ] Update project board with current priorities
- [ ] Check dataset freshness and plan updates if needed
- [ ] Review service metrics and identify trends
- [ ] Respond to any security advisories for dependencies

### Monthly Tasks

- [ ] Review and update documentation
- [ ] Dependency updates (security patches, minor versions)
- [ ] Performance analysis and optimization opportunities
- [ ] Review contributing team feedback
- [ ] Update roadmap based on stakeholder needs

### Quarterly Tasks

- [ ] Major version releases (if applicable)
- [ ] Architecture review and technical debt assessment
- [ ] Security audit and penetration testing review
- [ ] Disaster recovery drill
- [ ] Review and update SLOs based on actual performance
- [ ] Stakeholder review meeting

### Annual Tasks

- [ ] Complete architecture documentation review
- [ ] Royal Mail PAF dataset license renewal (if applicable)
- [ ] Service ownership review and renewal
- [ ] Budget planning for infrastructure and tools

## Service Level Objectives

### Availability

- **Target**: 99.9% uptime (excluding planned maintenance)
- **Measurement**: HTTP 200 responses to /health endpoint
- **Planned Maintenance**: Maximum 4 hours/month, scheduled during off-peak
  hours
- **Communication**: 48 hours notice for planned maintenance

### Performance

- **Postcode Lookup Response Time**:
  - p50: < 10ms
  - p95: < 25ms
  - p99: < 50ms
- **Health Check Response Time**: < 5ms
- **Startup Time**: < 10 seconds (including dataset loading)

> **Infrastructure Sizing**: See [HOSTING.md](HOSTING.md) for detailed hosting
> requirements, instance sizing recommendations, and scaling strategies to
> achieve these performance targets.

### Reliability

- **Error Rate**: < 0.1% (excluding 4xx client errors)
- **Data Freshness**: Dataset updated within 30 days of Royal Mail release
- **Data Accuracy**: 100% match with source PAF data

### Support Response Times

| Priority | Description                          | Response Time   | Resolution Time |
| -------- | ------------------------------------ | --------------- | --------------- |
| P1       | Service down, data corruption        | 1 hour          | 4 hours         |
| P2       | Degraded performance, partial outage | 4 hours         | 1 business day  |
| P3       | Non-critical bug, feature request    | 2 business days | 2 weeks         |
| P4       | Question, documentation              | 3 business days | N/A             |

## Release Management

### Release Cycle

- **Patch Releases** (1.0.x): Bug fixes, security patches - as needed
- **Minor Releases** (1.x.0): New features, non-breaking changes - monthly
- **Major Releases** (x.0.0): Breaking changes - quarterly (with 3-month notice)

### Release Process

#### 1. Pre-Release

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Run full test suite
pnpm test

# Run test coverage
pnpm test:coverage
# Verify coverage is >95%

# Build all packages
pnpm -r build

# Test API manually
pnpm dev:api
# Run smoke tests from CONSUMER.md
```

#### 2. Version Bump

```bash
# For patch release (1.0.x)
npm version patch -m "Release v%s"

# For minor release (1.x.0)
npm version minor -m "Release v%s"

# For major release (x.0.0)
npm version major -m "BREAKING: Release v%s"
```

#### 3. Update Changelog

Update `CHANGELOG.md` with:

- New features
- Bug fixes
- Breaking changes
- Dependency updates
- Migration guide (for major releases)

#### 4. Create Release Notes

In GitHub/GitLab, create a new release with:

- Version number (e.g., v1.2.0)
- Release date
- Summary of changes
- Link to changelog
- Migration guide (if applicable)
- Known issues (if any)

#### 5. Communicate Release

Post in communication channels:

```
📦 PAF Address Lookup Service v1.2.0 Released

New features:
- Feature A
- Feature B

Bug fixes:
- Fixed issue C

Upgrade guide: [link to documentation]
Breaking changes: None
```

#### 6. Deploy

Follow your deployment process:

1. Deploy to staging environment
2. Run integration tests
3. Deploy to production with blue-green deployment
4. Monitor for 1 hour post-deployment
5. Roll back if error rate > 0.5%

### Hotfix Process

For critical production issues:

```bash
# Create hotfix branch from production tag
git checkout -b hotfix/v1.0.1 v1.0.0

# Fix the issue and commit
git commit -m "Fix critical issue X"

# Run tests
pnpm test

# Version bump
npm version patch -m "Hotfix v%s"

# Merge to main and tag
git checkout main
git merge hotfix/v1.0.1
git push origin main --tags

# Deploy immediately
# Post incident review within 24 hours
```

## Security & Compliance

### Security Responsibilities

**Vulnerability Management**

- Monitor GitHub/npm security advisories daily
- Apply security patches within:
  - Critical: 24 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next regular release
- Document all security updates in changelog

**Dependency Audits**

```bash
# Run weekly
pnpm audit

# Fix issues
pnpm audit --fix

# Review and update dependencies monthly
pnpm update --latest
```

**Secret Management**

- Never commit secrets to repository
- Use environment variables for all configuration
- Rotate credentials quarterly
- Use secret scanning tools in CI/CD

**Access Control**

- Repository access: Follow least-privilege principle
- API access: Review CORS origins quarterly
- Data access: Audit who has access to Royal Mail PAF data

### Data Protection

**Royal Mail PAF Data**

- Ensure license compliance for usage
- Do not expose raw PAF data via API
- Implement rate limiting to prevent data scraping
- Log and monitor for suspicious access patterns

**Personal Data**

- PAF data is not personal data (business addresses)
- No GDPR requirements for addresses alone
- Do not log sensitive query parameters
- Implement data retention policies for logs (30 days)

### Compliance Checklist

- [ ] Royal Mail PAF license terms followed
- [ ] Data processing agreement in place (if applicable)
- [ ] Security audit completed (annually)
- [ ] Dependency vulnerabilities reviewed (monthly)
- [ ] Access logs retained per policy
- [ ] Incident response plan documented and tested

## Monitoring & Alerting

> **See also**: [HOSTING.md](HOSTING.md) for detailed performance
> characteristics, recommended alerting thresholds, and monitoring setup.

> **Deployment Note**: Service maintainers should configure monitoring
> infrastructure (metrics collection, APM tools like New Relic/Datadog) in their
> deployment environment. This section outlines recommended metrics to track.

### Key Metrics to Monitor

**Service Health**

- Uptime (target: 99.9%)
- Error rate (target: < 0.1%)
- Request rate (track trends)
- Response times (p50, p95, p99)

**System Resources**

- Memory usage (alert if > 80% of 12 GB limit = 9.6 GB)
- CPU usage (alert if > 70% sustained)
- Disk I/O (for logging)
- Network throughput

> **Production Note**: With 40M record dataset, normal memory usage is ~8-10 GB.
> Alerts should trigger at 10+ GB to catch memory leaks or issues.

**Business Metrics**

- Requests per day
- Unique postcodes queried
- 404 rate (postcodes not found)
- Test pattern usage (XXX X codes)
- Top consuming teams/services

### Alert Configuration

**Critical Alerts** (Page immediately)

- Service down (health check fails)
- Error rate > 5%
- Memory usage > 10 GB (production with 40M records)
- All instances down

**Warning Alerts** (Notify, investigate within 1 hour)

- Error rate > 1%
- p99 latency > 50ms (per SLO)
- Memory usage > 9 GB (80% of limit)
- Dependency failure

**Info Alerts** (Review during business hours)

- Dataset age > 25 days
- Unusual traffic pattern
- High 404 rate
- Dependency update available

### Dashboard Requirements

> **Note**: Configure these dashboards in your monitoring platform of choice.

Dashboards should show:

1. **Overview**: Uptime, request rate, error rate, latency
2. **Performance**: Response time percentiles, throughput
3. **Errors**: Error breakdown by type, recent errors
4. **Usage**: Requests by team, top postcodes, geographic distribution
5. **System**: Memory, CPU, network metrics

### On-Call Rotation

- **On-call schedule**: Rotate weekly among owners
- **Escalation path**: Owner → Lead Owner → Engineering Manager
- **Runbooks**: Maintain in `docs/runbooks/` directory
- **Post-mortems**: Required for all P1 incidents

## Support & Communication

### Communication Channels

| Channel              | Purpose                          | Response SLA    |
| -------------------- | -------------------------------- | --------------- |
| #paf-service         | General questions, announcements | 1 business day  |
| #paf-incidents       | Incident coordination            | 30 minutes      |
| GitHub Issues        | Bug reports, feature requests    | 2 business days |
| Email: paf-owners@   | Formal requests                  | 2 business days |
| Confluence: PAF Wiki | Documentation, decisions         | -               |

### Support Guidelines

**When contacted for support:**

1. **Acknowledge** receipt within SLA
2. **Triage** and assign priority (P1-P4)
3. **Investigate** using logs, metrics, runbooks
4. **Communicate** status updates regularly
5. **Resolve** or escalate if needed
6. **Document** solution in wiki/FAQ

**Common Support Scenarios:**

**"I'm getting 404 errors"**

- Check if postcode is valid UK format
- Verify postcode exists in dataset
- Check dataset version/age
- Provide debugging steps from CONSUMER.md

**"Response is slow"**

- Check current service metrics
- Review consumer's usage patterns (caching?)
- Investigate if specific postcode causing issues
- Recommend best practices from CONSUMER.md

**"How do I integrate this service?"**

- Direct to CONSUMER.md integration guide
- Offer code review for their integration
- Add to examples if it's a common pattern

**"We need a new feature"**

- Capture requirements clearly
- Assess impact and effort
- Prioritise against roadmap
- Create GitHub issue for tracking

### Stakeholder Communication

**Monthly Updates** Post in #paf-service channel:

- Service metrics vs SLOs
- Recent improvements
- Upcoming changes
- Known issues
- Call for contributions

**Quarterly Reviews** Meeting with all consuming teams:

- Service health review
- Roadmap discussion
- Feedback collection
- Feature prioritization
- Resource planning

## Architecture Decisions

### Architecture Decision Records (ADRs)

All significant architectural decisions must be documented using ADRs in
`docs/adr/`.

**Template:**

```markdown
# ADR-NNN: [Title]

Date: YYYY-MM-DD Status: [Proposed | Accepted | Deprecated | Superseded]

## Context

What is the issue we're facing?

## Decision

What decision did we make?

## Consequences

What are the positive and negative impacts?

## Alternatives Considered

What other options did we evaluate?
```

### Key Design Principles

1. **Simplicity**: Favor simple solutions over complex ones
2. **Performance**: Optimise for read performance (lookups)
3. **Reliability**: Fail gracefully, never corrupt data
4. **Backward Compatibility**: Avoid breaking changes when possible
5. **Testability**: Maintain >95% test coverage
6. **Documentation**: Keep docs in sync with code

### Major Architectural Decisions

- **Binary Storage Format**: Chosen for performance and memory efficiency
- **In-Memory Dataset**: Trade memory for zero-latency lookups
- **Synchronous Loading**: Simplicity over async complexity
- **Jest over Vitest**: Better ESM support and compatibility
- **Fastify over Express**: Performance and TypeScript support
- **Response Format**: Backward compatibility with legacy API

### When to Create an ADR

Create an ADR for:

- Changes to data format or API contract
- Addition of new dependencies
- Infrastructure changes
- Performance optimization strategies
- Security implementations
- Breaking changes

### Review Process

1. Draft ADR and share with co-owners
2. Discuss in architecture review meeting
3. Update ADR based on feedback
4. Mark as "Accepted" when consensus reached
5. Implement the decision
6. Review ADR after 3 months of living with it

## Data Management

### Dataset Updates

**Royal Mail PAF Data Refresh Process:**

1. **Obtain New Dataset**
   - Download from Royal Mail or data provider
   - Verify file integrity (checksums)
   - Backup previous dataset

2. **Process Dataset**

   ```bash
   # Run builder with new data
   pnpm build:builder -- --input path/to/new-paf.csv --version paf-YYYY-MM-DD

   # Verify output
   ls -lh packages/api/data/
   cat packages/api/data/meta.json
   ```

3. **Validate Dataset**
   - Check row count vs expected
   - Verify checksums in meta.json
   - Spot-check known postcodes
   - Compare with previous version for anomalies

4. **Test Integration**

   ```bash
   # Start API with new dataset
   pnpm dev:api

   # Run smoke tests
   curl http://localhost:3000/health
   # Check version and row count

   # Test known postcodes
   curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"
   ```

5. **Deploy**
   - Update staging environment
   - Run full integration test suite
   - Monitor for 24 hours
   - Deploy to production
   - Announce dataset update

### Data Quality

**Quality Checks:**

- Row count within expected range
- No duplicate UDPRNs
- All postcodes valid format
- Required fields populated
- Checksums match across environments

**Monitoring:**

- Track dataset age (alert if > 30 days)
- Monitor 404 rate (spike could indicate stale data)
- Compare request patterns before/after update
- Review user feedback after updates

### Data Governance

- **Retention**: Keep last 3 dataset versions
- **Backup**: Daily backups of current dataset
- **Access**: Limit access to authorised personnel
- **Audit**: Log all dataset updates with who/when/why
- **License**: Maintain Royal Mail PAF license documentation

## Onboarding New Owners

### Week 1: Orientation

**Day 1-2: Setup**

- [ ] Grant repository access
- [ ] Add to communication channels (#paf-service, #paf-incidents)
- [ ] Setup development environment
- [ ] Clone repo and run all tests
- [ ] Deploy locally and test API

**Day 3-5: Architecture Deep Dive**

- [ ] Review README.md and all documentation
- [ ] Walk through builder code (packages/builder/src/)
- [ ] Walk through API code (packages/api/src/)
- [ ] Review all ADRs
- [ ] Understand binary format and indexing
- [ ] Review test suite structure

### Week 2-3: Active Learning

**Shadowing**

- [ ] Observe code reviews (don't approve yet)
- [ ] Shadow incident response
- [ ] Attend stakeholder meetings
- [ ] Review monitoring dashboards
- [ ] Participate in support discussions

**Hands-On Tasks**

- [ ] Fix a "good first issue" bug
- [ ] Write a new test case
- [ ] Update documentation
- [ ] Perform a dataset update (in staging)
- [ ] Respond to a support question (with guidance)

### Week 4: Transition

**Taking Ownership**

- [ ] Review PRs independently (get second approval)
- [ ] Handle support questions independently
- [ ] Lead a minor release
- [ ] Update documentation based on learning
- [ ] Pair with outgoing owner on complex tasks

### Ongoing Development

- [ ] Complete security training
- [ ] Review all past incidents
- [ ] Study production metrics and trends
- [ ] Build relationships with consuming teams
- [ ] Identify improvement opportunities

## Deprecation & Breaking Changes

### Deprecation Policy

**Notice Period:**

- API endpoints: 6 months
- Query parameters: 3 months
- Response fields: 3 months
- Dataset versions: 1 month

**Process:**

1. **Announce Deprecation**

   ```markdown
   🚨 DEPRECATION NOTICE

   What: [specific feature/endpoint] When: [deprecation date] Why: [reason]
   Alternative: [migration path] Contact: [owner email]
   ```

2. **Update Documentation**
   - Mark as deprecated in API docs
   - Add migration guide
   - Update CONSUMER.md

3. **Add Deprecation Warnings**

   ```typescript
   // In code
   reply.header(
     'X-Deprecated-Warning',
     'This endpoint will be removed on YYYY-MM-DD'
   );
   ```

4. **Monitor Usage**
   - Track deprecated feature usage
   - Contact teams still using it
   - Offer migration support

5. **Remove Feature**
   - After notice period expires
   - Create migration guide
   - Announce removal
   - Update changelog

### Breaking Changes

**Definition:** A breaking change requires consuming teams to modify their code.

**Examples:**

- Removing API endpoints
- Changing response structure
- Renaming fields
- Changing data types
- Removing query parameters

**Process for Breaking Changes:**

1. **Avoid if Possible**
   - Consider additive changes instead
   - Can you support both old and new?
   - Version the API if needed

2. **Major Version Bump**
   - Breaking changes = major version (x.0.0)
   - Document all breaking changes
   - Provide detailed migration guide

3. **Communication**
   - 3 months advance notice minimum
   - Email all consuming teams
   - Post in all channels
   - Offer migration support

4. **Migration Support**
   - Create migration guide with code examples
   - Offer office hours for questions
   - Review consumer PRs for migrations
   - Provide tools/scripts if helpful

5. **Gradual Rollout**
   - Release migration guide early
   - Deploy to staging first
   - Monitor migration progress
   - Only deploy to production when all teams ready

### Version Support Policy

- **Current Major Version**: Full support
- **Previous Major Version**: Security fixes only for 6 months
- **Older Versions**: No support

Example:

- v2.x.x released → v2.x.x fully supported
- v1.x.x → security fixes until 6 months after v2.0.0
- v0.x.x → no longer supported

## Appendix

### Useful Commands

```bash
# Development
pnpm install                    # Install dependencies
pnpm build:builder              # Build dataset
pnpm dev:api                    # Run API in dev mode
pnpm test                       # Run all tests
pnpm test:coverage              # Generate coverage report

# Maintenance
pnpm audit                      # Check for vulnerabilities
pnpm update --latest            # Update dependencies
pnpm -r build                   # Build all packages

# Deployment
pnpm --filter @paf/api build    # Build API only
node packages/api/dist/server.js # Start production server

# Debugging
curl http://localhost:3000/health
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"
```

### Key Files

| File                              | Purpose                       |
| --------------------------------- | ----------------------------- |
| README.md                         | Developer documentation       |
| CONSUMER.md                       | API consumer guide            |
| CONTRIBUTOR.md                    | Contribution guidelines       |
| HOSTING.md                        | Performance and hosting guide |
| RUNBOOK.md                        | Operational procedures        |
| SECURITY.md                       | Security policy               |
| CODE_OF_CONDUCT.md                | Community standards           |
| CODEOWNER.md                      | This document                 |
| packages/builder/src/build.ts     | Dataset builder               |
| packages/api/src/server.ts        | API server                    |
| packages/api/src/routes/lookup.ts | Lookup endpoint               |
| eslint.config.js                  | ESLint configuration          |
| .prettierrc.json                  | Prettier configuration        |
| jest.config.cjs                   | Test configuration            |
| tsconfig.base.json                | TypeScript config             |

### Resources

- **Repository**: https://github.com/YOUR-USERNAME/paf-monorepo
- **Documentation**: See README.md and other docs in the repository
- **Monitoring**: Configure based on your deployment environment
- **APM Dashboard**: Configure based on your monitoring platform
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

---

**Document Maintenance:**

- Review quarterly
- Update after major changes
- Keep contact information current
- Archive outdated sections

**Last Updated:** February 20, 2026  
**Document Owner:** Maintainers (see above)  
**Next Review:** May 20, 2026
