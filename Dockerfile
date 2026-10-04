# Stage 1: Build React Frontend
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend from builder and backend files
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY scripts ./scripts

RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server/index.js"]
