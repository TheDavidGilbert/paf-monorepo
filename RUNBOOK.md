# Operations Runbook

Practical reference for running the PAF Address Lookup Service on a single
Docker instance.

## Service Endpoints

| Endpoint                               | Purpose               | Expected Response           |
| -------------------------------------- | --------------------- | --------------------------- |
| `GET /health`                          | Combined health check | 200 OK + dataset info       |
| `GET /health/live`                     | Liveness probe        | 200 OK (always if running)  |
| `GET /health/ready`                    | Readiness probe       | 200 OK (when dataset ready) |
| `GET /lookup/address?postcode=SW1A1AA` | Postcode lookup       | 200 OK + address data       |
| `GET /lookup/postcode?q=SW1A`          | Postcode autocomplete | 200 OK + matching postcodes |

## Service Restart

```bash
docker restart paf-api

# Validate after restart
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl "http://localhost:3000/lookup/address?postcode=SW1A%201AA"
```

## Key Log Messages

| Message               | Meaning                     |
| --------------------- | --------------------------- |
| `Server listening on` | Successful startup          |
| `Dataset loaded:`     | Dataset loaded successfully |
| `Dataset not loaded`  | Dataset loading failure     |
| `SIGTERM received`    | Graceful shutdown initiated |

## Dataset Updates

The Royal Mail PAF dataset is updated monthly. To deploy a new version:

### 1. Build the new dataset

```bash
# Place new CSV files in the builder input directory
cp royal_mail_paf_YYYYMM.csv packages/builder/input/

pnpm build:builder

# Verify output
ls -lh packages/api/data/
cat packages/api/data/meta.json
```

Expected `meta.json` structure:

```json
{
  "version": "paf-2026-02-20",
  "builtAt": "2026-02-20T10:30:00.000Z",
  "rows": 40123456,
  "distinctPostcodes": 1789012,
  "checksums": {}
}
```

### 2. Test locally

```bash
pnpm --filter @paf/api build
pnpm --filter @paf/api start

curl http://localhost:3000/health
curl "http://localhost:3000/lookup/address?postcode=SW1A%201AA"
pnpm --filter @paf/api test
```

### 3. Rebuild and redeploy the container

```bash
docker build -t paf-api:2026-02 .
docker stop paf-api
docker run -d \
  --name paf-api \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  paf-api:2026-02

# Confirm dataset version
curl http://localhost:3000/health
```

## Troubleshooting

### Out-of-memory / OOM crashes

**Symptoms:** Container exits unexpectedly, repeated restarts.

1. Check current memory usage:
   `curl http://localhost:3000/health | grep -i memory`
2. Verify the dataset size — `rows.bin` should be roughly 7–9 GB for a 40M
   record dataset
3. Increase the Docker memory limit and set
   `NODE_OPTIONS=--max-old-space-size=10240`
4. Restart the container

### Dataset not loading

**Symptoms:** `/health` returns 503, logs show "Dataset not loaded", container
crashes on startup.

1. Verify binary files exist in the container:
   `docker exec paf-api ls -lh /app/packages/api/data/`
2. Check `DATA_DIR` environment variable points to the correct path
3. Confirm `pnpm build:builder` completed successfully and all files were
   included in the Docker image
4. Rebuild the container image

### High error rate (5xx responses)

**Symptoms:** Many 5xx responses in logs or from monitoring.

1. Check readiness: `curl http://localhost:3000/health/ready`
2. Review recent logs: `docker logs paf-api --tail=100`
3. If a recent deployment caused the issue, roll back to the previous image:
   ```bash
   docker stop paf-api
   docker run -d --name paf-api ... paf-api:previous-tag
   ```
4. Verify dataset integrity — check `checksums` in `meta.json`

### Slow response times

**Symptoms:** High latency on lookup requests (expected p99 < 25 ms).

1. Quick check:
   `curl -w "\nTime: %{time_total}s\n" "http://localhost:3000/lookup/address?postcode=SW1A%201AA"`
2. Verify `NODE_OPTIONS=--max-old-space-size=10240` is set (prevents GC
   thrashing)
3. Check container CPU is not heavily contended
4. Reduce `LOG_LEVEL` to `warn` if verbose logging is contributing

---

**See also:** [HOSTING.md](HOSTING.md) | [CONSUMER.md](CONSUMER.md) |
[SECURITY.md](SECURITY.md)
