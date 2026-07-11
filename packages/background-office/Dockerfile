# syntax=docker/dockerfile:1
# Build from monorepo root:
#   docker compose -f packages/background-office/docker-compose.yml build

FROM node:20-alpine AS build
RUN corepack enable

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY tsconfig.base.json ./
COPY docs/virtual-team docs/virtual-team
COPY docs/WHITE_PAPER.md docs/ARCHITECTURE.md docs/SERVICES.md docs/
# @membrana/rag-service — workspace-зависимость office (dynamic import RAG API).
COPY packages/services/rag packages/services/rag
COPY packages/background-office packages/background-office

RUN yarn workspaces focus @membrana/background-office --all \
  && yarn workspace @membrana/background-office build

FROM node:20-alpine AS runtime
RUN corepack enable

WORKDIR /app/packages/background-office
ENV NODE_ENV=production

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/background-office/dist ./dist
COPY --from=build /app/packages/background-office/prompts ./prompts
COPY --from=build /app/packages/background-office/package.json ./package.json
# rag-service dist + package.json: цель workspace-симлинка node_modules/@membrana/rag-service
COPY --from=build /app/packages/services/rag/dist /app/packages/services/rag/dist
COPY --from=build /app/packages/services/rag/package.json /app/packages/services/rag/package.json
COPY packages/background-office/docker/entrypoint.sh /entrypoint.sh
# Windows checkouts may ship CRLF; strip before exec.
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
