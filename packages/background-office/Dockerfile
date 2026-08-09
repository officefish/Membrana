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
# Dreams tick: pairs from truth registry + master prompt (runtime read via RAG_REPO_ROOT)
COPY docs/truth/registry.json docs/truth/registry.json
COPY docs/evidence/registry.jsonl docs/evidence/registry.jsonl
COPY docs/prompts/DREAM_MASTER_PROMPT.md docs/prompts/DREAM_MASTER_PROMPT.md
# @membrana/rag-service — workspace-зависимость office (dynamic import RAG API).
COPY packages/services/rag packages/services/rag
COPY packages/services/static-registry packages/services/static-registry
COPY packages/core packages/core
COPY packages/background-office packages/background-office
# LPC defaults + dreams pure libs (dynamic import from DreamsService)
COPY scripts/lib/llm-procedures.json \
     scripts/lib/llm-procedure-defaults.json \
     scripts/lib/llm-provider-catalog.json \
     scripts/lib/dreams-log.mjs \
     scripts/lib/dreams-tick.mjs \
     scripts/lib/dreams-format.mjs \
     scripts/lib/dreams-providers.mjs \
     scripts/lib/dreams-select.mjs \
     scripts/lib/night-research.mjs \
     scripts/lib/strategy-horizon.mjs \
     scripts/lib/truth-graph.mjs \
     scripts/lib/
# Классификатор исхода контейнера network (#1449) — с 07.08 его импортирует
# dreams-tick.mjs вместо llm-probe. Чист и самодостаточен: ни одного импорта,
# поэтому одного файла довольно. Без этой строки образ соберётся, а сны на проде
# умрут на MODULE_NOT_FOUND — 12 синтезов из 12 стали бы нулём.
COPY scripts/network/lib/classify.mjs scripts/network/lib/classify.mjs
# llm-probe.mjs СНЯТ 08.08 (#1797): замер графа импортов офиса показал его единственным
# балластом списка — ни один копируемый выше модуль его не импортирует с 07.08, когда
# dreams-tick перешёл на classify.mjs. Раньше снятие блокировалось тем, что проверялось
# только сборкой образа; теперь его проверяет прибор `yarn office:image:smoke`.
#
# ПОЛНОТА ЭТОГО СПИСКА проверяется не глазами, а исполнением: CI поднимает образ, просит
# у офиса дайджест снов и запускает static-registry probe (workflow office-image-smoke.yml).
# Исполняемые пути грузят зависимости, поэтому забытая строка COPY даёт красный с ИМЕНЕМ файла — а не тишину до
# первого MODULE_NOT_FOUND на проде (срабатывание 07.08 стоило бы 12 синтезов из 12).
# Добавляя здесь модуль, дождись зелёного смоука; для нового источника образа добавь path trigger workflow.

RUN yarn workspaces focus @membrana/background-office --all \
  && yarn workspace @membrana/background-office build

FROM node:20-alpine AS runtime
RUN corepack enable

WORKDIR /app/packages/background-office
ENV NODE_ENV=production
ENV RAG_REPO_ROOT=/app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/background-office/dist ./dist
COPY --from=build /app/packages/background-office/prompts ./prompts
COPY --from=build /app/packages/background-office/package.json ./package.json
# rag-service dist + package.json: цель workspace-симлинка node_modules/@membrana/rag-service
COPY --from=build /app/packages/services/rag/dist /app/packages/services/rag/dist
COPY --from=build /app/packages/services/rag/package.json /app/packages/services/rag/package.json
COPY --from=build /app/packages/services/static-registry/dist /app/packages/services/static-registry/dist
COPY --from=build /app/packages/services/static-registry/package.json /app/packages/services/static-registry/package.json
COPY --from=build /app/packages/core/dist /app/packages/core/dist
COPY --from=build /app/packages/core/package.json /app/packages/core/package.json
COPY --from=build /app/scripts/lib /app/scripts/lib
# scripts/network/lib: classify.mjs — СТАТИЧЕСКИЙ импорт dreams-tick.mjs:19 с 07.08.
# Сюда правка 07.08 не дошла: она тронула только build-стадию. Дефект второй ступени —
# первым падал сам build, потому что файл не пускал .dockerignore (третий манифест).
# Оба чинятся вместе, иначе образ соберётся и умрёт на первом вызове снов.
COPY --from=build /app/scripts/network/lib /app/scripts/network/lib
COPY --from=build /app/docs/truth/registry.json /app/docs/truth/registry.json
COPY --from=build /app/docs/evidence/registry.jsonl /app/docs/evidence/registry.jsonl
COPY --from=build /app/docs/prompts/DREAM_MASTER_PROMPT.md /app/docs/prompts/DREAM_MASTER_PROMPT.md
COPY packages/background-office/docker/entrypoint.sh /entrypoint.sh
# Windows checkouts may ship CRLF; strip before exec.
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
