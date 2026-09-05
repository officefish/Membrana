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
COPY packages/libs packages/libs
COPY packages/services packages/services
COPY packages/plugin-contracts packages/plugin-contracts
COPY packages/plugin-handlers packages/plugin-handlers
COPY packages/background-cabinet packages/background-cabinet

# prisma generate ЗДЕСЬ, а не в build-скрипте: #1632 (02.08) вынес его в отдельную
# turbo-задачу против гонки трёх скриптов — верно, но docker через turbo не ходит,
# а `generated/` закрыт .gitignore. Без этой строки клиента в образе нет (#1724).
#
# ПЛАГИННАЯ ЦЕПОЧКА строится ДО кабинета (22.08). Кабинет зовёт `@membrana/plugin-handlers` и
# `@membrana/plugin-contracts` ДИНАМИЧЕСКИМ импортом в рантайме — регистрация чарт-листа в доме
# журнала и загрузка значений контрактов. Порядок тот же, что у media: контракты → wav-decode →
# анализаторы → handlers. Без сборки tsc видит их как any, без COPY yarn идёт искать их в npm и
# падает 404 (`@membrana/plugin-contracts@npm:*` — Package not found).
RUN yarn workspaces focus @membrana/background-cabinet @membrana/core --all \
  && yarn workspace @membrana/core build \
  && yarn workspace @membrana/fft-analyzer-service build \
  && yarn workspace @membrana/audio-engine-service build \
  && yarn workspace @membrana/plugin-contracts build \
  && yarn workspace @membrana/wav-decode build \
  && yarn workspace @membrana/mfcc-analyzer-service build \
  && yarn workspace @membrana/plugin-handlers build \
  && yarn workspace @membrana/background-cabinet prisma:generate \
  && yarn workspace @membrana/background-cabinet build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app/packages/background-cabinet
ENV NODE_ENV=production

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/core /app/packages/core
# Транзитивный граф workspace-зависимостей кабинета. `node_modules/@membrana/*` в образе —
# симлинки в `/app/packages/*`: пакет вне этого списка даёт ВИСЯЧУЮ ссылку, и сборка зелёная,
# и старт зелёный — до первого импорта, а потом ERR_MODULE_NOT_FOUND уже на проде. Список
# держится зубом `verify:image-workspace-deps`, а не глазом (вещдок 21.08: media в restart-loop).
COPY --from=build /app/packages/plugin-contracts/dist /app/packages/plugin-contracts/dist
COPY --from=build /app/packages/plugin-contracts/package.json /app/packages/plugin-contracts/package.json
COPY --from=build /app/packages/plugin-handlers/dist /app/packages/plugin-handlers/dist
COPY --from=build /app/packages/plugin-handlers/package.json /app/packages/plugin-handlers/package.json
COPY --from=build /app/packages/libs/wav-decode/dist /app/packages/libs/wav-decode/dist
COPY --from=build /app/packages/libs/wav-decode/package.json /app/packages/libs/wav-decode/package.json
COPY --from=build /app/packages/services/fft-analyzer/dist /app/packages/services/fft-analyzer/dist
COPY --from=build /app/packages/services/fft-analyzer/package.json /app/packages/services/fft-analyzer/package.json
COPY --from=build /app/packages/services/audio-engine/dist /app/packages/services/audio-engine/dist
COPY --from=build /app/packages/services/audio-engine/package.json /app/packages/services/audio-engine/package.json
COPY --from=build /app/packages/services/mfcc-analyzer/dist /app/packages/services/mfcc-analyzer/dist
COPY --from=build /app/packages/services/mfcc-analyzer/package.json /app/packages/services/mfcc-analyzer/package.json
COPY --from=build /app/packages/background-cabinet/dist ./dist
COPY --from=build /app/packages/background-cabinet/prisma ./prisma
COPY --from=build /app/packages/background-cabinet/package.json ./package.json

# СЕТКА ТАРИФОВ — ДАННЫЕ, КОТОРЫЕ ЧИТАЕТ РАНТАЙМ (#2287, прод 04.09).
#
# `loadTariffGrid()` ищет `docs/tariffs/tariff-grid.json` ВВЕРХ от рабочего каталога. Файл в
# git с 29.07, но в образ не ехал никогда: этот Dockerfile копирует пакеты, а `docs/` не
# копировал. Итог на проде — витрина тарифов и погашение промокода отвечали
# `grid_unavailable`, причём промокод молча с 29.07; витрина #2286 это лишь вскрыла.
#
# НАЗНАЧЕНИЕ АБСОЛЮТНОЕ, чтобы повторить раскладку репозитория, — а НЕ потому, что иначе не
# найдётся. Относительное назначение тоже нашлось бы: резолвер проверяет сам рабочий каталог
# на нулевом шаге, до всякого подъёма. Первая редакция этого комментария утверждала обратное;
# порча 05.09 показала, что зуб на такую «поломку» зелен по праву, и неправдой был комментарий.
# `/app/docs/tariffs` лежит на втором предке и читается как «репозиторный docs/ внутри образа».
#
# Класс закрыт зубом `verify:image-workspace-deps`: он моделирует подъём резолвера по
# назначениям COPY и константам из `tariff-grid-source.ts`, а не ищет эту строку глазами.
COPY docs/tariffs /app/docs/tariffs

COPY packages/background-cabinet/docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3020/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
