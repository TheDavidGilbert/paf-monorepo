# Operations Runbook

Practical reference for running the PAF Address Lookup Service on a single
Docker instance.

## Service Endpoints

| Endpoint                               | Purpose               | Expected Response                              |
| -------------------------------------- | --------------------- | ---------------------------------------------- |
| `GET /health`                          | Combined health check | 200 OK + dataset info                          |
| `GET /health/live`                     | Liveness probe        | 200 OK (always if running)                     |
| `GET /health/ready`                    | Readiness probe       | 200 OK (when dataset ready)                    |
| `GET /lookup/address?postcode=SW1A1AA` | Postcode lookup       | 200 OK + address data                          |
| `GET /lookup/postcode?q=SW1A`          | Postcode autocomplete | 200 OK + matching postcodes                    |
| `GET /lookup/street?q=38+Flora`        | Street/address search | 200 OK + matching addresses; 503 if not enabled |

## Service Restart

```bash
docker restart paf-api

# Validate after restart
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl "http://localhost:3000/lookup/address?postcode=SW1A%201AA"
```

## Key Log Messages

| Message                                     | Meaning                                |
| ------------------------------------------- | -------------------------------------- |
| `Server listening on`                       | Successful startup                     |
| `Dataset loaded:`                           | Main PAF dataset loaded successfully   |
| `Dataset not loaded`                        | Dataset loading failure                |
| `Street search index disabled`              | `ENABLE_STREET_INDEX` not set to true  |
| `Street index load failed (non-fatal)`      | Thoroughfare index files missing/corrupt |
| `SIGTERM received`                          | Graceful shutdown initiated            |

## Environment Variables

| Variable               | Default | Description                                              |
| ---------------------- | ------- | -------------------------------------------------------- |
| `PORT`                 | `3000`  | HTTP port to listen on                                   |
| `DATA_DIR`             | `../data` (relative to built JS) | Path to binary dataset files  |
| `NODE_OPTIONS`         | —       | Set to `--max-old-space-size=10240` for full PAF dataset |
| `ENABLE_STREET_INDEX`  | `false` | Set to `true` to load thoroughfare index (~215 MB extra RAM) |

## Dataset Updates

The Royal Mail PAF dataset is updated monthly. To deploy a new version:

### 1. Build the new dataset

The builder expects the Royal Mail CSV files in a specific subdirectory layout
under `packages/builder/input/`:

```
packages/builder/input/
├── CSV PAF/
│   └── CSV PAF.csv                  ← required (main PAF delivery)
└── CSV MULRES/
    └── CSV Multiple Residence.csv   ← optional (Multiple Residence data)
```

```bash
# Create the input directories if they don't exist
mkdir -p "packages/builder/input/CSV PAF"
mkdir -p "packages/builder/input/CSV MULRES"

# Copy the Royal Mail PAF CSV (required)
cp "/path/to/CSV PAF.csv" "packages/builder/input/CSV PAF/CSV PAF.csv"

# Copy the Multiple Residence CSV (optional — skip if not licensed)
cp "/path/to/CSV Multiple Residence.csv" "packages/builder/input/CSV MULRES/CSV Multiple Residence.csv"

# Run the builder
pnpm build:builder

# Verify output
ls -lh packages/api/data/
cat packages/api/data/meta.json
```

Alternatively, override the input path directly (useful for CI or custom locations):

```bash
pnpm --filter @paf/builder build -- --input "/path/to/CSV PAF.csv" --out packages/api/data
```

Expected `meta.json` structure:

```json
{
  "version": "paf-2026-02-20",
  "builtAt": "2026-02-20T10:30:00.000Z",
  "rows": 40123456,
  "distinctPostcodes": 1789012,
  "checksums": {},
  "streetIndex": {
    "distinctThoroughfares": 890123,
    "checksums": {}
  }
}
```

The builder **always** generates the four thoroughfare index files
(`thoroughfareKeys.bin`, `thoroughfareStart.bin`, `thoroughfareEnd.bin`,
`thoroughfareSortedRows.bin`). Whether the API loads them is controlled by
`ENABLE_STREET_INDEX` at runtime.

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
  -e NODE_OPTIONS=--max-old-space-size=10240 \
  paf-api:2026-02

# To also enable street search (add ~215 MB extra RAM):
docker run -d \
  --name paf-api \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NODE_OPTIONS=--max-old-space-size=10240 \
  -e ENABLE_STREET_INDEX=true \
  paf-api:2026-02

# Confirm dataset version and street index status
curl http://localhost:3000/health
```

The `/health` response includes `dataset.streetIndex: true/false` to confirm
whether the thoroughfare index is loaded.

## Troubleshooting

### Out-of-memory / OOM crashes

**Symptoms:** Container exits unexpectedly, repeated restarts.

1. Check current memory usage:
   `curl http://localhost:3000/health/memory`
2. Verify the dataset size — `rows.bin` should be roughly 7–9 GB for a 40M
   record dataset
3. If `ENABLE_STREET_INDEX=true`, the thoroughfare index adds ~215 MB. Increase
   the memory limit accordingly.
4. Increase the Docker memory limit and set
   `NODE_OPTIONS=--max-old-space-size=10240`
5. Restart the container

### Dataset not loading

**Symptoms:** `/health` returns 503, logs show "Dataset not loaded", container
crashes on startup.

1. Verify binary files exist in the container:
   `docker exec paf-api ls -lh /app/packages/api/data/`
2. Check `DATA_DIR` environment variable points to the correct path
3. Confirm `pnpm build:builder` completed successfully and all files were
   included in the Docker image
4. Rebuild the container image

### Street index not loading

**Symptoms:** `/lookup/street` returns 503 even though `ENABLE_STREET_INDEX=true`
is set; logs show `Street index load failed`.

1. Verify the four thoroughfare index files exist:
   ```bash
   docker exec paf-api ls -lh /app/packages/api/data/thoroughfare*.bin
   ```
2. Confirm the builder completed without errors — the thoroughfare files are
   only present if the build succeeded fully
3. Check `DATA_DIR` points to the same directory the builder wrote to
4. Rebuild the dataset (`pnpm build:builder`) and redeploy

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

**Symptoms:** High latency on lookup requests.

Expected performance under normal conditions:
- `GET /lookup/address` — p99 < 25 ms
- `GET /lookup/postcode` — p99 < 10 ms
- `GET /lookup/street` — p99 < 15 ms (for results sets ≤ 50)

1. Quick check:
   `curl -w "\nTime: %{time_total}s\n" "http://localhost:3000/lookup/address?postcode=SW1A%201AA"`
2. Verify `NODE_OPTIONS=--max-old-space-size=10240` is set (prevents GC
   thrashing)
3. Check container CPU is not heavily contended
4. Reduce `LOG_LEVEL` to `warn` if verbose logging is contributing

---

**See also:** [HOSTING.md](HOSTING.md) | [CONSUMER.md](CONSUMER.md) |
[SECURITY.md](SECURITY.md)
