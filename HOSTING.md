# Hosting Guide

The PAF Address Lookup Service is a memory-intensive, compute-light application.
It loads the entire Royal Mail PAF dataset into RAM at startup and serves
lookups directly from memory with no database or cache dependency.

## Memory Requirements

Memory usage scales with dataset size. The binary files are loaded entirely into
RAM.

| Dataset Size                    | Estimated RAM | Recommended Allocation |
| ------------------------------- | ------------- | ---------------------- |
| Sample (584K addresses)         | ~230 MB       | 512 MB                 |
| 1 million addresses             | ~400 MB       | 1 GB                   |
| 10 million addresses            | ~2.2 GB       | 4 GB                   |
| 30 million addresses            | ~6.5 GB       | 9 GB                   |
| 40 million addresses (full PAF) | ~9 GB         | 12 GB                  |

> These are estimates. Always measure actual memory usage with your dataset via
> `/health` or `process.memoryUsage()`.

## Docker Run

```bash
docker run -d \
  --name paf-api \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATA_DIR=/app/packages/api/data \
  -e NODE_OPTIONS="--max-old-space-size=10240" \
  -e LOG_LEVEL=warn \
  --memory=12g \
  paf-api:latest
```

Adjust `--memory` and `--max-old-space-size` to match your dataset size (see
table above). For the sample dataset, `--memory=512m` and
`--max-old-space-size=384` are sufficient.

## Environment Variables

| Variable              | Default  | Description                                                                  |
| --------------------- | -------- | ---------------------------------------------------------------------------- |
| `PORT`                | `3000`   | HTTP server port                                                             |
| `DATA_DIR`            | `./data` | Path to binary dataset files                                                 |
| `NODE_ENV`            | —        | Set to `production` for production deployments                               |
| `NODE_OPTIONS`        | —        | Use `--max-old-space-size=N` (MB) to cap V8 heap                             |
| `LOG_LEVEL`           | `info`   | Set to `warn` in production to reduce logging overhead                       |
| `ENABLE_STREET_INDEX` | `false`  | Set to `true` to load the thoroughfare index and enable `GET /lookup/street` |

### Street index memory overhead

When `ENABLE_STREET_INDEX=true` the four thoroughfare index files are loaded
into RAM in addition to the main dataset:

| Dataset size             | Additional RAM |
| ------------------------ | -------------- |
| Sample (584K addresses)  | ~3 MB          |
| Full PAF (40M addresses) | ~215 MB        |

Increase `--memory` and `--max-old-space-size` accordingly when enabling this
feature on large datasets.

## Health Check Endpoints

| Endpoint            | Purpose                                | Success Response                     |
| ------------------- | -------------------------------------- | ------------------------------------ |
| `GET /health`       | Combined check — dataset info + status | `200 OK` with dataset metadata       |
| `GET /health/live`  | Liveness — is the process running?     | `200 OK` with `{"status":"alive"}`   |
| `GET /health/ready` | Readiness — is the dataset loaded?     | `200 OK` when ready to serve traffic |

Use `/health/ready` for load balancer health checks so traffic is only routed
once the dataset is fully loaded.

## Startup Time

The dataset is loaded synchronously at startup. Allow for:

- Sample dataset: 2–5 seconds
- Full 40M record dataset: 8–15 seconds

Configure your health check `initialDelaySeconds` (or equivalent) accordingly.

## CORS

By default only `localhost` is allowed. To add your own domains, edit
`packages/api/src/server.ts` and add your domain patterns to the CORS
configuration. See `README.md` for examples.

## Performance Characteristics

All lookups are served from in-memory binary data using binary search.

| Metric      | Value   |
| ----------- | ------- |
| p50 latency | < 10 ms |
| p95 latency | < 15 ms |
| p99 latency | < 25 ms |

Throughput on a single instance is limited primarily by network I/O and JSON
serialisation, not CPU or memory access. Expected capacity is 1,000–5,000
requests/second on typical hardware.

## Notes

- The dataset is read-only after startup; there are no disk reads during request
  handling
- No database, no external cache — the process is fully self-contained
- Lambda and similar serverless platforms are not suitable due to memory
  requirements and cold-start penalties
- For higher availability, run two instances behind a reverse proxy (nginx,
  Caddy, etc.)

---

**See also:** [RUNBOOK.md](RUNBOOK.md) | [SECURITY.md](SECURITY.md)
