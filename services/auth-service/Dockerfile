
# Build stage: production dependencies only
FROM node:20-alpine AS deps

WORKDIR /app

# Update npm to a version compatible with Node.js 20
# and containing the patched tar package
RUN npm install -g npm@10.9.9

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force


# Runtime stage
FROM node:20-alpine

# Update npm in the final image too
RUN npm install -g npm@10.9.9

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY migrations ./migrations

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
