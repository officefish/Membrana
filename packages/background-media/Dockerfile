# syntax=docker/dockerfile:1
# Build from monorepo root:
#   docker compose -f packages/background-media/docker-compose.yml build

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/libs packages/libs
COPY packages/services packages/services
COPY packages/background-media packages/background-media

RUN yarn workspaces focus @membrana/background-media --all \
  && yarn workspace @membrana/core build \
  && yarn workspace @membrana/drone-detection-orchestrator-service build \
  && yarn workspace @membrana/background-media build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app/packages/background-media
ENV NODE_ENV=production

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/background-media/dist ./dist
COPY --from=build /app/packages/background-media/prisma ./prisma
COPY --from=build /app/packages/background-media/package.json ./package.json
COPY data/detectors-benchmark/v0.2 /app/catalog/free-v1
COPY packages/background-media/docker/entrypoint.sh /entrypoint.sh
# Windows checkouts may ship CRLF; strip before exec.
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3010/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
