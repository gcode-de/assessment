# Multi-Stage Build für Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/frontend ./packages/frontend
RUN npm ci
RUN npm run build --workspace frontend

# Multi-Stage Build für Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/backend ./packages/backend
RUN npm ci
RUN npm run build --workspace backend

# Runtime Stage
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend dist files
COPY --from=backend-builder /app/packages/backend/dist ./backend/dist
COPY --from=backend-builder /app/packages/backend/package.json ./backend/
COPY --from=backend-builder /app/packages/backend/node_modules ./backend/node_modules

# Copy frontend dist files
COPY --from=frontend-builder /app/packages/frontend/dist ./frontend/dist

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S app -u 1001

# Copy entrypoint script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

USER app

EXPOSE 3000 5000

ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["/app/docker-entrypoint.sh"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1
