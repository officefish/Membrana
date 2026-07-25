## Быстрый старт

Используется **Yarn 4** (через Corepack) с `nodeLinker: node-modules`.

```bash
# Один раз — включить Corepack и активировать Yarn 4
corepack enable
corepack prepare yarn@4.5.0 --activate

# Установка зависимостей
yarn install

# Полевой клиент (Vite, http://localhost:5173)
yarn workspace @membrana/client dev
# $env:BROWSER='none'; yarn workspace @membrana/client dev

# Личный кабинет (SPA)
yarn cabinet:app:dev

# Все пакеты в dev-режиме (Turbo)
yarn dev

# Сборка, типы, линт, тесты
yarn build
yarn typecheck
yarn lint
yarn test

# Полный CI-контур локально
yarn turbo run lint typecheck test build --continue
yarn check:boundaries
```
