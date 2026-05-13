[Teamlead]: Сейчас CI/CD запускается через GitHub Actions и локально через Yarn/Turbo. Пакеты не изменялись; речь про инфраструктуру .github/workflows/\*.

[Структурщик]: Текущий основной процесс такой:

Автоматический CI

.github/workflows/ci.yml
Запускается на push и pull_request в ветки main, master, develop.
Команда внутри:
yarn install --immutable
yarn turbo run lint typecheck test build --continue
Ручной/еженедельный CI

.github/workflows/scheduled-ci.yml
Запускается по расписанию: понедельник 06:00 UTC.
Можно запустить вручную через GitHub Actions → Scheduled CI → Run workflow.
Локальный аналог CI В корне репозитория:

corepack enable
corepack prepare yarn@4.5.0 --activate
yarn install --immutable
yarn turbo run lint typecheck test build --continue
Release

.github/workflows/release.yml
Запускается при push тега вида:
git tag v0.1.0
git push origin v0.1.0
Собирает монорепо и создаёт GitHub Release.
CD / Deploy

.github/workflows/deploy-stub.yml
Сейчас это только ручная заглушка. Реального деплоя наружу пока нет.
Вспомогательные workflow

virtual-team-context.yml — ручной чеклист документов для агентов.
optional-claude-pr-review.yml — опциональное Claude-review при наличии ANTHROPIC_API_KEY (устаревший дубликат `claude-review.yml` удалён).

Что я советую в первую очередь: держать обязательный CI зелёным. Ранее CI падал на этапе после `actions/setup-node` с `cache: yarn` (раннер тянул Yarn 1 до Corepack). Сейчас в `ci.yml`, `scheduled-ci.yml`, `release.yml` и `optional-claude-pr-review.yml`: без встроенного yarn-кеша в setup-node, `corepack prepare yarn@4.5.0 --activate` и кеш Berry через `actions/cache`.

Приоритетный порядок:

Поддерживать Corepack/Yarn 4 в workflows (см. выше).
Локально и в CI проверять:
yarn turbo run lint typecheck test build --continue
Устаревший `claude-review.yml` удалён; опциональный Claude — только `optional-claude-pr-review.yml`.
Затем уже настраивать настоящий CD вместо deploy-stub.yml.
Итоговый артефакт: обзор текущего CI/CD процесса и первый рекомендуемый шаг.
Definition of Done: обязательный CI проходит на PR/push и только после этого добавляется реальный deploy.
