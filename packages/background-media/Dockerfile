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
# @membrana/plugin-contracts — словарь плагинности (#1961); без COPY `workspaces focus`
# идёт за пакетом в npm и падает 404 (поймано смоуком офиса на PR #1965).
COPY packages/plugin-contracts packages/plugin-contracts
# @membrana/plugin-handlers — первая волна плагинов (#1961), та же причина.
COPY packages/plugin-handlers packages/plugin-handlers
COPY packages/background-media packages/background-media

# prisma generate ЗДЕСЬ (#1724): #1632 вынес его в turbo-задачу, docker через turbo
# не ходит, `generated/` в .gitignore. У media образ не собирается ни одним workflow —
# провал был бы виден только при ручной выкладке, поэтому чиним до выстрела.
# Плагинная основа (#1961): контракты → wav-decode → mfcc-analyzer → handlers строятся ДО media,
# иначе tsc видит их как any (деплой 19.08: TS7006/TS18046 в first-wave.registrar).
RUN yarn workspaces focus @membrana/background-media --all \
  && yarn workspace @membrana/core build \
  && yarn workspace @membrana/drone-detection-orchestrator-service build \
  && yarn workspace @membrana/plugin-contracts build \
  && yarn workspace @membrana/wav-decode build \
  && yarn workspace @membrana/mfcc-analyzer-service build \
  && yarn workspace @membrana/plugin-handlers build \
  && yarn workspace @membrana/background-media prisma:generate \
  && yarn workspace @membrana/background-media build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app/packages/background-media
ENV NODE_ENV=production

COPY --from=build /app/node_modules /app/node_modules
# node_modules/@membrana/* — симлинки в /app/packages/*: без dist пакетов они висячие в рантайме.
# Старый код media их не требовал; с #1961/#1972 wav-decode импортируется статически, контракты
# и хендлеры — динамически (деплой 19.08). Копируем ровно то, что резолвится.
COPY --from=build /app/packages/plugin-contracts/dist /app/packages/plugin-contracts/dist
COPY --from=build /app/packages/plugin-contracts/package.json /app/packages/plugin-contracts/package.json
COPY --from=build /app/packages/plugin-handlers/dist /app/packages/plugin-handlers/dist
COPY --from=build /app/packages/plugin-handlers/package.json /app/packages/plugin-handlers/package.json
COPY --from=build /app/packages/libs/wav-decode/dist /app/packages/libs/wav-decode/dist
COPY --from=build /app/packages/libs/wav-decode/package.json /app/packages/libs/wav-decode/package.json
COPY --from=build /app/packages/services/mfcc-analyzer/dist /app/packages/services/mfcc-analyzer/dist
COPY --from=build /app/packages/services/mfcc-analyzer/package.json /app/packages/services/mfcc-analyzer/package.json
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
