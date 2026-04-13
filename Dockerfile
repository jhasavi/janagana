# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /orgflow

# Copy package files
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json

# Install production dependencies only
RUN npm ci --omit=dev --silent && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /orgflow

# Copy dependencies from deps stage
COPY --from=deps /orgflow/node_modules ./node_modules
COPY --from=deps /orgflow/package*.json ./
COPY --from=deps /orgflow/turbo.json ./
COPY --from=deps /orgflow/tsconfig.base.json ./

# Copy source code
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages/database ./packages/database

# Build the application with standalone output
WORKDIR /orgflow/apps/web
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /orgflow/apps/web

# Copy built artifacts from standalone output
COPY --from=builder /orgflow/apps/web/.next/standalone ./
COPY --from=builder /orgflow/apps/web/.next/static ./.next/static
COPY --from=builder /orgflow/apps/web/public ./public

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /orgflow/apps/web

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    # Disable telemetry
    NEXT_TELEMETRY_DISABLED=1 \
    # Increase Node.js memory limit
    NODE_OPTIONS="--max-old-space-size=512"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
