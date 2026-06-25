# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: API Runner (Default target)
FROM node:20-alpine AS api-runner
WORKDIR /app

ENV NODE_ENV production

# Hardening: Run as non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 streampay

# Hardening: Minimal set of files using Next.js standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=streampay:nodejs /app/.next/standalone ./
COPY --from=builder --chown=streampay:nodejs /app/.next/static ./.next/static

USER streampay

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Healthcheck to verify app is running
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/readyz || exit 1

CMD ["node", "server.js"]

# Stage 4: Worker Runner
FROM node:20-alpine AS worker-runner
WORKDIR /app

ENV NODE_ENV production

# Hardening: Run as non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 streampay

# Hardening: Only include necessary files for worker
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN rm -rf .next app public

USER streampay

# Worker command
CMD ["node", "scripts/run-from-realpath.mjs", "ts-node", "scripts/reconcile-streams.ts"]
