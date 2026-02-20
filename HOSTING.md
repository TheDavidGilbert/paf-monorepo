# Hosting & Performance Guide

This document provides hosting recommendations, performance characteristics, and
operational guidelines for deploying the PAF Address Lookup Service.

## Table of Contents

- [Overview](#overview)
- [Memory Requirements](#memory-requirements)
- [Performance Characteristics](#performance-characteristics)
- [Hosting Recommendations](#hosting-recommendations)
- [Scaling Strategy](#scaling-strategy)
- [Configuration Guidelines](#configuration-guidelines)
- [Health Check Endpoints](#health-check-endpoints)
- [Performance Tuning](#performance-tuning)
- [Load Testing](#load-testing)
- [Troubleshooting](#troubleshooting)

## Overview

The PAF Address Lookup Service is a **memory-intensive**, **compute-light**
application that loads the entire Royal Mail PAF dataset into memory at startup
for ultra-fast lookups. This architecture prioritises response time over memory
efficiency.

### Key Characteristics

- **Memory Model**: Entire dataset loaded into RAM (read-only after startup)
- **CPU Profile**: Low CPU usage during normal operation
- **I/O Pattern**: Minimal disk I/O after startup (only logging)
- **Startup Time**: 2-5 seconds (dataset load time)
- **Runtime**: Long-running process (days/weeks between restarts)

## Memory Requirements

### Dataset Size

Current dataset (Royal Mail PAF sample):

- **Addresses**: 584,266
- **Postcodes**: 37,150
- **Binary files**: `rows.bin`, `rowStart.bin`, `distinctPcKey.bin`, `pcStart.bin`, `pcEnd.bin`, `schema.json`, `meta.json` (+ MR files if Multiple Residence data is present)

### Memory Footprint

**Minimum Requirements (sample dataset):**

| Component            | Memory     | Notes                      |
| -------------------- | ---------- | -------------------------- |
| Node.js runtime      | 50 MB      | Base V8 heap               |
| Dataset binary files | 55 MB      | Sample dataset loaded into memory |
| Fastify framework    | 20 MB      | HTTP server overhead       |
| Heap headroom        | 100 MB     | GC and temporary objects   |
| **Total minimum**    | **230 MB** | Bare minimum for sample dataset |

**Recommended Allocation:**

| Environment | RAM             | Reasoning                           |
| ----------- | --------------- | ----------------------------------- |
| Development | 512 MB          | Comfortable development             |
| Testing     | 512 MB          | Test execution overhead             |
| Production  | **1 GB - 2 GB** | Production workload + safety margin |

### Full PAF Dataset Projections

Production deployment with complete Royal Mail PAF data (16 fields including B2B fields):

| Dataset Size                          | Estimated RAM | Recommended Allocation |
| ------------------------------------- | ------------- | ---------------------- |
| 1 million addresses                   | 400 MB        | 1 GB                   |
| 10 million addresses                  | 2.2 GB        | 4 GB                   |
| 30 million addresses                  | 6.5 GB        | 9 GB                   |
| **40 million addresses (Production)** | **9 GB**      | **12 GB**              |

> **Note**: Production deployment will use the complete Royal Mail PAF with **40
> million records**. The full dataset contains significantly more commercial
> addresses (organisation names, department names, PO Boxes) than the sample,
> which increases average row size. These are estimates — always measure actual
> memory usage with your specific dataset using `process.memoryUsage()`.

## Performance Characteristics

### Response Times

**Lookup Operations** (no caching - direct memory lookup):

| Metric       | Value   | Notes                             |
| ------------ | ------- | --------------------------------- |
| p50 (median) | < 10 ms | Binary search on sorted postcodes |
| p95          | < 15 ms | Typical request                   |
| p99          | < 25 ms | Including GC pauses               |
| p99.9        | < 50 ms | Outliers (GC, CPU contention)     |

**Startup Performance**:

| Phase            | Sample Dataset | Production (40M) | Notes                        |
| ---------------- | -------------- | ---------------- | ---------------------------- |
| Binary file load | 1-3 seconds    | 5-8 seconds      | Synchronous read into memory |
| Index building   | 0.5-1 second   | 2-3 seconds      | Postcode lookups             |
| Server ready     | 2-5 seconds    | 8-12 seconds     | Total cold start             |

> **Production Note**: Allow up to 15 seconds for safe startup with 40M records.
> Configure readiness probes accordingly.

### Throughput

Expected throughput (single instance):

| Scenario        | Requests/sec   | Notes                    |
| --------------- | -------------- | ------------------------ |
| Light load      | 1,000 - 2,000  | Minimal CPU usage        |
| Medium load     | 2,000 - 5,000  | Efficient memory lookups |
| Heavy load      | 5,000 - 10,000 | May require tuning       |
| Theoretical max | 15,000+        | With optimizations       |

**Bottlenecks:**

- Network I/O (not memory/CPU)
- JSON serialization
- Logging overhead

## Hosting Recommendations

> **Deployment Target**: This service will be deployed to **AWS**
> infrastructure.

### Container Requirements

**Docker/Kubernetes (Development/Test):**

```yaml
resources:
  requests:
    memory: '1Gi' # Minimum for scheduling
    cpu: '250m' # 0.25 CPU cores
  limits:
    memory: '2Gi' # Maximum allowed
    cpu: '1000m' # 1 CPU core
```

**Docker/Kubernetes (Production - 40M records):**

```yaml
resources:
  requests:
    memory: '8Gi' # Minimum for 40M record dataset
    cpu: '500m' # 0.5 CPU cores
  limits:
    memory: '12Gi' # Safety margin for GC and spikes
    cpu: '2000m' # 2 CPU cores for burst capacity
```

**Why these values:**

- Memory request ensures enough RAM for 40M record dataset
- Memory limit provides safety margin for spikes and garbage collection
- CPU request is low (compute-light application)
- CPU limit allows burst capacity for high traffic

### AWS Hosting Recommendations

> **Note**: These are example hosting options. You can deploy this service to any
> infrastructure that meets the memory requirements.

#### EC2 Instance Types (Examples)

**Development/Testing:**

| Instance Type | vCPUs | RAM  | Use Case                             |
| ------------- | ----- | ---- | ------------------------------------ |
| t4g.small     | 2     | 2 GB | Development/Testing (sample dataset) |
| t4g.medium    | 2     | 4 GB | Integration testing                  |

**Production (40M records):**

| Instance Type | vCPUs | RAM   | Use Case                           |
| ------------- | ----- | ----- | ---------------------------------- |
| r6g.xlarge    | 4     | 32 GB | Production (recommended)           |
| r6g.2xlarge   | 8     | 64 GB | High-traffic production            |
| r7g.xlarge    | 4     | 32 GB | Latest generation (cost-optimised) |
| m6g.2xlarge   | 8     | 32 GB | Alternative (balanced)             |

> **Suggestion**: Use **r6g.xlarge** (memory-optimised, Graviton2) or similar
> memory-optimised instances for production. The 32 GB RAM provides comfortable
> headroom for the 8 GB dataset plus OS, buffers, and GC overhead.

#### Container Services

**ECS Fargate:**

```json
{
  "cpu": "2048", // 2 vCPU
  "memory": "12288" // 12 GB RAM (production)
}
```

**EKS (Elastic Kubernetes Service):**

- **Node Group**: r6g.xlarge instances
- **Pod Resources**: See Container Requirements above
- **Cluster Autoscaler**: Scale based on memory pressure

**Lambda:**

> ⚠️ **Not Suitable**: AWS Lambda has a 10 GB memory limit and cold start
> penalties. This service requires always-on availability and 12 GB+ RAM for
> production datasets. Use ECS/EKS instead.

### Load Balancer Configuration

**Application Load Balancer (ALB):**

```yaml
Health Check:
  Protocol: HTTP
  Path: /health
  Port: 3000
  Interval: 30 seconds
  Timeout: 5 seconds
  Healthy Threshold: 2
  Unhealthy Threshold: 3

Target Group:
  Protocol: HTTP
  Port: 3000
  Deregistration Delay: 30 seconds

Listener:
  Protocol: HTTPS
  Port: 443
  SSL Policy: ELBSecurityPolicy-TLS-1-2-2017-01
```

**Important**: Set ALB idle timeout to **75 seconds** (higher than Node.js
`keepAliveTimeout` of 72 seconds) to prevent connection issues.

## Scaling Strategy

### Horizontal Scaling (Recommended)

**Approach**: Run multiple instances behind a load balancer.

**Advantages:**

- Linear scalability
- High availability
- Rolling deployments
- No downtime during updates

**Configuration:**

```plaintext
Load Balancer (ALB/NLB)
  ├── Instance 1 (1 GB RAM)
  ├── Instance 2 (1 GB RAM)
  └── Instance N (1 GB RAM)
```

**Scaling Rules:**

| Metric            | Threshold | Action                   |
| ----------------- | --------- | ------------------------ |
| CPU usage         | > 60%     | Scale out (+1 instance)  |
| CPU usage         | < 20%     | Scale in (-1 instance)   |
| Memory usage      | > 80%     | Alert (investigate leak) |
| Response time p95 | > 50ms    | Scale out                |

**Minimum Instances:**

- **Development**: 1
- **Production**: 2 (for high availability)
- **High-traffic**: 3-10+

### Vertical Scaling (Not Recommended)

**Approach**: Increase RAM/CPU of single instance.

**Disadvantages:**

- Single point of failure
- Downtime during scaling
- Limited by instance size
- Inefficient cost scaling

**When to use:**

- Development/testing environments
- Very low traffic scenarios
- Cost optimization for minimal workloads

### Auto-Scaling Configuration

**Kubernetes HPA (Horizontal Pod Autoscaler):**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: paf-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: paf-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # 5 min stabilization
      policies:
        - type: Percent
          value: 50 # Scale down by 50% at a time
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60 # 1 min stabilization
      policies:
        - type: Percent
          value: 100 # Double instances quickly
          periodSeconds: 60
```

**AWS ECS Auto Scaling:**

```json
{
  "TargetValue": 60.0,
  "PredefinedMetricType": "ECSServiceAverageCPUUtilization",
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300
}
```

## Configuration Guidelines

### Node.js Tuning

**Environment Variables (Development/Test - sample dataset):**

```bash
# Memory limits (for 2 GB container with sample dataset)
NODE_OPTIONS="--max-old-space-size=1536"  # 1.5 GB for V8 heap

# Production optimizations
NODE_ENV=production

# Logging
LOG_LEVEL=info  # or 'warn' for production
```

**Environment Variables (Production - 40M records):**

```bash
# Memory limits (for 12 GB container with 40M records)
NODE_OPTIONS="--max-old-space-size=10240"  # 10 GB for V8 heap

# Production optimizations
NODE_ENV=production

# Logging
LOG_LEVEL=warn  # Reduce logging overhead in production
```

**Why these values?**

- Production: 10 GB heap leaves 2 GB for OS, buffers, and overhead
- Development: 1.5 GB heap sufficient for sample dataset
- Prevents aggressive GC thrashing
- Allows headroom for temporary allocations

### Fastify Configuration

**Server Options:**

```typescript
const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  requestTimeout: 5000, // 5 second timeout
  keepAliveTimeout: 72000, // 72 seconds (AWS ALB default + buffer)
  maxParamLength: 200, // Limit query string params
  bodyLimit: 1048576, // 1 MB max body (we don't accept bodies)
  trustProxy: true, // Behind load balancer
});
```

### CORS Configuration

By default, only `localhost` is allowed. Update the CORS configuration in
[packages/api/src/server.ts](packages/api/src/server.ts) to add your own
domains. See README for examples.

## Health Check Endpoints

**Liveness Probe** (is the container alive?):

```bash
GET /health/live
```

Expected: `200 OK` with `{"status":"alive","uptime":12345}`

**Legacy Health Check** (combined liveness + readiness):

```bash
GET /health
```

Expected: `200 OK` with dataset info and memory usage

**Kubernetes Configuration (Development/Test):**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10 # Allow startup time (sample dataset)
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

**Kubernetes Configuration (Production - 40M records):**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 20 # Allow startup time for 40M records
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

**Readiness Probe** (is the container ready to serve traffic?):

```bash
GET /health/ready
# Returns 200 only when dataset loaded and memory usage < 95%
```

**Kubernetes Configuration (Development/Test):**

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```

**Kubernetes Configuration (Production - 40M records):**

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 15 # Wait for 40M record dataset load
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

## Performance Tuning

### 1. Node.js Cluster Mode

**Use Case**: Multi-core instances with extra RAM.

```typescript
// For multi-core instances, use cluster mode
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  // Only fork if we have enough RAM for multiple dataset copies
  const workersToFork = Math.min(numCPUs, Math.floor(totalRAM / datasetSize));

  for (let i = 0; i < workersToFork; i++) {
    cluster.fork();
  }
} else {
  // Start Fastify server
  startServer();
}
```

**Pros:**

- Utilize all CPU cores
- Better throughput on multi-core instances

**Cons:**

- Memory usage multiplies (N copies of dataset)
- **Production (40M records)**: Each worker needs ~10 GB
  - 4 workers = 40 GB RAM required
  - Only use on very large instances (r6g.2xlarge or bigger)

**Recommendation**: For production, use **horizontal scaling** (multiple
single-process instances) instead of cluster mode. This provides better resource
utilization and fault isolation.

### 2. Response Caching

**In-Memory Cache** (for frequently accessed postcodes):

```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, SearchResponse>({
  max: 10000, // Cache 10,000 postcodes
  ttl: 3600000, // 1 hour TTL
  maxSize: 50000000, // 50 MB max cache size
  sizeCalculation: (value) => JSON.stringify(value).length,
});
```

**Impact:**

- Reduces lookup time to ~0.1 ms for cached entries
- Adds 50-100 MB memory overhead
- Best for high-traffic, frequently repeated postcodes

### 3. Connection Pooling

**Keep-Alive Configuration:**

```typescript
server.addHook('onRequest', async (request, reply) => {
  reply.header('Connection', 'keep-alive');
  reply.header('Keep-Alive', 'timeout=60');
});
```

### 4. Compression

**Enable gzip/brotli** (if not handled by load balancer):

```typescript
import compress from '@fastify/compress';

await server.register(compress, {
  global: true,
  threshold: 1024, // Compress responses > 1 KB
  encodings: ['gzip', 'deflate'],
});
```

**Impact:**

- Reduces payload size by 70-80%
- Adds minimal CPU overhead
- Better for slow networks

## Load Testing

### Tools

- **Artillery**: Scriptable load testing
- **k6**: Modern load testing tool
- **Apache Bench (ab)**: Simple CLI testing
- **JMeter**: GUI-based testing

### Example Load Test (Artillery)

**artillery-test.yml:**

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10 # Ramp to 10 req/s
      name: 'Warm up'
    - duration: 300
      arrivalRate: 100 # Sustain 100 req/s
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 500 # Spike to 500 req/s
      name: 'Spike test'
  processor: './test-helpers.js'

scenarios:
  - name: 'Postcode Lookup'
    flow:
      - get:
          url: '/lookup/postcode?postcode={{ postcode }}'
          beforeRequest: 'setPostcode'
```

**test-helpers.js:**

```javascript
module.exports = { setPostcode };

const postcodes = ['SW1A 1AA', 'EC1A 1BB', 'W1A 0AX', 'PL1 1LR'];

function setPostcode(context, ee, next) {
  context.vars.postcode =
    postcodes[Math.floor(Math.random() * postcodes.length)];
  return next();
}
```

**Run test:**

```bash
artillery run artillery-test.yml
```

### Load Test Benchmarks

**Expected Results** (1 instance, 12 GB RAM, production dataset):

| Metric      | 100 req/s | 500 req/s | 1000 req/s |
| ----------- | --------- | --------- | ---------- |
| p50 latency | 5 ms      | 8 ms      | 12 ms      |
| p95 latency | 12 ms     | 20 ms     | 35 ms      |
| p99 latency | 20 ms     | 40 ms     | 60 ms      |
| Error rate  | 0%        | 0%        | < 1%       |
| CPU usage   | 15%       | 35%       | 55%        |

> **Note**: These benchmarks are for the 40M record production dataset. Test
> with your actual data before production deployment.

**When to scale:**

- p99 > 50 ms consistently
- CPU > 70%
- Error rate > 0.1%

## Troubleshooting

### High Memory Usage

**Symptoms:**

- Memory usage > 11 GB (production)
- OOM (Out of Memory) crashes
- Frequent restarts

**Diagnosis:**

```bash
# Check memory usage
curl http://localhost:3000/health

# Node.js memory snapshot
node --inspect server.js
# Chrome DevTools → Memory → Take heap snapshot
```

**Solutions:**

1. Increase `max-old-space-size`
2. Check for memory leaks (heap snapshots)
3. Restart instances regularly (if leak unfixable)
4. Upgrade to larger instances

### High Latency

**Symptoms:**

- p99 > 50 ms
- Slow response times
- User complaints

**Diagnosis:**

```bash
# Check event loop lag
curl http://localhost:3000/health
# Look for "eventLoopLag" metric

# APM tools - flame graphs
```

**Solutions:**

1. Scale out (add more instances)
2. Enable response caching
3. Check network latency (load balancer → instance)
4. Review logging verbosity (reduce if excessive)

### Startup Failures

**Symptoms:**

- Container crashes on startup
- "Cannot find module" errors
- Binary file not found

**Diagnosis:**

```bash
# Check binary files exist
ls -lh packages/api/data/

# Check file permissions
ls -l packages/api/data/addresses.bin
```

**Solutions:**

1. Ensure `pnpm build:builder` ran successfully
2. Verify binary files are included in Docker image
3. Check file paths in [dataset.ts](packages/api/src/dataset.ts)

### DNS/Network Issues

**Symptoms:**

- CORS errors
- Connection timeouts
- Load balancer health checks failing

**Solutions:**

1. Verify CORS configuration matches your domains
2. Check load balancer timeout > `keepAliveTimeout`
3. Ensure security groups allow traffic on port 3000
4. Test health endpoint: `curl http://instance-ip:3000/health`

## Summary

### Quick Reference

**Production Setup (40M records):**

- **Cloud Provider**: Your choice (AWS, Azure, GCP, etc.)
- **Instances**: 2 minimum (for High Availability)
- **RAM per instance**: 12 GB minimum
- **CPU per instance**: 2+ cores
- **Example Instance**: AWS r6g.xlarge (32 GB RAM, 4 vCPU) or equivalent

**Scaling indicators:**

- Scale out when: CPU is consistently high, p99 latency is elevated, or request rate is approaching capacity
- Scale in when: CPU is consistently low during off-peak periods

### Deployment Checklist

1. Provision infrastructure with adequate memory (12+ GB RAM per instance for 40M records)
2. Configure load balancer with health checks pointing to `/health/live` and `/health/ready`
3. Build the dataset using the builder package and include binary files in your container image
4. Run load tests with your production dataset to validate performance before going live

---

**Questions?** See [CODEOWNER.md](CODEOWNER.md) for maintainer contacts or open
an issue on GitHub.

**Last Updated:** February 20, 2026  
**Next Review:** August 20, 2026
