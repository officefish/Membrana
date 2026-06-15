# syntax=docker/dockerfile:1
# Build from monorepo root (see packages/background-cabinet/docker-compose.yml).

FROM node:20-alpine AS build
RUN corepack enable

ARG VITE_CABINET_API_URL=https://cabinet.membrana.space
ARG VITE_MEDIA_API_URL=https://media.membrana.space
ENV VITE_CABINET_API_URL=$VITE_CABINET_API_URL
ENV VITE_MEDIA_API_URL=$VITE_MEDIA_API_URL

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/libs/detector-report packages/libs/detector-report
COPY packages/services/media-library packages/services/media-library
COPY packages/services/audio-engine packages/services/audio-engine
COPY packages/services/sample-playback packages/services/sample-playback
COPY packages/services/telemetry-journal packages/services/telemetry-journal
COPY apps/cabinet apps/cabinet

RUN yarn workspaces focus @membrana/cabinet @membrana/core @membrana/detector-report @membrana/media-library-service @membrana/audio-engine-service @membrana/sample-playback-service @membrana/telemetry-journal-service --all \
  && yarn workspace @membrana/detector-report build \
  && yarn workspace @membrana/telemetry-journal-service build \
  && yarn workspace @membrana/cabinet exec vite build

FROM nginx:1.27-alpine AS runtime
COPY apps/cabinet/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/cabinet/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
