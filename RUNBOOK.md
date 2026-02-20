# PAF Address Lookup Service - Runbook

This runbook provides operational procedures for managing the PAF Address Lookup
Service in production.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Service Overview](#service-overview)
- [Common Operations](#common-operations)
- [Incident Response](#incident-response)
- [Dataset Updates](#dataset-updates)
- [Scaling Operations](#scaling-operations)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring & Alerts](#monitoring--alerts)

## Quick Reference

### Service Endpoints

| Endpoint                               | Purpose               | Expected Response            |
| -------------------------------------- | --------------------- | ---------------------------- |
| `/health`                              | Combined health check | 200 OK + dataset info        |
| `/health/live`                         | Liveness probe        | 200 OK (always if running)   |
| `/health/ready`                        | Readiness probe       | 200 OK (when ready to serve) |
| `/address?country=GB&postcode=SW1A1AA` | Address lookup        | 200 OK + address data        |

### Emergency Contacts

- **On-Call**: See [CODEOWNER.md](CODEOWNER.md) for maintainer contacts
- **GitHub Issues**: For non-urgent issues
- **Email**: Contact maintainers (see [CODEOWNER.md](CODEOWNER.md))

### Service SLOs

- **Availability**: 99.9% uptime
- **Latency**: p50 < 10ms, p95 < 25ms, p99 < 50ms
- **Error Rate**: < 0.1% (excluding 4xx client errors)

## Service Overview

### Architecture

```
User/Browser → Load Balancer → Application Instances → In-Memory Dataset
                ↓
           Monitoring/APM
```

**Key Components:**

- **Load Balancer**: Routes traffic, health checks
- **Application Instances**: Node.js 20+ with 12 GB RAM (2+ instances recommended)
- **Dataset**: 40M Royal Mail PAF records loaded in memory

### Deployment Information

- **AWS Region**: [Your region - e.g., us-east-1]
- **ECS/EKS Cluster**: [Cluster name]
- **Service Name**: paf-address-lookup-api
- **Task Definition**: [Task definition ARN]
- **Container Image**: [ECR repository URL]

## Common Operations

### 1. Service Restart

**When to use:**

- Memory leak suspected
- Configuration change deployed
- Service in degraded state

**Procedure:**

```bash
# AWS ECS
aws ecs update-service \
  --cluster <cluster-name> \
  --service paf-api \
  --force-new-deployment

# Kubernetes
kubectl rollout restart deployment/paf-api -n <namespace>

# Check rollout status
kubectl rollout status deployment/paf-api -n <namespace>
```

**Expected Outcome:**

- New tasks/pods start (8-12 second startup time)
- Health checks pass after ~15 seconds
- Old tasks/pods terminate gracefully
- Zero downtime (blue-green deployment)

**Validation:**

```bash
# Check service health
curl https://api.yourcompany.com/health

# Check readiness
curl https://api.yourcompany.com/health/ready

# Test lookup
curl "https://api.yourcompany.com/address?country=GB&postcode=SW1A%201AA"
```

### 2. View Logs

**AWS CloudWatch:**

```bash
# Stream recent logs
aws logs tail /aws/ecs/paf-api --follow

# Search for errors
aws logs filter-pattern --log-group-name /aws/ecs/paf-api \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Get logs for specific task
aws logs tail /aws/ecs/paf-api --follow --filter-pattern="task-id"
```

**Kubernetes:**

```bash
# Get pod logs
kubectl logs -l app=paf-api -n <namespace> --tail=100

# Follow logs
kubectl logs -f deployment/paf-api -n <namespace>

# Get logs from all pods
kubectl logs -l app=paf-api -n <namespace> --all-containers=true
```

**What to look for:**

- `Server listening on` - Successful startup
- `Dataset not loaded` - Dataset loading failure
- `SIGTERM received` - Graceful shutdown initiated
- `HTTP 500/503` errors - Service errors

### 3. Check Service Status

**AWS ECS:**

```bash
# Service status
aws ecs describe-services \
  --cluster <cluster-name> \
  --services paf-api

# Running tasks
aws ecs list-tasks \
  --cluster <cluster-name> \
  --service-name paf-api

# Task health
aws ecs describe-tasks \
  --cluster <cluster-name> \
  --tasks <task-arn>
```

**Kubernetes:**

```bash
# Pod status
kubectl get pods -l app=paf-api -n <namespace>

# Deployment status
kubectl get deployment paf-api -n <namespace>

# Detailed pod info
kubectl describe pod <pod-name> -n <namespace>

# Events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

### 4. Scale Service

**Manual Scaling:**

```bash
# AWS ECS
aws ecs update-service \
  --cluster <cluster-name> \
  --service paf-api \
  --desired-count 4

# Kubernetes
kubectl scale deployment paf-api --replicas=4 -n <namespace>
```

**Auto-Scaling:**

See [HOSTING.md](HOSTING.md) for auto-scaling configuration.

**When to scale:**

- CPU > 60% sustained
- p99 latency > 50ms for 5+ minutes
- Request rate exceeds capacity

### 5. Update Environment Variables

**AWS ECS:**

1. Update task definition with new environment variables
2. Register new task definition revision
3. Update service to use new revision:

```bash
aws ecs update-service \
  --cluster <cluster-name> \
  --service paf-api \
  --task-definition paf-api:NEW_REVISION
```

**Kubernetes:**

```bash
# Update ConfigMap
kubectl edit configmap paf-api-config -n <namespace>

# Update Secret (if needed)
kubectl edit secret paf-api-secrets -n <namespace>

# Restart pods to pick up changes
kubectl rollout restart deployment/paf-api -n <namespace>
```

**Common Environment Variables:**

- `PORT`: HTTP server port (default: 3000)
- `DATA_DIR`: Path to binary data files
- `NODE_ENV`: Set to `production`
- `NODE_OPTIONS`: `--max-old-space-size=10240` (10 GB heap)
- `LOG_LEVEL`: `info` or `warn`

## Incident Response

### P1: Service Down

**Symptoms:**

- All health checks failing
- 0 healthy instances
- Users cannot access service

**Immediate Actions:**

1. **Check AWS/K8s Status**

   ```bash
   # Are any instances running?
   kubectl get pods -l app=paf-api -n <namespace>
   ```

2. **Check Recent Deployments**

   ```bash
   # Was there a recent deployment?
   kubectl rollout history deployment/paf-api -n <namespace>
   ```

3. **Check Logs for Errors**

   ```bash
   kubectl logs -l app=paf-api -n <namespace> --tail=50
   ```

4. **Common Causes:**
   - Dataset loading failure → Check binary files exist
   - OOM (Out of Memory) → Check memory usage
   - Port conflict → Check PORT environment variable
   - Recent deployment bug → Rollback

5. **Rollback if Recent Deployment**

   ```bash
   kubectl rollout undo deployment/paf-api -n <namespace>
   ```

6. **Notify Stakeholders**
   - Post in #paf-service: "PAF API is down. Investigating..."
   - Update incident management system

**Resolution Time Target**: 1 hour

### P2: Degraded Performance

**Symptoms:**

- p99 latency > 100ms
- Some instances failing health checks
- Elevated error rate (1-5%)

**Actions:**

1. **Check Auto-Scaling**
   - Is auto-scaling working?
   - Are we at max capacity?

2. **Check Resource Usage**
   - CPU > 80%? Scale out
   - Memory > 10 GB? Investigate leak

3. **Check Logs for Errors**
   - Are there repeated errors?
   - Is dataset corrupt?

4. **Scale Out if Needed**

   ```bash
   kubectl scale deployment paf-api --replicas=6 -n <namespace>
   ```

5. **Notify Stakeholders**
   - Post in #paf-service: "PAF API experiencing elevated latency. Scaling
     out..."

**Resolution Time Target**: 4 hours

### P3: Individual Instance Issues

**Symptoms:**

- 1-2 instances failing health checks
- No user impact (load balanced)
- Errors in logs for specific instance

**Actions:**

1. **Identify Problem Instance**

   ```bash
   kubectl get pods -l app=paf-api -n <namespace>
   ```

2. **Get Logs**

   ```bash
   kubectl logs <problem-pod> -n <namespace>
   ```

3. **Delete Problematic Pod** (will be recreated)

   ```bash
   kubectl delete pod <problem-pod> -n <namespace>
   ```

4. **Monitor Replacement**
   - Ensure new pod comes up healthy
   - Check health checks pass

**Resolution Time Target**: 2 business days

## Dataset Updates

### Overview

The Royal Mail PAF dataset is updated monthly. This section covers the process
for updating the production dataset.

### Prerequisites

- [ ] New Royal Mail PAF CSV file downloaded
- [ ] License verified for new data
- [ ] Builder package working and tested
- [ ] Sufficient storage for new binary files
- [ ] Maintenance window scheduled (optional - can be zero-downtime)

### Procedure

#### 1. Build New Dataset

**On your local machine or build server:**

```bash
# Clone repository
git clone <repo-url>
cd paf-monorepo

# Install dependencies
pnpm install

# Place new CSV file
cp royal_mail_paf_YYYYMM.csv packages/builder/input/

# Update input path in builder if needed
# Edit packages/builder/src/build.ts if filename changed

# Build new dataset
pnpm build:builder

# Verify output
ls -lh packages/builder/out/
# Should see: addresses.bin, postcodes.bin, offsets.bin, meta.json
```

**Validation:**

```bash
# Check meta.json
cat packages/builder/out/meta.json

# Verify row count matches expected
# Version should be incremented
# builtAt should be recent timestamp
```

Expected output:

```json
{
  "version": "2026-02",
  "rows": 40123456,
  "distinctPostcodes": 1789012,
  "builtAt": "2026-02-15T10:30:00.000Z",
  "checksums": {
    "addresses": "abc123...",
    "postcodes": "def456...",
    "offsets": "ghi789..."
  }
}
```

#### 2. Test New Dataset Locally

```bash
# Copy new dataset to API data directory
cp packages/builder/out/*.bin packages/api/data/
cp packages/builder/out/meta.json packages/api/data/

# Build and start API
pnpm build:builder
cd packages/api
pnpm build
pnpm start

# In another terminal, test
curl http://localhost:3000/health
curl "http://localhost:3000/address?country=GB&postcode=SW1A%201AA"
curl "http://localhost:3000/address?country=GB&postcode=M1%201AA"

# Run full test suite
pnpm test
pnpm test:coverage
```

**Verification Checklist:**

- [ ] Health check returns new dataset version
- [ ] Sample postcodes return correct addresses
- [ ] Previously working postcodes still work
- [ ] All tests pass
- [ ] Memory usage reasonable (~8-10 GB)

#### 3. Create Deployment Artifact

```bash
# Create new branch
git checkout -b dataset-update-2026-02

# Commit new dataset files
git add packages/api/data/*.bin
git add packages/api/data/meta.json
git commit -m "feat: update PAF dataset to 2026-02

- Updated to Royal Mail PAF February 2026 release
- 40,123,456 addresses
- 1,789,012 distinct postcodes
- Built on 2026-02-15"

# Push to repository
git push origin dataset-update-2026-02

# Create pull request
# Get approval from service owners
```

#### 4. Deploy to Staging/UAT

**Option A: Manual Deployment (ECS)**

```bash
# Build new container image with updated dataset
docker build -t paf-api:2026-02 .

# Tag and push to ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <ecr-url>
docker tag paf-api:2026-02 <ecr-url>/paf-api:2026-02
docker push <ecr-url>/paf-api:2026-02

# Update staging task definition
aws ecs register-task-definition --cli-input-json file://task-def-staging.json

# Update staging service
aws ecs update-service \
  --cluster <cluster-staging> \
  --service paf-api \
  --task-definition paf-api:REVISION \
  --force-new-deployment
```

**Option B: GitOps/CI/CD Pipeline**

```bash
# Merge PR to 'staging' branch
# CI/CD pipeline builds and deploys automatically
# Monitor deployment in your CI/CD tool
```

**Staging Validation:**

```bash
# Health check
curl https://api-staging.yourcompany.com/health

# Verify dataset version
# Check returned version matches 2026-02

# Test sample postcodes
curl "https://api-staging.yourcompany.com/address?country=GB&postcode=SW1A%201AA"

# Run smoke tests
# Run integration tests
```

#### 5. Deploy to Production

**Preparation:**

- [ ] Staging validation complete
- [ ] All stakeholders notified
- [ ] Rollback plan ready
- [ ] Monitoring dashboards open

**Deployment:**

```bash
# Blue-Green Deployment (recommended)

# ECS:
aws ecs update-service \
  --cluster <cluster-prod> \
  --service paf-api \
  --task-definition paf-api:NEW_REVISION \
  --force-new-deployment

# Kubernetes:
kubectl set image deployment/paf-api \
  paf-api=<ecr-url>/paf-api:2026-02 \
  -n production

# Monitor rollout
kubectl rollout status deployment/paf-api -n production
```

**Monitoring During Deployment:**

Watch these metrics for 30 minutes:

- Error rate (should stay < 0.1%)
- Latency (p99 should stay < 50ms)
- Memory usage per pod (~8-10 GB normal)
- Health check pass rate (should be 100%)

```bash
# Watch pod status
watch kubectl get pods -l app=paf-api -n production

# Watch logs
kubectl logs -f deployment/paf-api -n production

# Test from outside
curl https://api.yourcompany.com/health
```

**Success Criteria:**

- [ ] All pods healthy
- [ ] Health checks passing
- [ ] New dataset version confirmed
- [ ] Error rate < 0.1%
- [ ] p99 latency < 50ms
- [ ] Sample postcodes work
- [ ] No increase in 404 rate

#### 6. Post-Deployment Validation

**Immediate (T+0 to T+30 min):**

```bash
# Verify all instances updated
kubectl get pods -l app=paf-api -n production -o wide

# Check each pod is using new dataset
for pod in $(kubectl get pods -l app=paf-api -n production -o name); do
  echo "Pod: $pod"
  kubectl exec $pod -n production -- curl -s http://localhost:3000/health | jq .dataset.version
done

# All should return: "2026-02"
```

**Short-term (T+30 min to T+2 hours):**

- Monitor CloudWatch dashboards
- Watch for any alert notifications
- Check Slack for user reports
- Review error logs

**Long-term (T+24 hours):**

- Review metrics over 24 hours
- Compare error rates to baseline
- Verify 404 rate (not-found postcodes)
- Check performance metrics
- Update CHANGELOG.md

#### 7. Rollback (If Needed)

If issues detected during deployment:

```bash
# Kubernetes - rollback to previous version
kubectl rollout undo deployment/paf-api -n production

# Verify rollback
kubectl rollout status deployment/paf-api -n production

# ECS - update to previous task definition revision
aws ecs update-service \
  --cluster <cluster-prod> \
  --service paf-api \
  --task-definition paf-api:PREVIOUS_REVISION \
  --force-new-deployment
```

**Rollback Checklist:**

- [ ] Previous version redeployed
- [ ] All pods healthy
- [ ] Health checks passing
- [ ] Error rate back to normal
- [ ] Incident post-mortem scheduled

### Dataset Update Checklist

**Pre-Deployment:**

- [ ] New PAF CSV file obtained from Royal Mail
- [ ] License terms reviewed and complied with
- [ ] Dataset built successfully (`pnpm build:builder`)
- [ ] Binary files validated (checksums, row count)
- [ ] Local testing completed
- [ ] All tests passing
- [ ] PR created and reviewed
- [ ] Stakeholders notified of planned update
- [ ] Staging deployment successful
- [ ] Staging validation completed

**During Deployment:**

- [ ] Production deployment initiated
- [ ] New pods/tasks starting successfully
- [ ] Health checks passing
- [ ] Old pods/tasks terminating gracefully
- [ ] No spike in errors
- [ ] Latency within SLO
- [ ] Monitoring dashboards show green

**Post-Deployment:**

- [ ] All instances running new dataset version
- [ ] Sample postcodes verified
- [ ] Error rate < 0.1%
- [ ] Performance metrics normal
- [ ] No user-reported issues
- [ ] CHANGELOG.md updated
- [ ] Documentation updated (if needed)
- [ ] Post-deployment review completed

## Scaling Operations

### When to Scale Out

**Automatic triggers** (configured in auto-scaling):

- CPU usage > 60% for 5 minutes
- Memory usage > 80% for 5 minutes
- Request rate > threshold

**Manual triggers:**

- Anticipated traffic spike (planned event)
- Degraded performance
- p99 latency > 50ms sustained

### When to Scale In

**Automatic triggers:**

- CPU usage < 20% for 5 minutes
- Low request rate
- Off-peak hours

**Manual triggers:**

- After traffic spike ends
- Cost optimization
- Over-provisioned

### Scaling Best Practices

1. **Never scale to 0 instances** - Minimum 2 for HA
2. **Scale gradually** - Increase by 50-100% at a time
3. **Monitor after scaling** - Watch for 15 minutes
4. **Consider memory** - Each instance needs 12 GB RAM
5. **Update auto-scaling** - If manual scaling often needed

## Troubleshooting

### Issue: High Memory Usage

**Symptoms:**

- Memory > 10 GB per pod
- OOM kills
- Pods restarting frequently

**Diagnosis:**

```bash
# Check current memory usage
kubectl top pods -l app=paf-api -n production

# Check pod events for OOM
kubectl describe pod <pod-name> -n production | grep -A 10 Events

# Check logs for memory errors
kubectl logs <pod-name> -n production | grep -i memory
```

**Solutions:**

1. **Verify dataset size** - Should be ~8 GB for 40M records
2. **Check for memory leak** - Review application logs
3. **Increase memory limit** - Update resource limits to 16 GB
4. **Restart pods** - May clear temporary leak

### Issue: Slow Response Times

**Symptoms:**

- p99 latency > 50ms
- User complaints
- Timeouts

**Diagnosis:**

```bash
# Check current performance
curl -w "\nTime: %{time_total}s\n" "https://api.yourcompany.com/address?country=GB&postcode=SW1A%201AA"

# Check CPU usage
kubectl top pods -l app=paf-api -n production

# Check pod count
kubectl get pods -l app=paf-api -n production
```

**Solutions:**

1. **Scale out** - Add more pods if CPU > 60%
2. **Check dataset** - Ensure binary files not corrupted
3. **Review recent changes** - Was there a recent deployment?
4. **Check network** - ALB/network latency issue?

### Issue: Dataset Not Loading

**Symptoms:**

- Health check returns 503
- Error: "Dataset not loaded"
- Pods crashing at startup

**Diagnosis:**

```bash
# Check pod logs
kubectl logs <pod-name> -n production

# Check if binary files exist
kubectl exec <pod-name> -n production -- ls -lh /app/packages/api/data/

# Check file permissions
kubectl exec <pod-name> -n production -- ls -la /app/packages/api/data/
```

**Solutions:**

1. **Verify files in image** - Docker image includes dataset
2. **Check DATA_DIR** - Environment variable correct
3. **Check file integrity** - Checksums match meta.json
4. **Rebuild image** - May be corrupted during build

### Issue: High Error Rate

**Symptoms:**

- Error rate > 1%
- Many 500/503 responses
- Alerts firing

**Diagnosis:**

```bash
# Get error logs
kubectl logs -l app=paf-api -n production --tail=100 | grep ERROR

# Check for common errors
kubectl logs -l app=paf-api -n production | grep -E "(500|503)" | head -20

# Check dataset health
curl https://api.yourcompany.com/health/ready
```

**Solutions:**

1. **Check recent deployment** - Rollback if bad deploy
2. **Check dataset** - May be corrupted
3. **Scale out** - May be capacity issue
4. **Restart pods** - Clear transient errors

## Rollback Procedures

### Types of Rollback

1. **Application Rollback** - Revert to previous code version
2. **Dataset Rollback** - Revert to previous PAF dataset
3. **Configuration Rollback** - Revert environment variable changes

### Application Rollback

**When to rollback:**

- New deployment causing errors
- Performance degradation
- Breaking change deployed accidentally

**Procedure:**

```bash
# Kubernetes - rollback deployment
kubectl rollout undo deployment/paf-api -n production

# Check rollout status
kubectl rollout status deployment/paf-api -n production

# Verify previous version running
kubectl get pods -l app=paf-api -n production -o jsonpath='{.items[*].spec.containers[*].image}'

# ECS - update to previous task definition
aws ecs update-service \
  --cluster <cluster-prod> \
  --service paf-api \
  --task-definition paf-api:PREVIOUS_GOOD_REVISION
```

**Validation:**

- Health checks passing
- Error rate back to normal
- Latency within SLO
- Sample requests working

### Dataset Rollback

**When to rollback:**

- New dataset has data quality issues
- Unexpected increase in 404 rate
- Corrupt binary files

**Procedure:**

```bash
# Option 1: Rollback to previous container image
kubectl set image deployment/paf-api \
  paf-api=<ecr-url>/paf-api:PREVIOUS_VERSION \
  -n production

# Option 2: Replace dataset files (if using persistent volume)
# Restore previous dataset files from backup
aws s3 cp s3://paf-datasets/2026-01/ /path/to/data/ --recursive
kubectl rollout restart deployment/paf-api -n production
```

**Validation:**

- Health check shows previous dataset version
- Sample postcodes return correct data
- 404 rate back to normal

### Configuration Rollback

**When to rollback:**

- Environment variable change causing issues
- Incorrect configuration
- Performance degradation from config change

**Procedure:**

```bash
# Kubernetes - edit ConfigMap
kubectl edit configmap paf-api-config -n production
# Revert changes to previous values

# Restart deployment
kubectl rollout restart deployment/paf-api -n production

# ECS - update task definition
# Create new task definition with previous env vars
# Update service to use new revision
```

## Monitoring & Alerts

### Key Dashboards

**CloudWatch Dashboard:**

- Request rate (requests/minute)
- Error rate (errors/total requests)
- Latency (p50, p95, p99)
- Memory usage (MB per pod)
- CPU usage (%)
- Healthy instance count

**APM Dashboard** (New Relic/Datadog):

- Application performance
- Transaction traces
- Error analysis
- Dependency mapping

### Alert Response

When you receive an alert:

1. **Acknowledge** - Let team know you're on it
2. **Assess** - Check dashboards, logs, service status
3. **Triage** - P1 (service down), P2 (degraded), P3 (warning)
4. **Act** - Follow runbook procedures above
5. **Communicate** - Update #paf-service with status
6. **Resolve** - Fix issue, validate, close alert
7. **Document** - Update runbook if new scenario

### Common Alerts

| Alert                 | Severity | Action                                      |
| --------------------- | -------- | ------------------------------------------- |
| Service Down          | P1       | Investigate immediately, rollback if needed |
| High Error Rate       | P1       | Check logs, scale out, or rollback          |
| High Latency          | P2       | Scale out, check resource usage             |
| High Memory           | P2       | Check for leak, restart pods                |
| Dataset Age > 30 Days | P3       | Plan dataset update                         |

## Additional Resources

- **Service Ownership**: [CODEOWNER.md](CODEOWNER.md)
- **Infrastructure Details**: [HOSTING.md](HOSTING.md)
- **Security Procedures**: [SECURITY.md](SECURITY.md)
- **API Documentation**: [CONSUMER.md](CONSUMER.md)
- **Development Guide**: [README.md](README.md)

---

**Last Updated**: February 7, 2026  
**Maintained By**: Service Owners (see [CODEOWNER.md](CODEOWNER.md))  
**Review Schedule**: Quarterly or after major incidents
