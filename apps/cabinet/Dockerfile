# syntax=docker/dockerfile:1
# Build from monorepo root (see packages/background-cabinet/docker-compose.yml).

FROM node:20-alpine AS build
RUN corepack enable

ARG VITE_CABINET_API_URL=https://cabinet-api.membrana.space
ENV VITE_CABINET_API_URL=$VITE_CABINET_API_URL

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY tsconfig.base.json ./
COPY apps/cabinet apps/cabinet

RUN yarn workspaces focus @membrana/cabinet --all \
  && yarn workspace @membrana/cabinet build

FROM nginx:1.27-alpine AS runtime
COPY apps/cabinet/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/cabinet/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
