# ---- Build stage ----
# Compiles TypeScript using the full pnpm workspace
FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/builder/package.json packages/builder/

RUN pnpm install --frozen-lockfile

COPY packages/api/src packages/api/src
COPY packages/api/tsconfig.json packages/api/tsconfig.json

RUN pnpm --filter @paf/api build

# ---- Production stage ----
# Minimal runtime image with only the compiled app and its dependencies
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

# Install production dependencies only (fastify, @fastify/cors)
COPY packages/api/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts

# Copy compiled application
COPY --from=build /app/packages/api/dist ./dist

# Copy pre-built PAF binary data files.
# Run `pnpm build:builder` to generate these before running `docker build`.
COPY packages/api/data/ ./data/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

CMD ["node", "dist/server.js"]
