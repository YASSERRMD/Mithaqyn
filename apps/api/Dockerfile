FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable yarn

FROM base AS deps
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN yarn workspaces focus @mithaqyn/api --production

FROM base AS builder
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN yarn workspaces focus @mithaqyn/api
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN yarn workspace @mithaqyn/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared ./packages/shared
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main"]
