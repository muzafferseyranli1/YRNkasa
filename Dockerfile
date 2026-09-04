# Stage 1: Build Frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner

WORKDIR /app

# Install native dependencies required for better-sqlite3 build
RUN apk add --no-cache python3 make g++ sqlite

COPY package*.json ./
RUN npm install --omit=dev

# Copy server and built static frontend from builder
COPY --from=builder /app/dist ./dist
COPY server ./server

# Persistent database storage directory
ENV DATA_DIR=/app/data
ENV PORT=3000
ENV NODE_ENV=production

RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server/index.js"]
