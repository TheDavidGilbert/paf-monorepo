import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import Fastify from 'fastify';
import cors from '@fastify/cors';

import { loadDataset, loadMRDataset, getDataset } from './dataset.js';
import { lookupRoute } from './routes/lookup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, '..', 'data');

const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

// Configure CORS
// By default, only localhost is allowed. For production deployments,
// add your own domain patterns here. Examples:
//   /\.yourdomain\.com$/,           // Matches *.yourdomain.com
//   'https://www.example.com',      // Exact origin match
//   /^https:\/\/[\w-]+\.example\.com$/, // Pattern match
await fastify.register(cors, {
  origin: [
    /^https?:\/\/localhost:\d+$/,  // localhost on any port
  ],
  credentials: true,
});

// Health check with dataset status (combined liveness + readiness)
fastify.get('/health', async (request, reply) => {
  try {
    const ds = getDataset();
    return reply.status(200).send({
      status: 'ok',
      uptime: process.uptime(),
      dataset: {
        version: ds.meta.version,
        rows: ds.meta.rows,
        distinctPostcodes: ds.meta.distinctPostcodes,
        builtAt: ds.meta.builtAt,
        mulRes: ds.meta.mulRes
          ? { rows: ds.meta.mulRes.rows, distinctUdprns: ds.meta.mulRes.distinctUdprns }
          : null,
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    });
  } catch {
    return reply.status(503).send({
      status: 'error',
      error: 'Dataset not loaded',
    });
  }
});

// Liveness probe - is the process alive?
fastify.get('/health/live', async (request, reply) => {
  // Always return 200 if the process is running
  return reply.status(200).send({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - is the service ready to serve traffic?
fastify.get('/health/ready', async (request, reply) => {
  try {
    const ds = getDataset();

    // Validate dataset is loaded and has data
    if (!ds.meta?.rows || ds.meta.rows === 0) {
      return reply.status(503).send({
        status: 'not_ready',
        reason: 'Dataset empty or invalid',
      });
    }

    // Check memory usage isn't critical (> 95% of heap)
    const memUsage = process.memoryUsage();
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (heapUsagePercent > 95) {
      return reply.status(503).send({
        status: 'not_ready',
        reason: 'Memory usage critical',
        heapUsagePercent: Math.round(heapUsagePercent),
      });
    }

    return reply.status(200).send({
      status: 'ready',
      dataset: {
        rows: ds.meta.rows,
        distinctPostcodes: ds.meta.distinctPostcodes,
      },
      memory: {
        heapUsagePercent: Math.round(heapUsagePercent),
      },
    });
  } catch (err) {
    return reply.status(503).send({
      status: 'not_ready',
      reason: 'Dataset not loaded',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Memory usage endpoint - detailed memory statistics
fastify.get('/health/memory', async (request, reply) => {
  const memUsage = process.memoryUsage();
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  // Get memory limit (max old space size)
  const v8 = await import('node:v8');
  const heapStats = v8.getHeapStatistics();
  const memoryLimit = heapStats.heap_size_limit;
  const memoryLimitMB = Math.round(memoryLimit / 1024 / 1024);
  const totalUsedPercent = (memUsage.heapUsed / memoryLimit) * 100;

  return reply.status(200).send({
    uptime: process.uptime(),
    heap: {
      usedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      totalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      limitMB: memoryLimitMB,
      availableMB: Math.round((memoryLimit - memUsage.heapUsed) / 1024 / 1024),
      usedPercent: Math.round(heapUsagePercent * 100) / 100,
      totalUsedPercent: Math.round(totalUsedPercent * 100) / 100,
    },
    process: {
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      externalMB: Math.round(memUsage.external / 1024 / 1024),
      arrayBuffersMB: Math.round(memUsage.arrayBuffers / 1024 / 1024),
    },
    heapSpaces: v8.getHeapSpaceStatistics().map((space) => ({
      name: space.space_name,
      sizeMB: Math.round(space.space_size / 1024 / 1024),
      usedMB: Math.round(space.space_used_size / 1024 / 1024),
      availableMB: Math.round(space.space_available_size / 1024 / 1024),
      physicalMB: Math.round(space.physical_space_size / 1024 / 1024),
    })),
    statistics: {
      totalHeapSizeMB: Math.round(heapStats.total_heap_size / 1024 / 1024),
      totalHeapSizeExecutableMB: Math.round(heapStats.total_heap_size_executable / 1024 / 1024),
      totalPhysicalSizeMB: Math.round(heapStats.total_physical_size / 1024 / 1024),
      totalAvailableSizeMB: Math.round(heapStats.total_available_size / 1024 / 1024),
      mallocedMemoryMB: Math.round(heapStats.malloced_memory / 1024 / 1024),
      peakMallocedMemoryMB: Math.round(heapStats.peak_malloced_memory / 1024 / 1024),
      doesZapGarbage: heapStats.does_zap_garbage,
    },
  });
});

// Register lookup route
await fastify.register(lookupRoute);

// Load dataset before starting server
try {
  loadDataset(DATA_DIR);
} catch (err) {
  console.error('Failed to load dataset:', err);
  process.exit(1);
}

// Load Multiple Residence dataset if available (non-fatal if absent)
try {
  loadMRDataset(DATA_DIR);
} catch (err) {
  console.warn('MR dataset load failed (non-fatal):', err);
}

// Start server
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  console.log(`${signal} received, starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    await fastify.close();
    console.log('HTTP server closed');

    // Give in-flight requests time to complete
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  void shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  void shutdown('UNHANDLED_REJECTION');
});
