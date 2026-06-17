# syntax=docker/dockerfile:1
# Build from monorepo root:
#   docker compose -f packages/background-cabinet/docker-compose.yml build cabinet-api

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/background-cabinet packages/background-cabinet

RUN yarn workspaces focus @membrana/background-cabinet @membrana/core --all \
  && yarn workspace @membrana/background-cabinet build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app/packages/background-cabinet
ENV NODE_ENV=production

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/background-cabinet/dist ./dist
COPY --from=build /app/packages/background-cabinet/prisma ./prisma
COPY --from=build /app/packages/background-cabinet/package.json ./package.json
COPY packages/background-cabinet/docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3020/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
