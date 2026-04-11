FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files for monorepo
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/

# Install dependencies for workspaces
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build the API
RUN cd apps/api && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/prisma ./prisma
COPY --from=builder /app/packages/database/node_modules/.prisma ./.prisma

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main.js"]
