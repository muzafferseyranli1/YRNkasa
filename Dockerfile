# Stage 1: Build React Frontend
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
# Install frontend dependencies without running native addon scripts
RUN npm install --ignore-scripts

COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-slim AS runner

WORKDIR /app

# Install Python and C++ compilation tools for native SQLite addon
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend from builder and server files
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY scripts ./scripts

RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server/index.js"]
