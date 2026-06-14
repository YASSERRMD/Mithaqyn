# Deployment Guide

## Production Architecture

```
Internet → Load Balancer → Next.js (web) ─┐
                         → NestJS (api) ──┼→ PostgreSQL 16
                                          ├→ Redis 7
                                          └→ File Storage (local/S3)
```

## Docker Compose (Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.9'
services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    env_file: ./apps/api/.env
    ports:
      - '3001:3001'
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    env_file: ./apps/web/.env
    ports:
      - '3000:3000'
    depends_on:
      - api

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-mithaqyn}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-mithaqyn}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U mithaqyn']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## API Dockerfile

Create `apps/api/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn workspace @mithaqyn/api build
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main"]
```

## Web Dockerfile

Create `apps/web/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN yarn install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace @mithaqyn/web build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
```

## Environment Variables (Production)

### apps/api/.env

```env
# Application
NODE_ENV=production
PORT=3001
API_URL=https://api.yourdomain.com

# Database
DATABASE_URL=postgresql://mithaqyn:STRONG_PASSWORD@postgres:5432/mithaqyn

# Redis
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379

# Security — generate with: openssl rand -base64 64
JWT_SECRET=CHANGE_ME_MINIMUM_64_CHARS
JWT_EXPIRES_IN=24h

# File uploads
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=50

# Primary AI provider — pick one
OPENAI_API_KEY=sk-...
```

### apps/web/.env

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Database Migrations

Run once before first boot, or on each deploy when the schema changes:

```bash
cd apps/api
npx prisma migrate deploy   # production-safe (no dev reset)
npx prisma db seed          # only on first boot
```

## Health Checks

| Endpoint | Expected |
|----------|----------|
| `GET /health` | `{ status: 'ok' }` |
| `GET /api/docs` | Swagger HTML |

## Scaling Notes

- The API is stateless — scale horizontally behind a load balancer
- Sticky sessions are NOT required (JWT is stateless)
- Redis is required for rate-limit state when running multiple API replicas
- File uploads should be moved to S3/GCS when running multiple replicas

## Reverse Proxy (Nginx)

```nginx
server {
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://api:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://web:3000/;
    }
}
```
