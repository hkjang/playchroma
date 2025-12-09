# ==============================================================================
# ChromaDB Playground - Frontend with API Proxy
# ==============================================================================
# Build: docker build -t chromadb-playground .
# Run:   docker run -p 3000:3000 -e CHROMA_URL=http://chromadb:8000 chromadb-playground
# ==============================================================================

# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all files (including node_modules if available for offline build)
COPY . .

# Install dependencies only if node_modules doesn't exist
RUN if [ ! -d "node_modules" ]; then npm ci 2>/dev/null || npm install; fi

# Build the frontend
RUN npm run build

# ==============================================================================
# Production Stage - Nginx with API Proxy
# ==============================================================================
FROM nginx:alpine

# Install envsubst (gettext)
RUN apk add --no-cache gettext

# Copy built frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config as template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default ChromaDB URL
ENV CHROMA_URL=http://localhost:8000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
