FROM oven/bun:1-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --ignore-scripts

# Builder stage
# Build under Node (matching the runtime), not Bun: `next build` under
# Bun-on-Alpine fails to resolve node:sqlite (used by drizzle-orm/node-sqlite).
FROM node:krypton-alpine AS builder
WORKDIR /app

ENV NODE_ENV=production

# Copy dependencies from deps stage (installed with Bun in the deps stage)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next's page-data collection imports route modules (e.g. better-auth), which
# eagerly open the SQLite DB at ./data/sqlite.db via node:sqlite. Ensure the
# directory exists so the build can open/create the file (build-time only;
# this dir is not copied into the runner stage).
RUN mkdir -p ./data

# Build the application with Next's Node binary (bun is not in the Node image)
RUN ./node_modules/.bin/next build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install su-exec to allow dropping privileges from root at runtime
RUN apk add --no-cache su-exec

# Create a non-root user (used as fallback owner for anonymous volumes)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations Drizzle (lues au runtime par instrumentation.ts)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Dossier de la base SQLite, writable par l'utilisateur nextjs (uid 1001)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Déclare le point de montage de persistance. Avec `docker run -v <hôte>:/app/data`
# (ou un mapping appdata Unraid), la DB est persistée à cet emplacement. Sans -v,
# Docker crée un volume anonyme initialisé avec les permissions ci-dessus (uid 1001).
VOLUME ["/app/data"]

# Copy entrypoint (runs as root, chowns /app/data, then drops to PUID:PGID)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Default PUID/PGID — override to match host appdata ownership (e.g. Unraid: 99/100)
ENV PUID=1001
ENV PGID=1001

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
