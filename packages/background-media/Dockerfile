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
  && yarn workspace @membrana/fft-analyzer-service build \
  && yarn workspace @membrana/audio-engine-service build \
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
#
# Список копируемых пакетов рос РУКОЙ и отставал от графа: 21.08 PR #2041 добавил в
# plugin-handlers импорт @membrana/fft-analyzer-service, образ его не нёс → ERR_MODULE_NOT_FOUND
# → restart-loop прода → откат (вещдок docs/deploy/deploy-2026-08-21-media.md). Спящими минами
# лежали ещё десять, включая drone-detection-orchestrator (динамический импорт в samples.service).
#
# Теперь копируется ВЕСЬ транзитивный граф workspace-зависимостей media, а расхождение списка с
# графом ловит зуб `yarn verify:image-workspace-deps` ДО выкатки — не рантайм прода.
# Порядок строк — как у зуба: пакеты, затем libs, затем services (включая detectors).
COPY --from=build /app/packages/core/dist /app/packages/core/dist
COPY --from=build /app/packages/core/package.json /app/packages/core/package.json
COPY --from=build /app/packages/plugin-contracts/dist /app/packages/plugin-contracts/dist
COPY --from=build /app/packages/plugin-contracts/package.json /app/packages/plugin-contracts/package.json
COPY --from=build /app/packages/plugin-handlers/dist /app/packages/plugin-handlers/dist
COPY --from=build /app/packages/plugin-handlers/package.json /app/packages/plugin-handlers/package.json
COPY --from=build /app/packages/libs/wav-decode/dist /app/packages/libs/wav-decode/dist
COPY --from=build /app/packages/libs/wav-decode/package.json /app/packages/libs/wav-decode/package.json
COPY --from=build /app/packages/libs/detector-report/dist /app/packages/libs/detector-report/dist
COPY --from=build /app/packages/libs/detector-report/package.json /app/packages/libs/detector-report/package.json
COPY --from=build /app/packages/services/mfcc-analyzer/dist /app/packages/services/mfcc-analyzer/dist
COPY --from=build /app/packages/services/mfcc-analyzer/package.json /app/packages/services/mfcc-analyzer/package.json
COPY --from=build /app/packages/services/fft-analyzer/dist /app/packages/services/fft-analyzer/dist
COPY --from=build /app/packages/services/fft-analyzer/package.json /app/packages/services/fft-analyzer/package.json
COPY --from=build /app/packages/services/audio-engine/dist /app/packages/services/audio-engine/dist
COPY --from=build /app/packages/services/audio-engine/package.json /app/packages/services/audio-engine/package.json
COPY --from=build /app/packages/services/trends-detector/dist /app/packages/services/trends-detector/dist
COPY --from=build /app/packages/services/trends-detector/package.json /app/packages/services/trends-detector/package.json
COPY --from=build /app/packages/services/drone-detection-orchestrator/dist /app/packages/services/drone-detection-orchestrator/dist
COPY --from=build /app/packages/services/drone-detection-orchestrator/package.json /app/packages/services/drone-detection-orchestrator/package.json
COPY --from=build /app/packages/services/detectors/base/dist /app/packages/services/detectors/base/dist
COPY --from=build /app/packages/services/detectors/base/package.json /app/packages/services/detectors/base/package.json
COPY --from=build /app/packages/services/detectors/harmonic/dist /app/packages/services/detectors/harmonic/dist
COPY --from=build /app/packages/services/detectors/harmonic/package.json /app/packages/services/detectors/harmonic/package.json
COPY --from=build /app/packages/services/detectors/cepstral/dist /app/packages/services/detectors/cepstral/dist
COPY --from=build /app/packages/services/detectors/cepstral/package.json /app/packages/services/detectors/cepstral/package.json
COPY --from=build /app/packages/services/detectors/spectral-flux/dist /app/packages/services/detectors/spectral-flux/dist
COPY --from=build /app/packages/services/detectors/spectral-flux/package.json /app/packages/services/detectors/spectral-flux/package.json
COPY --from=build /app/packages/services/detectors/template-match/dist /app/packages/services/detectors/template-match/dist
COPY --from=build /app/packages/services/detectors/template-match/package.json /app/packages/services/detectors/template-match/package.json
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
