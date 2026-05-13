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
optional-claude-pr-review.yml — опциональное Claude-review при наличии ANTHROPIC_API_KEY.
claude-review.yml — сейчас выглядит как проблемный/устаревший workflow.
Что я советую в первую очередь: привести обязательный CI в зелёное состояние. Последний CI сейчас падает ещё на этапе Setup Node.js: GitHub Actions пытается использовать глобальный Yarn 1.22.22, хотя проект требует yarn@4.5.0 через Corepack. То есть проверки lint/typecheck/test/build фактически даже не стартуют.

Приоритетный порядок:

Исправить Corepack/Yarn setup в .github/workflows/ci.yml и scheduled-ci.yml.
После этого добиться прохождения:
yarn turbo run lint typecheck test build --continue
Удалить или починить проблемный .github/workflows/claude-review.yml.
Затем уже настраивать настоящий CD вместо deploy-stub.yml.
Итоговый артефакт: обзор текущего CI/CD процесса и первый рекомендуемый шаг.
Definition of Done: обязательный CI проходит на PR/push и только после этого добавляется реальный deploy.
