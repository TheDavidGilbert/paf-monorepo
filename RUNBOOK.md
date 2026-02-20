# PAF Address Lookup Service - Operations Guide

This guide covers common operational tasks for running the PAF Address Lookup Service.

## Table of Contents

- [Service Endpoints](#service-endpoints)
- [Architecture](#architecture)
- [Common Operations](#common-operations)
- [Dataset Updates](#dataset-updates)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## Service Endpoints

| Endpoint                               | Purpose               | Expected Response            |
| -------------------------------------- | --------------------- | ---------------------------- |
| `/health`                              | Combined health check | 200 OK + dataset info        |
| `/health/live`                         | Liveness probe        | 200 OK (always if running)   |
| `/health/ready`                        | Readiness probe       | 200 OK (when ready to serve) |
| `/lookup/postcode?postcode=SW1A1AA`    | Postcode lookup       | 200 OK + address data        |
| `/lookup/autocomplete?q=SW1A`          | Postcode autocomplete | 200 OK + matching postcodes  |

## Architecture

```
Client → Load Balancer → Application Instance(s) → In-Memory Dataset
```

**Key characteristics:**

- **Application instances**: Node.js process with the full dataset loaded in memory
- **Dataset**: Royal Mail PAF records read into RAM at startup (read-only)
- **Startup time**: 2–12 seconds depending on dataset size
- **No external dependencies**: No database, no cache — all data is in-process memory

## Common Operations

### Service Restart

**When to use:** Memory leak suspected, configuration change, degraded state.

```bash
# Kubernetes
kubectl rollout restart deployment/paf-api -n <namespace>
kubectl rollout status deployment/paf-api -n <namespace>

# AWS ECS
aws ecs update-service \
  --cluster <cluster-name> \
  --service paf-api \
  --force-new-deployment
```

**Validate after restart:**

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"
```

### View Logs

**Kubernetes:**

```bash
kubectl logs -l app=paf-api -n <namespace> --tail=100
kubectl logs -f deployment/paf-api -n <namespace>
```

**AWS ECS / CloudWatch:**

```bash
aws logs tail /aws/ecs/paf-api --follow
aws logs filter-log-events \
  --log-group-name /aws/ecs/paf-api \
  --filter-pattern "ERROR"
```

**Key log messages:**

| Message | Meaning |
|---|---|
| `Server listening on` | Successful startup |
| `Dataset loaded:` | Dataset loaded successfully |
| `Dataset not loaded` | Dataset loading failure |
| `SIGTERM received` | Graceful shutdown initiated |

### Check Service Status

```bash
# Kubernetes
kubectl get pods -l app=paf-api -n <namespace>
kubectl describe pod <pod-name> -n <namespace>

# AWS ECS
aws ecs describe-services \
  --cluster <cluster-name> \
  --services paf-api
```

### Scale Service

```bash
# Kubernetes
kubectl scale deployment paf-api --replicas=4 -n <namespace>

# AWS ECS
aws ecs update-service \
  --cluster <cluster-name> \
  --service paf-api \
  --desired-count 4
```

Minimum 2 instances recommended for high availability. Each instance requires approximately 12 GB RAM for a production (40M record) dataset.

### Update Environment Variables

**Key variables:**

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DATA_DIR` | `./data` | Path to binary data files |
| `NODE_ENV` | — | Set to `production` |
| `NODE_OPTIONS` | — | e.g. `--max-old-space-size=10240` |
| `LOG_LEVEL` | `info` | `info` or `warn` |

```bash
# Kubernetes — edit ConfigMap then restart
kubectl edit configmap paf-api-config -n <namespace>
kubectl rollout restart deployment/paf-api -n <namespace>
```

## Dataset Updates

The Royal Mail PAF dataset is updated monthly. Follow this process to deploy a new version.

### 1. Build New Dataset

```bash
# Place new CSV files in the builder input directory
cp royal_mail_paf_YYYYMM.csv packages/builder/input/CSV\ PAF/

# Build
pnpm build:builder

# Verify output
ls -lh packages/api/data/
```

Verify `meta.json` looks correct:

```bash
cat packages/api/data/meta.json
```

Expected structure:

```json
{
  "version": "paf-2026-02-20",
  "builtAt": "2026-02-20T10:30:00.000Z",
  "rows": 40123456,
  "distinctPostcodes": 1789012,
  "checksums": { ... }
}
```

### 2. Test Locally

```bash
pnpm --filter @paf/api build
pnpm --filter @paf/api start

# In another terminal
curl http://localhost:3000/health
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"
pnpm --filter @paf/api test
```

**Verification checklist:**

- [ ] Health check returns new dataset version
- [ ] Sample postcodes return correct addresses
- [ ] All tests pass
- [ ] Memory usage reasonable (~9 GB for 40M records)

### 3. Deploy

```bash
# Build and push container image (adjust for your registry)
docker build -t paf-api:2026-02 .
docker push <registry>/paf-api:2026-02

# Kubernetes rolling update
kubectl set image deployment/paf-api \
  paf-api=<registry>/paf-api:2026-02 \
  -n <namespace>
kubectl rollout status deployment/paf-api -n <namespace>
```

**Post-deploy check:**

```bash
# Confirm dataset version on running instances
kubectl exec <pod-name> -n <namespace> -- \
  curl -s http://localhost:3000/health | grep version
```

### 4. Rollback Dataset (if needed)

```bash
# Kubernetes — revert to previous image
kubectl rollout undo deployment/paf-api -n <namespace>

# ECS — update to previous task definition revision
aws ecs update-service \
  --cluster <cluster-prod> \
  --service paf-api \
  --task-definition paf-api:PREVIOUS_REVISION
```

## Troubleshooting

### High Memory Usage

**Symptoms:** Memory significantly above expected (~9 GB for 40M records), OOM kills, frequent restarts.

```bash
# Check current memory usage
kubectl top pods -l app=paf-api -n <namespace>

# Check pod events for OOM
kubectl describe pod <pod-name> -n <namespace>

# Check health endpoint for memory info
curl http://localhost:3000/health | jq .memory
```

**Solutions:**
1. Verify dataset size — `rows.bin` should be roughly 7–9 GB for 40M records
2. Check for memory leak in application logs
3. Increase pod memory limit
4. Restart affected pods

### Slow Response Times

**Symptoms:** High latency, timeouts.

```bash
# Quick latency check
curl -w "\nTime: %{time_total}s\n" \
  "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"

# Check CPU and memory
kubectl top pods -l app=paf-api -n <namespace>
```

**Solutions:**
1. Scale out if CPU is high
2. Verify binary files are not corrupted (`checksums` in `meta.json`)
3. Check for a recent deployment that may have introduced a regression

### Dataset Not Loading

**Symptoms:** Health check returns 503, error "Dataset not loaded", pods crash on startup.

```bash
# Check logs
kubectl logs <pod-name> -n <namespace>

# Verify binary files exist in the container
kubectl exec <pod-name> -n <namespace> -- ls -lh /app/packages/api/data/
```

**Solutions:**
1. Confirm `DATA_DIR` environment variable points to the correct path
2. Verify the Docker image includes the `data/` directory
3. Check that the builder ran successfully and all files are present
4. Rebuild the container image

### High Error Rate

**Symptoms:** Many 5xx responses.

```bash
# Get recent error logs
kubectl logs -l app=paf-api -n <namespace> --tail=100 | grep ERROR

# Check readiness
curl http://localhost:3000/health/ready
```

**Solutions:**
1. Check for a recent deployment — rollback if so
2. Verify the dataset is not corrupted
3. Scale out if the issue is capacity-related
4. Restart pods to clear transient errors

## Rollback Procedures

### Application Rollback

```bash
# Kubernetes
kubectl rollout undo deployment/paf-api -n <namespace>
kubectl rollout status deployment/paf-api -n <namespace>

# ECS
aws ecs update-service \
  --cluster <cluster-prod> \
  --service paf-api \
  --task-definition paf-api:PREVIOUS_GOOD_REVISION
```

**Validate:**

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/lookup/postcode?postcode=SW1A%201AA"
```

### Configuration Rollback

```bash
# Kubernetes — revert ConfigMap and restart
kubectl edit configmap paf-api-config -n <namespace>
kubectl rollout restart deployment/paf-api -n <namespace>
```

---

**See also:** [HOSTING.md](HOSTING.md) | [CONSUMER.md](CONSUMER.md) | [SECURITY.md](SECURITY.md)
