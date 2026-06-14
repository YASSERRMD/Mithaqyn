FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable yarn

FROM base AS deps
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN yarn workspaces focus @mithaqyn/web --production

FROM base AS builder
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN yarn workspaces focus @mithaqyn/web
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace @mithaqyn/web build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
